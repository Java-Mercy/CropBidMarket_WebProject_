const express = require('express');
const bcryptjs = require('bcryptjs');
const User = require('../models/user');
const router = express.Router();

// Middleware to handle profile picture upload
const uploadMiddleware = (req, res, next) => {
  try {
    if (req.app.locals.upload) {
      req.app.locals.upload.single('profilePicture')(req, res, (err) => {
        if (err) {
          console.error('File upload error:', err);
          return res.render('register', {
            error: 'Error uploading profile picture',
            user: req.session.user || null
          });
        }
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    console.error('Upload middleware error:', error);
    next();
  }
};

// GET: Login page
router.get('/login', (req, res) => {
  res.render('login', {
    error: null,
    user: req.session.user || null
  });
});

// POST: Login logic
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('login', {
        error: 'Email and password are required',
        user: req.session.user || null
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', {
        error: 'Invalid credentials',
        user: req.session.user || null
      });
    }

    const isValidPassword = await bcryptjs.compare(password, user.password);
    if (!isValidPassword) {
      return res.render('login', {
        error: 'Invalid credentials',
        user: req.session.user || null
      });
    }

    req.session.user = user;
    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', {
      error: 'Login failed. Please try again.',
      user: req.session.user || null
    });
  }
});

// GET: Register page
router.get('/register', (req, res) => {
  res.render('register', {
    error: null,
    user: req.session.user || null
  });
});

// POST: Register logic
router.post('/register', uploadMiddleware, async (req, res) => {
  try {
    const { name, email, password, roles } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !roles) {
      return res.render('register', {
        error: 'All fields are required',
        user: req.session.user || null
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('register', {
        error: 'Email already exists',
        user: req.session.user || null
      });
    }

    // Process roles
    const rolesArray = typeof roles === 'string' ? roles.split(',').map(r => r.trim()).filter(r => r) : [];
    if (!rolesArray.length) {
      return res.render('register', {
        error: 'At least one role is required',
        user: req.session.user || null
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      roles: rolesArray,
      profilePicture: req.file ? `/uploads/${req.file.filename}` : null
    });

    await user.save();
    req.session.user = user;
    res.redirect('/?notification=Registration successful!');
  } catch (err) {
    console.error('Registration error:', err);
    res.render('register', {
      error: 'Registration failed. Please try again.',
      user: req.session.user || null
    });
  }
});

// GET: Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;