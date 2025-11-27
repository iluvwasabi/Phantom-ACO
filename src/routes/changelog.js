const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Public changelog (user-facing features only)
router.get('/', (req, res) => {
  try {
    const changelogPath = path.join(__dirname, '../../CHANGELOG-PUBLIC.md');
    const markdown = fs.readFileSync(changelogPath, 'utf8');
    const html = marked(markdown);

    // Fetch brand name from settings
    const db = require('../config/database');
    const brandNameSetting = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get('brand_name');
    const brandName = brandNameSetting ? brandNameSetting.setting_value : 'Phantom ACO';

    res.render('changelog', {
      user: req.user || null,
      changelogHtml: html,
      brandName: brandName,
      isPublic: true
    });
  } catch (error) {
    console.error('Error loading public changelog:', error);
    res.status(500).send('Error loading changelog');
  }
});

module.exports = router;
