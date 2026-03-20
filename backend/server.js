// ========================================
// KCBF Member Access - Backend Server
// Simple authentication system
// ========================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const bcryptjs = require('bcryptjs');

const app = express();

// ========================================
// DATABASE CONFIGURATION
// ========================================
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'kcbf_db',
  port: 3306,
  dateStrings: true
};

const pool = mysql.createPool(DB_CONFIG);

function releaseConnection(connection) {
  if (connection) {
    connection.release();
  }
}

async function ensureEkdaColumn() {
  const connection = await pool.getConnection();
  try {
    const [columns] = await connection.execute("SHOW COLUMNS FROM users LIKE 'ekda_type'");
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE users ADD COLUMN ekda_type VARCHAR(50) NULL AFTER state');
      console.log('✅ Added missing users.ekda_type column');
    }
  } finally {
    connection.release();
  }
}

async function ensureRecommendationRequestsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS recommendation_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        recipient_id INT NOT NULL,
        remarks LONGTEXT NOT NULL,
        status ENUM('pending', 'sent') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_requester_id (requester_id),
        INDEX idx_recipient_id (recipient_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
  } finally {
    connection.release();
  }
}

async function ensureRecommendationResponseColumns() {
  const connection = await pool.getConnection();
  try {
    const [contactColumns] = await connection.execute("SHOW COLUMNS FROM recommendation_requests LIKE 'contact_info'");
    if (contactColumns.length === 0) {
      await connection.execute('ALTER TABLE recommendation_requests ADD COLUMN contact_info VARCHAR(255) NULL AFTER remarks');
    }

    const [referralColumns] = await connection.execute("SHOW COLUMNS FROM recommendation_requests LIKE 'referral_details'");
    if (referralColumns.length === 0) {
      await connection.execute('ALTER TABLE recommendation_requests ADD COLUMN referral_details LONGTEXT NULL AFTER contact_info');
    }

    const [respondedAtColumns] = await connection.execute("SHOW COLUMNS FROM recommendation_requests LIKE 'responded_at'");
    if (respondedAtColumns.length === 0) {
      await connection.execute('ALTER TABLE recommendation_requests ADD COLUMN responded_at TIMESTAMP NULL AFTER updated_at');
    }
  } finally {
    connection.release();
  }
}

async function ensureReferralsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS referrals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        recipient_id INT NOT NULL,
        referrer_name VARCHAR(255) NOT NULL,
        referrer_contact VARCHAR(255) NOT NULL,
        referral_type ENUM('inside', 'outside') DEFAULT 'inside',
        remarks LONGTEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_sender_id (sender_id),
        INDEX idx_recipient_id (recipient_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );
  } finally {
    connection.release();
  }
}

async function ensureDoneBusinessTable() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS done_business (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_name VARCHAR(255) NOT NULL,
        amount_closed DECIMAL(15,2) NOT NULL,
        remarks LONGTEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_member_name (member_name),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    const [amountColumn] = await connection.execute("SHOW COLUMNS FROM done_business LIKE 'amount_closed'");
    const amountColumnType = amountColumn[0]?.Type ? String(amountColumn[0].Type).toLowerCase() : '';

    if (amountColumnType !== 'decimal(15,2)') {
      await connection.execute('ALTER TABLE done_business MODIFY COLUMN amount_closed DECIMAL(15,2) NOT NULL');
    }
  } finally {
    connection.release();
  }
}

// ========================================
// MIDDLEWARE
// ========================================
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Routes

