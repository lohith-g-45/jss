const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all patients (with search)
router.get('/', async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM patients';
    let params = [];

    if (search) {
      query += ' WHERE patient_name LIKE ? OR phone LIKE ? OR email LIKE ?';
      const searchTerm = `%${search}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [patients] = await db.query(query, params);

    res.json({
      success: true,
      count: patients.length,
      patients
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Error fetching patients' });
  }
});

// Resolve existing patient by ID or exact phone/email (optionally with name match)
router.get('/resolve', async (req, res) => {
  try {
    const { patient_id, phone, email, name } = req.query;

    if (patient_id) {
      const [byId] = await db.query(
        'SELECT * FROM patients WHERE id = ? LIMIT 1',
        [parseInt(patient_id)]
      );
      return res.json({ success: true, patient: byId[0] || null, matchedBy: byId[0] ? 'id' : null });
    }

    const normalizedPhone = String(phone || '').replace(/\D/g, '');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim().toLowerCase();

    if (!normalizedPhone && !normalizedEmail) {
      return res.json({ success: true, patient: null, matchedBy: null });
    }

    const where = [];
    const params = [];

    if (normalizedPhone) {
      where.push('REPLACE(REPLACE(REPLACE(REPLACE(phone, " ", ""), "-", ""), "(", ""), ")", "") = ?');
      params.push(normalizedPhone);
    }

    if (normalizedEmail) {
      where.push('LOWER(email) = ?');
      params.push(normalizedEmail);
    }

    const [rows] = await db.query(
      `SELECT * FROM patients WHERE ${where.join(' OR ')} ORDER BY id DESC LIMIT 20`,
      params
    );

    if (!rows.length) {
      return res.json({ success: true, patient: null, matchedBy: null });
    }

    let selected = rows[0];
    if (normalizedName) {
      const exactName = rows.find((r) => String(r.patient_name || '').trim().toLowerCase() === normalizedName);
      if (exactName) selected = exactName;
    }

    let matchedBy = 'contact';
    if (normalizedPhone && String(selected.phone || '').replace(/\D/g, '') === normalizedPhone) matchedBy = 'phone';
    if (normalizedEmail && String(selected.email || '').trim().toLowerCase() === normalizedEmail) matchedBy = matchedBy === 'phone' ? 'phone+email' : 'email';

    res.json({ success: true, patient: selected, matchedBy });
  } catch (error) {
    console.error('Resolve patient error:', error);
    res.status(500).json({ error: 'Error resolving patient' });
  }
});

// Get patient by ID with consultation history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get patient info
    const [patients] = await db.query(
      'SELECT * FROM patients WHERE id = ?',
      [id]
    );

    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Get consultation history
    const [consultations] = await db.query(
      `SELECT c.*, u.name as doctor_name, u.specialization 
       FROM consultations c
       LEFT JOIN users u ON c.doctor_id = u.id
       WHERE c.patient_id = ?
       ORDER BY c.visit_date DESC`,
      [id]
    );

    res.json({
      success: true,
      patient: patients[0],
      consultations
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Error fetching patient details' });
  }
});

// Search patients by name or phone
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;

    const [patients] = await db.query(
      `SELECT id, patient_name, age, gender, phone, email 
       FROM patients 
       WHERE patient_name LIKE ? OR phone LIKE ?
       ORDER BY patient_name ASC
       LIMIT 20`,
      [searchTerm, searchTerm]
    );

    res.json({
      success: true,
      count: patients.length,
      patients
    });
  } catch (error) {
    console.error('Search patients error:', error);
    res.status(500).json({ error: 'Error searching patients' });
  }
});

// Create new patient
router.post('/', async (req, res) => {
  try {
    const {
      patient_name,
      age,
      gender,
      phone,
      email,
      address,
      medical_history,
      allergies,
      blood_group
    } = req.body;

    if (!patient_name || !age || !gender) {
      return res.status(400).json({ error: 'Please provide required fields: patient_name, age, gender' });
    }

    const [result] = await db.query(
      `INSERT INTO patients 
       (patient_name, age, gender, phone, email, address, medical_history, allergies, blood_group)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_name, age, gender, phone, email, address, medical_history, allergies, blood_group]
    );

    res.status(201).json({
      success: true,
      patient_id: result.insertId,
      message: 'Patient created successfully'
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Error creating patient' });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if patient exists
    const [existing] = await db.query('SELECT id FROM patients WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Build update query dynamically
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    values.push(id);

    await db.query(
      `UPDATE patients SET ${setClause} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Patient updated successfully'
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Error updating patient' });
  }
});

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM patients WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ error: 'Error deleting patient' });
  }
});

module.exports = router;
