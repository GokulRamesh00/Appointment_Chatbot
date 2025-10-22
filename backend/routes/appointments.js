const express = require('express');
const { validateAppointment } = require('../middleware/validation');
const { query } = require('../config/database');

const router = express.Router();

// Get all appointments for the authenticated user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, limit = 50, offset = 0 } = req.query;

    let queryText = `
      SELECT id, title, description, appointment_date, duration_minutes, 
             status, appointment_type, location, notes, created_at, updated_at
      FROM appointments 
      WHERE user_id = $1
    `;
    const queryParams = [userId];

    if (status) {
      queryText += ' AND status = $2';
      queryParams.push(status);
    }

    queryText += ' ORDER BY appointment_date DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, queryParams);

    res.json({
      appointments: result.rows.map(appointment => ({
        id: appointment.id,
        title: appointment.title,
        description: appointment.description,
        appointmentDate: appointment.appointment_date,
        durationMinutes: appointment.duration_minutes,
        status: appointment.status,
        appointmentType: appointment.appointment_type,
        location: appointment.location,
        notes: appointment.notes,
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get specific appointment
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await query(
      `SELECT id, title, description, appointment_date, duration_minutes, 
              status, appointment_type, location, notes, created_at, updated_at
       FROM appointments 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = result.rows[0];
    res.json({
      appointment: {
        id: appointment.id,
        title: appointment.title,
        description: appointment.description,
        appointmentDate: appointment.appointment_date,
        durationMinutes: appointment.duration_minutes,
        status: appointment.status,
        appointmentType: appointment.appointment_type,
        location: appointment.location,
        notes: appointment.notes,
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new appointment
router.post('/', validateAppointment, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      description,
      appointmentDate,
      durationMinutes = 60,
      appointmentType = 'general',
      location,
      notes
    } = req.body;

    const result = await query(
      `INSERT INTO appointments 
       (user_id, title, description, appointment_date, duration_minutes, 
        appointment_type, location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, description, appointment_date, duration_minutes, 
                 status, appointment_type, location, notes, created_at`,
      [userId, title, description, appointmentDate, durationMinutes, 
       appointmentType, location, notes]
    );

    const appointment = result.rows[0];
    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: {
        id: appointment.id,
        title: appointment.title,
        description: appointment.description,
        appointmentDate: appointment.appointment_date,
        durationMinutes: appointment.duration_minutes,
        status: appointment.status,
        appointmentType: appointment.appointment_type,
        location: appointment.location,
        notes: appointment.notes,
        createdAt: appointment.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update appointment
router.put('/:id', validateAppointment, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
      title,
      description,
      appointmentDate,
      durationMinutes,
      appointmentType,
      location,
      notes,
      status
    } = req.body;

    // Check if appointment exists and belongs to user
    const existingAppointment = await query(
      'SELECT id FROM appointments WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingAppointment.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const result = await query(
      `UPDATE appointments 
       SET title = $1, description = $2, appointment_date = $3, 
           duration_minutes = $4, appointment_type = $5, location = $6, 
           notes = $7, status = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING id, title, description, appointment_date, duration_minutes, 
                 status, appointment_type, location, notes, created_at, updated_at`,
      [title, description, appointmentDate, durationMinutes, 
       appointmentType, location, notes, status, id, userId]
    );

    const appointment = result.rows[0];
    res.json({
      message: 'Appointment updated successfully',
      appointment: {
        id: appointment.id,
        title: appointment.title,
        description: appointment.description,
        appointmentDate: appointment.appointment_date,
        durationMinutes: appointment.duration_minutes,
        status: appointment.status,
        appointmentType: appointment.appointment_type,
        location: appointment.location,
        notes: appointment.notes,
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete appointment
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await query(
      'DELETE FROM appointments WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get appointment statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
         COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM appointments 
       WHERE user_id = $1`,
      [userId]
    );

    const stats = result.rows[0];
    res.json({
      summary: {
        total: parseInt(stats.total),
        confirmed: parseInt(stats.confirmed),
        pending: parseInt(stats.pending),
        cancelled: parseInt(stats.cancelled),
        completed: parseInt(stats.completed)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
