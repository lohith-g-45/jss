const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all consultations
router.get('/', async (req, res) => {
  try {
    const { doctor_id, patient_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT c.*, p.patient_name, p.age, p.gender, u.name as doctor_name
      FROM consultations c
      LEFT JOIN patients p ON c.patient_id = p.id
      LEFT JOIN users u ON c.doctor_id = u.id
      WHERE 1=1
    `;
    let params = [];

    if (doctor_id) {
      query += ' AND c.doctor_id = ?';
      params.push(doctor_id);
    }

    if (patient_id) {
      query += ' AND c.patient_id = ?';
      params.push(patient_id);
    }

    query += ' ORDER BY c.visit_date DESC, c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [consultations] = await db.query(query, params);

    res.json({
      success: true,
      count: consultations.length,
      consultations
    });
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ error: 'Error fetching consultations' });
  }
});

// Get consultation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [consultations] = await db.query(
      `SELECT c.*, p.patient_name, p.age, p.gender, p.phone, p.email, 
              u.name as doctor_name, u.specialization
       FROM consultations c
       LEFT JOIN patients p ON c.patient_id = p.id
       LEFT JOIN users u ON c.doctor_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (consultations.length === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Get prescriptions if any
    const [prescriptions] = await db.query(
      'SELECT * FROM prescriptions WHERE consultation_id = ?',
      [id]
    );

    res.json({
      success: true,
      consultation: consultations[0],
      prescriptions
    });
  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({ error: 'Error fetching consultation details' });
  }
});

// Create new consultation
router.post('/', async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      visit_date,
      transcript,
      subjective,
      objective,
      assessment,
      plan,
      diagnosis,
      medications,
      follow_up,
      status = 'completed',
      duration
    } = req.body;

    // Validation
    if (!patient_id || !doctor_id || !visit_date) {
      return res.status(400).json({ 
        error: 'Please provide required fields: patient_id, doctor_id, visit_date' 
      });
    }

    // Verify patient exists
    const [patients] = await db.query('SELECT id FROM patients WHERE id = ?', [patient_id]);
    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Insert consultation
    const [result] = await db.query(
      `INSERT INTO consultations 
       (patient_id, doctor_id, visit_date, transcript, subjective, objective, 
        assessment, plan, diagnosis, medications, follow_up, status, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id, doctor_id, visit_date, transcript, subjective, objective,
        assessment, plan, diagnosis, medications, follow_up, status, duration
      ]
    );

    res.status(201).json({
      success: true,
      consultation_id: result.insertId,
      message: 'Consultation saved successfully'
    });
  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({ error: 'Error saving consultation' });
  }
});

// Update consultation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if consultation exists
    const [existing] = await db.query('SELECT id FROM consultations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Build update query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    values.push(id);

    await db.query(
      `UPDATE consultations SET ${setClause} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Consultation updated successfully'
    });
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ error: 'Error updating consultation' });
  }
});

// Delete consultation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM consultations WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    res.json({
      success: true,
      message: 'Consultation deleted successfully'
    });
  } catch (error) {
    console.error('Delete consultation error:', error);
    res.status(500).json({ error: 'Error deleting consultation' });
  }
});

// Get patient's consultation history
router.get('/patient/:patient_id/history', async (req, res) => {
  try {
    const { patient_id } = req.params;

    const [consultations] = await db.query(
      `SELECT c.id, c.visit_date, c.diagnosis, c.status, c.duration,
              u.name as doctor_name, u.specialization
       FROM consultations c
       LEFT JOIN users u ON c.doctor_id = u.id
       WHERE c.patient_id = ?
       ORDER BY c.visit_date DESC`,
      [patient_id]
    );

    res.json({
      success: true,
      count: consultations.length,
      history: consultations
    });
  } catch (error) {
    console.error('Get patient history error:', error);
    res.status(500).json({ error: 'Error fetching patient history' });
  }
});

module.exports = router;
