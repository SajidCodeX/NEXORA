const express = require("express");
const router = express.Router();
const User = require('../db/models/user');
const bcrypt = require("bcrypt");


// Sign Up Route
router.get("/register", (req, res) => {
    res.render("pages/auth/register", { error: null });
});

// Register Route (POST)
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
  
    try {
      // Step 1: Check if username or email already exists
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.render('pages/auth/register', {
          errorMessage: 'Username or Email already exists!',
        });
      }
  
      // Step 2: Create new user
      const newUser = new User({ username, email, password });
      await newUser.save();
  
      // Step 3: Redirect to login after successful register
      res.redirect('/auth/login');
  
    } catch (error) {
      console.error('Registration error:', error);
      res.render('pages/auth/register', {
        errorMessage: 'Something went wrong. Please try again.',
      });
    }
  });

// Login Route
router.get("/login", (req, res) => {
    res.render("pages/auth/login", { errorMessage: null });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body; // form se email aur password aaya

    if (!email || !password) {
        return res.render('pages/auth/login', { errorMessage: 'Email and password are required!' });
    }

    try {
        const user = await User.findOne({ email: email }); // email se user dhund rahe hai

        if (!user) {
            return res.render('pages/auth/login', { errorMessage: 'Invalid credentials!' });
        }

        const isMatch = await bcrypt.compare(password, user.password); // password compare karo (hash ke sath)

        if (!isMatch) {
            return res.render('pages/auth/login', { errorMessage: 'Invalid credentials!' });
        }

        // Login success
        req.session.user = {
            _id: user._id,
            username: user.username,
            email: user.email,
        };
        req.session.isAuthenticated = true;

        res.redirect('/home');
    } catch (err) {
        console.error('Login error:', err);
        res.render('pages/auth/login', { errorMessage: 'Server error!' });
    }
});

router.get('/profile', (req, res) => {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
  
    res.render('pages/auth/profile', {
      user: req.session.user
    });
  });


// Logout Route
router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Could not log out.");
        }
        res.redirect("/home");
    });
});

module.exports = router;
