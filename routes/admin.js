const express = require('express');
const router = express.Router();
const File = require('../db/models/Files'); // Make sure Files.js exists

// Dashboard Page
router.get('/dashboard', (req, res) => {
    res.render('pages/admin/dashboard');
});

// Manage Uploaded Results Page
router.get('/manage-results', async (req, res) => {
    try {
        const files = await File.find().sort({ uploadedAt: -1 });
        res.render('pages/admin/manageResults', { files });
    } catch (err) {
        res.status(500).send("Error loading files.");
    }
});

module.exports = router;
