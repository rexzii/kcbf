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
        `INSERT INTO meeting_requests (requester_id, recipient_id, preferred_date, remarks, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [requesterId, recipientId, preferredDate, remarks || null]
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
        mr.id,
        mr.requester_id AS requesterId,
        mr.recipient_id AS recipientId,
        recipient.name AS recipientName,
        requester.name AS requesterName,
        requester.email AS requesterEmail,
        mr.preferred_date AS preferredDate,
        mr.remarks,
        mr.created_at AS createdAt,
        mr.status
       FROM meeting_requests mr
       INNER JOIN users requester ON requester.id = mr.requester_id
       INNER JOIN users recipient ON recipient.id = mr.recipient_id
       WHERE mr.recipient_id = ?
       ORDER BY mr.created_at DESC`,
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
