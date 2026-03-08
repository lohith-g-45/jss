const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT id, name, email, role, specialization, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, specialization } = req.body;

    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query(
      'UPDATE users SET name = ?, email = ?, specialization = ? WHERE id = ?',
      [name || null, email || null, specialization || null, id]
    );

    const [updated] = await db.query(
      'SELECT id, name, email, role, specialization, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    res.json({ success: true, user: updated[0], message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// Update user settings/preferences
router.put('/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const settings = req.body || {};

    await db.query(
      `CREATE TABLE IF NOT EXISTS user_settings (
        user_id INT PRIMARY KEY,
        settings_json JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    await db.query(
      `INSERT INTO user_settings (user_id, settings_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)`,
      [id, JSON.stringify(settings)]
    );

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Error updating settings' });
  }
});

module.exports = router;