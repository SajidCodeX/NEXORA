const express = require('express');
const router = express.Router();
const Files = require('../db/models/Files'); // Model for uploaded files
const path = require('path');
const fs = require('fs');
const User = require("../db/models/user"); // User model
const bcrypt = require("bcrypt");
const college = require('../db/models/selectCollege'); // Model for colleges/institutes


// Admin Dashboard

router.get('/dashboard', async (req, res) => {
  try {
    // Count success and failed file parses
    const successfulParses = await Files.countDocuments({ status: 'success' });
    const failedParses = await Files.countDocuments({ status: 'failed' });

    // Count users and institutes
    const totalUsers = await User.countDocuments({});
    const totalInstitutes = await college.countDocuments({});

    // Total uploads = success + failed
    const totalUploads = successfulParses + failedParses;

    // Render dashboard view with metrics
    res.render('pages/admin/dashboard', {
      totalUploads,
      successfulParses,
      failedParses,
      totalUsers,
      totalInstitutes
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).send("An error occurred while loading the dashboard.");
  }
});

// API: Dashboard Data for Charts/Graphs (JSON)
router.get('/dashboard-data', async (req, res) => {
  try {
    const total = await Files.countDocuments({});
    const parsed = await Files.countDocuments({ status: 'parsed' }); // parsed ≠ success? Verify
    const failed = await Files.countDocuments({ status: 'failed' });

    // Group by university field
    const universityWiseStats = await Files.aggregate([
      { $group: { _id: "$university", count: { $sum: 1 } } }
    ]);

    res.json({
      totalUploads: total,
      successfulParses: parsed,
      failedParses: failed
      // Optional: include universityWiseStats if needed
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// Manage Uploaded Results Page

router.get('/manage-results', async (req, res) => {
  try {
    // Fetch all uploaded files sorted by newest
    const files = await Files.find().sort({ uploadedAt: -1 });
    res.render('pages/admin/manageResults', { files });
  } catch (err) {
    res.status(500).send("Error loading files.");
  }
});

// Download uploaded file by ID
router.get('/download/:id', async (req, res) => {
  try {
    const file = await Files.findById(req.params.id).populate('userId');
    if (!file) return res.status(404).send("File not found");

    const filePath = path.join(__dirname, '..', file.filePath);

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found on disk");
    }

    // Send file as download
    res.download(filePath);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).send("Server error");
  }
});


// Manage Users: Block / Unblock


// Toggle user block status
router.get('/block-user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User not found");

    // Toggle between 'active' and 'blocked'
    user.status = (user.status === 'blocked') ? 'active' : 'blocked';
    await user.save();

    res.redirect('/admin/manage-users');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error blocking/unblocking user.");
  }
});

// Explicitly unblock user
router.get('/unblock-user/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { status: 'active' });
    res.redirect('/admin/manage-users');
  } catch (err) {
    console.error('Error unblocking user:', err);
    res.status(500).send('Error unblocking user');
  }
});


// Reset Password


// Show reset password form
router.get('/reset-password/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User not found");

    res.render('pages/admin/resetPassword', { user, errorMessage: null });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Handle password reset submission
router.post('/reset-password/:userId', async (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  // Validation
  if (!newPassword || !confirmPassword) {
    return res.status(400).send('Missing required fields');
  }

  if (newPassword !== confirmPassword) {
    const user = await User.findById(req.params.userId);
    return res.render('admin/resetPassword', {
      user,
      errorMessage: 'Passwords do not match!'
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.params.userId, { password: hashedPassword });
    res.redirect('/admin/manage-users');
  } catch (err) {
    console.error(err);
    const user = await User.findById(req.params.userId);
    res.render('admin/resetPassword', {
      user,
      errorMessage: 'Failed to update password!'
    });
  }
});


// Delete Uploaded File

router.post('/delete/:id', async (req, res) => {
  try {
    await Files.findByIdAndDelete(req.params.id);
    res.redirect('/admin/manage-results');
  } catch (err) {
    res.status(500).send("Failed to delete file.");
  }
});

module.exports = router;
