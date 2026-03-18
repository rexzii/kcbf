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
      'SELECT id, name, state, email, whatsapp_number, date_of_birth, company_name, industry, brief_profile, working_since, areas_of_interest, linkedin_profile, website, created_at FROM users WHERE id = ?',
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