// Dashboard summary endpoint
app.get('/api/dashboard', async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    const [doneBusiness] = await connection.execute(
      `SELECT
        id,
        member_name   AS memberName,
        amount_closed AS amountClosed,
        remarks,
        status,
        created_at    AS createdAt
       FROM done_business
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      doneBusiness: doneBusiness.map((row) => ({
        id: String(row.id),
        memberName: row.memberName,
        amountClosed: Number(row.amountClosed),
        remarks: row.remarks || '',
        createdAt: row.createdAt,
        status: row.status
      }))
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard data' });
  } finally {
    releaseConnection(connection);
  }
});
// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const {
    name,
    state,
    email,
    whatsappNumber,
    dateOfBirth,
    companyName,
    industry,
    briefProfile,
    workingSince,
    areasOfInterest,
    linkedinProfile,
    website,
    password,
    confirmPassword
  } = req.body;

  try {
    console.log('📝 Register Request Body:', JSON.stringify(req.body, null, 2));
    
    // Simple validation - only check essential fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }




    const connection = await pool.getConnection();

    // Check if email already exists
    const [existingUser] = await connection.execute(
      'SELECT email FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      await connection.release();
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Insert user
    const [result] = await connection.execute(
      `INSERT INTO users (name, state, email, whatsapp_number, date_of_birth, company_name, industry, brief_profile, working_since, areas_of_interest, linkedin_profile, website, password, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name,
        state,
        email,
        whatsappNumber,
        dateOfBirth,
        companyName,
        industry,
        briefProfile,
        workingSince,
        areasOfInterest,
        linkedinProfile || null,
        website || null,
        hashedPassword
      ]
    );

    await connection.release();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: result.insertId,
        name: name,
        email: email,
        state: state,
        companyName: companyName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const connection = await pool.getConnection();

    // Find user
    const [users] = await connection.execute(
      'SELECT id, name, state, email, company_name, password FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      await connection.release();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      await connection.release();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    await connection.release();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        state: user.state,
        companyName: user.company_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get user endpoint
app.get('/api/auth/user/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [users] = await connection.execute(
      'SELECT id, name, state, ekda_type, email, whatsapp_number, date_of_birth, company_name, industry, brief_profile, working_since, areas_of_interest, linkedin_profile, website, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    await connection.release();

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
});

// Update user endpoint
app.put('/api/auth/user/:id', async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  const {
    name,
    email,
    ekda,
    whatsappNumber,
    dateOfBirth,
    companyName,
    industry,
    businessProfile,
    workingSince,
    areasOfInterest,
    linkedinProfile,
    website
  } = req.body;

  try {
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    const connection = await pool.getConnection();

    const normalize = (value) => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value === 'string' && value.trim() === '') {
        return null;
      }
      return value;
    };

    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (existing.length === 0) {
      await connection.release();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [emailOwner] = await connection.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (emailOwner.length > 0) {
      await connection.release();
      return res.status(409).json({
        success: false,
        message: 'Email is already used by another account'
      });
    }

    await connection.execute(
      `UPDATE users
          SET name = ?,
              email = ?,
              ekda_type = ?,
              whatsapp_number = COALESCE(?, whatsapp_number),
              date_of_birth = COALESCE(?, date_of_birth),
              company_name = COALESCE(?, company_name),
              industry = COALESCE(?, industry),
              brief_profile = COALESCE(?, brief_profile),
              working_since = COALESCE(?, working_since),
              areas_of_interest = COALESCE(?, areas_of_interest),
              linkedin_profile = ?,
              website = ?,
              updated_at = NOW()
        WHERE id = ?`,
      [
        name,
        email,
        normalize(ekda),
        normalize(whatsappNumber),
        normalize(dateOfBirth),
        normalize(companyName),
        normalize(industry),
        normalize(businessProfile),
        normalize(workingSince),
        normalize(areasOfInterest),
        normalize(linkedinProfile),
        normalize(website),
        userId
      ]
    );

    const [users] = await connection.execute(
      'SELECT id, name, state, ekda_type, email, whatsapp_number, date_of_birth, company_name, industry, brief_profile, working_since, areas_of_interest, linkedin_profile, website, created_at FROM users WHERE id = ?',
      [userId]
    );

    await connection.release();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// Get profile for dashboard
app.get('/api/profile/:id', async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    const connection = await pool.getConnection();

    const [users] = await connection.execute(
      `SELECT id, name, email, ekda_type, whatsapp_number, date_of_birth, company_name, industry,
              brief_profile, working_since, areas_of_interest, linkedin_profile, website
         FROM users
        WHERE id = ?`,
      [userId]
    );

    await connection.release();

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

// Update profile for dashboard
app.put('/api/profile/:id', async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  const {
    name,
    email,
    ekda,
    whatsappNumber,
    dateOfBirth,
    companyName,
    industry,
    businessProfile,
    workingSince,
    areasOfInterest,
    linkedinProfile,
    website
  } = req.body;

  try {
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    const connection = await pool.getConnection();
    const normalize = (value) => {
      if (value === undefined || value === null) {
        return null;
      }
      if (typeof value === 'string' && value.trim() === '') {
        return null;
      }
      return value;
    };

    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (existing.length === 0) {
      await connection.release();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [emailOwner] = await connection.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (emailOwner.length > 0) {
      await connection.release();
      return res.status(409).json({
        success: false,
        message: 'Email is already used by another account'
      });
    }

    await connection.execute(
      `UPDATE users
          SET name = ?,
              email = ?,
              ekda_type = ?,
              whatsapp_number = COALESCE(?, whatsapp_number),
              date_of_birth = COALESCE(?, date_of_birth),
              company_name = COALESCE(?, company_name),
              industry = COALESCE(?, industry),
              brief_profile = COALESCE(?, brief_profile),
              working_since = COALESCE(?, working_since),
              areas_of_interest = COALESCE(?, areas_of_interest),
              linkedin_profile = ?,
              website = ?,
              updated_at = NOW()
        WHERE id = ?`,
      [
        name,
        email,
        normalize(ekda),
        normalize(whatsappNumber),
        normalize(dateOfBirth),
        normalize(companyName),
        normalize(industry),
        normalize(businessProfile),
        normalize(workingSince),
        normalize(areasOfInterest),
        normalize(linkedinProfile),
        normalize(website),
        userId
      ]
    );

    const [users] = await connection.execute(
      `SELECT id, name, email, ekda_type, whatsapp_number, date_of_birth, company_name, industry,
              brief_profile, working_since, areas_of_interest, linkedin_profile, website
         FROM users
        WHERE id = ?`,
      [userId]
    );

    await connection.release();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// Get all registered users (optionally excluding the logged-in user)
app.get('/api/auth/users', async (req, res) => {
  try {
    const excludeUserId = Number.parseInt(req.query.excludeUserId, 10);
    const connection = await pool.getConnection();

    let query = 'SELECT id, name, email FROM users';
    const params = [];

    if (Number.isInteger(excludeUserId) && excludeUserId > 0) {
      query += ' WHERE id != ?';
      params.push(excludeUserId);
    }

    query += ' ORDER BY name ASC';

    const [users] = await connection.execute(query, params);
    await connection.release();

    res.status(200).json(users);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// Create recommendation request for a selected recipient
app.post('/api/recommendations', async (req, res) => {
  const { requesterId, recipientId, remarks } = req.body;

  if (!Number.isInteger(requesterId) || requesterId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid requesterId is required' });
  }

  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid recipientId is required' });
  }

  if (requesterId === recipientId) {
    return res.status(400).json({ success: false, message: 'Requester and recipient cannot be same user' });
  }

  if (typeof remarks !== 'string' || !remarks.trim()) {
    return res.status(400).json({ success: false, message: 'Remarks are required' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    const [users] = await connection.execute(
      'SELECT id, name, email FROM users WHERE id IN (?, ?)',
      [requesterId, recipientId]
    );

    if (users.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid requester or recipient' });
    }

    const requester = users.find((user) => user.id === requesterId);

    const [result] = await connection.execute(
      `INSERT INTO recommendation_requests (requester_id, recipient_id, remarks, status, created_at)
       VALUES (?, ?, ?, 'pending', NOW())`,
      [requesterId, recipientId, remarks.trim()]
    );

    res.status(201).json({
      id: String(result.insertId),
      recommendedMemberName: requester ? requester.name : '',
      recommendedMemberEmail: requester ? requester.email : '',
      remarks: remarks.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
  } catch (error) {
    console.error('Recommendation creation error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating recommendation request' });
  } finally {
    releaseConnection(connection);
  }
});

// Get recommendation requests received by a specific user
app.get('/api/recommendations', async (req, res) => {
  const userId = Number.parseInt(req.query.userId, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid userId is required' });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT
        rr.id,
        rr.remarks,
        rr.contact_info AS contactInfo,
        rr.referral_details AS referralDetails,
        rr.responded_at AS respondedAt,
        rr.status,
        rr.created_at AS createdAt,
        requester.name AS requesterName,
        requester.email AS requesterEmail
       FROM recommendation_requests rr
       INNER JOIN users requester ON requester.id = rr.requester_id
       WHERE rr.recipient_id = ?
       ORDER BY rr.created_at DESC`,
      [userId]
    );

    const payload = rows.map((row) => ({
      id: String(row.id),
      recommendedMemberName: row.requesterName,
      recommendedMemberEmail: row.requesterEmail,
      remarks: row.remarks,
      contactInfo: row.contactInfo,
      referralDetails: row.referralDetails,
      respondedAt: row.respondedAt,
      createdAt: row.createdAt,
      status: row.status
    }));

    res.status(200).json(payload);
  } catch (error) {
    console.error('Recommendations fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching recommendations' });
  } finally {
    releaseConnection(connection);
  }
});

// Respond to a recommendation request as recipient
app.put('/api/recommendations/:id/respond', async (req, res) => {
  const recommendationId = Number.parseInt(req.params.id, 10);
  const { recipientUserId, contactInfo, referralDetails } = req.body;

  if (!Number.isInteger(recommendationId) || recommendationId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid recommendation id is required' });
  }

  if (!Number.isInteger(recipientUserId) || recipientUserId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid recipientUserId is required' });
  }

  if (typeof contactInfo !== 'string' || !contactInfo.trim()) {
    return res.status(400).json({ success: false, message: 'Contact info is required' });
  }

  if (typeof referralDetails !== 'string' || !referralDetails.trim()) {
    return res.status(400).json({ success: false, message: 'Referral details are required' });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    const [recipientRows] = await connection.execute(
      'SELECT id, name FROM users WHERE id = ?',
      [recipientUserId]
    );

    if (recipientRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipient user not found' });
    }

    const [rows] = await connection.execute(
      'SELECT id, requester_id AS requesterId FROM recommendation_requests WHERE id = ? AND recipient_id = ?',
      [recommendationId, recipientUserId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Recommendation request not found for this user' });
    }

    const recommendation = rows[0];

    await connection.execute(
      `UPDATE recommendation_requests
          SET contact_info = ?,
              referral_details = ?,
              status = 'sent',
              responded_at = NOW(),
              updated_at = NOW()
        WHERE id = ? AND recipient_id = ?`,
      [contactInfo.trim(), referralDetails.trim(), recommendationId, recipientUserId]
    );

   await connection.execute(
  `INSERT INTO referrals (user_id, referrer_name, referrer_contact, referral_type, remarks, status, created_at)
   VALUES (?, ?, ?, 'inside', ?, 'pending', NOW())`,
  [
    recommendation.requesterId,  // user_id = who receives this referral
    recipientRows[0].name,        // referrer_name = who is giving it
    contactInfo.trim(),           // referrer_contact
    referralDetails.trim()        // remarks
  ]
);

    res.status(200).json({ success: true, message: 'Recommendation response submitted successfully' });
  } catch (error) {
    console.error('Recommendation response error:', error);
    res.status(500).json({ success: false, message: 'Server error while responding to recommendation' });
  } finally {
    releaseConnection(connection);
  }
});

// Create referral for a selected recipient
app.post('/api/referrals', async (req, res) => {
  const {
    senderId,
    recipientId,
    referrerName,
    referrerContact,
    referralType,
    remarks
  } = req.body;

  if (!Number.isInteger(senderId) || senderId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid senderId is required' });
  }

  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid recipientId is required' });
  }

  if (senderId === recipientId) {
    return res.status(400).json({ success: false, message: 'Sender and recipient cannot be the same user' });
  }

  if (typeof referrerName !== 'string' || !referrerName.trim()) {
    return res.status(400).json({ success: false, message: 'Referral name is required' });
  }

  if (typeof referrerContact !== 'string' || !referrerContact.trim()) {
    return res.status(400).json({ success: false, message: 'Referral contact is required' });
  }

  const safeType = referralType === 'outside' ? 'outside' : 'inside';

  let connection;

  try {
    connection = await pool.getConnection();

    const [users] = await connection.execute(
      'SELECT id FROM users WHERE id IN (?, ?)',
      [senderId, recipientId]
    );

    if (users.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid sender or recipient' });
    }

    const [result] = await connection.execute(
  `INSERT INTO referrals (user_id, referrer_name, referrer_contact, referral_type, remarks, status, created_at)
   VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
  [
    recipientId,             
    referrerName.trim(),
    referrerContact.trim(),
    safeType,
    typeof remarks === 'string' ? remarks.trim() : null
  ]
);

    res.status(201).json({
      id: String(result.insertId),
      referrerName: referrerName.trim(),
      referrerContact: referrerContact.trim(),
      referralType: safeType,
      remarks: typeof remarks === 'string' ? remarks.trim() : '',
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
  } catch (error) {
    console.error('Referral creation error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating referral' });
  } finally {
    releaseConnection(connection);
  }
});

// Get referrals received by a specific user
app.get('/api/referrals', async (req, res) => {
  const userId = Number.parseInt(req.query.userId, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid userId is required' });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT
        id,
        referrer_name AS referrerName,
        referrer_contact AS referrerContact,
        referral_type AS referralType,
        remarks,
        created_at AS createdAt,
        status
       FROM referrals
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    const payload = rows.map((row) => ({
      id: String(row.id),
      referrerName: row.referrerName,
      referrerContact: row.referrerContact,
      referralType: row.referralType,
      remarks: row.remarks || '',
      createdAt: row.createdAt,
      status: row.status
    }));

    res.status(200).json(payload);
  } catch (error) {
    console.error('Referrals fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching referrals' });
  } finally {
    releaseConnection(connection);
  }
});

// Create done business record
app.post('/api/done-business', async (req, res) => {
 const { userId, memberName, amountClosed, remarks, remark } = req.body;
const parsedAmount = Number.parseFloat(amountClosed);
const safeRemarks = typeof remarks === 'string'
  ? remarks.trim()
  : (typeof remark === 'string' ? remark.trim() : '');

if (!Number.isInteger(userId) || userId <= 0) {
  return res.status(400).json({ success: false, message: 'Valid userId is required' });
}

if (typeof memberName !== 'string' || !memberName.trim()) {
  return res.status(400).json({ success: false, message: 'Member name is required' });
}

if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
  return res.status(400).json({ success: false, message: 'Amount closed must be greater than 0' });
}

  let connection;

  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute(
  `INSERT INTO done_business (user_id, member_name, amount_closed, remarks, status, created_at)
   VALUES (?, ?, ?, ?, 'pending', NOW())`,  
  [userId, memberName.trim(), parsedAmount, safeRemarks || null]
);

    res.status(201).json({
      id: String(result.insertId),
      memberName: memberName.trim(),
      amountClosed: parsedAmount,
      remarks: safeRemarks,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
  } catch (error) {
    console.error('Done business creation error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating done business' });
  } finally {
    releaseConnection(connection);
  }
});

// Get done business records
app.get('/api/done-business', async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT
        id,
        member_name AS memberName,
        amount_closed AS amountClosed,
        remarks,
        status,
        created_at AS createdAt
       FROM done_business
       ORDER BY created_at DESC`
    );

    const payload = rows.map((row) => ({
      id: String(row.id),
      memberName: row.memberName,
      amountClosed: Number(row.amountClosed),
      remarks: row.remarks || '',
      createdAt: row.createdAt,
      status: row.status
    }));

    res.status(200).json(payload);
  } catch (error) {
    console.error('Done business fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching done business' });
  } finally {
    releaseConnection(connection);
  }
});

// Create meeting requests for one or more recipients
app.post('/api/meeting-requests', async (req, res) => {
  const {
    requesterId,
    requesterName,
    requesterEmail,
    recipientIds,
    preferredDate,
    remarks
  } = req.body;

  if (!Number.isInteger(requesterId) || requesterId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid requesterId is required' });
  }

  if (!requesterName || !requesterEmail) {
    return res.status(400).json({ success: false, message: 'Requester details are required' });
  }

  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one recipient is required' });
  }

  if (!preferredDate) {
    return res.status(400).json({ success: false, message: 'Preferred date is required' });
  }

  const uniqueRecipientIds = [...new Set(recipientIds
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => Number.isInteger(id) && id > 0 && id !== requesterId))];

  if (uniqueRecipientIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Please select valid recipients' });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const placeholders = uniqueRecipientIds.map(() => '?').join(', ');
    const [validUsers] = await connection.execute(
      `SELECT id FROM users WHERE id IN (${placeholders})`,
      uniqueRecipientIds
    );

    if (validUsers.length !== uniqueRecipientIds.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'One or more selected members are invalid' });
    }

   for (const recipientId of uniqueRecipientIds) {
  await connection.execute(
    `INSERT INTO meeting_requests (requester_id, requester_name, requester_email, preferred_date, remarks, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
    [requesterId, requesterName, requesterEmail, preferredDate, remarks || null]
  );
}


    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Meeting request sent to ${uniqueRecipientIds.length} member(s).`,
      created: uniqueRecipientIds.length
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Meeting request creation error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating meeting request' });
  } finally {
    releaseConnection(connection);
  }
});

// Get meeting requests for a specific recipient user
app.get('/api/meeting-requests', async (req, res) => {
  const userId = Number.parseInt(req.query.userId, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid userId is required' });
  }

  let connection;

  try {
    connection = await pool.getConnection();
   const [requests] = await connection.execute(
  `SELECT
    id,
    requester_id    AS requesterId,
    requester_name  AS requesterName,
    requester_email AS requesterEmail,
    preferred_date  AS preferredDate,
    remarks,
    created_at      AS createdAt,
    status
   FROM meeting_requests
   WHERE requester_id = ?
   ORDER BY created_at DESC`,
  [userId]
);

    res.status(200).json(requests);
  } catch (error) {
    console.error('Meeting requests fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching meeting requests' });
  } finally {
    releaseConnection(connection);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ========================================
// START SERVER
// ========================================
const PORT = 3000;

async function startServer() {
  try {
    await ensureEkdaColumn();
    await ensureRecommendationRequestsTable();
    await ensureRecommendationResponseColumns();
    await ensureReferralsTable();
    await ensureDoneBusinessTable();
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`📁 Database: ${DB_CONFIG.database}`);
    console.log(`🗄️  User: ${DB_CONFIG.user}@${DB_CONFIG.host}`);
  });

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Stop the old server, then run npm start once.`);
      process.exit(1);
    }
    console.error('❌ Server startup error:', error);
    process.exit(1);
  });
}

startServer();
