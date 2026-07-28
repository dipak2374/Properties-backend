const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');
const { addEntry, listEntries } = require('../utils/inMemoryStore');
const Property = require('../models/Property');

const VALID_APPOINTMENT_STATUSES = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeAppointment = (appointment) => {
  if (!appointment) return appointment;

  const property = appointment.property || {};
  const owner = property.owner || appointment.agent || {};

  return {
    ...appointment,
    property: property && typeof property === 'object'
      ? {
          ...property,
          owner: owner && typeof owner === 'object' ? owner : undefined,
        }
      : property,
    agent: appointment.agent || owner,
  };
};

exports.listAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate({
        path: 'property',
        select: 'title location price owner',
        populate: { path: 'owner', select: 'name phone email' },
      })
      .populate('user', 'name email phone')
      .sort({ date: 1, createdAt: -1 })
      .lean();

    const inMemoryAppointments = (listEntries('appointments') || []).map(normalizeAppointment);
    const storedAppointments = appointments.map(normalizeAppointment);

    return res.json({ appointments: [...inMemoryAppointments, ...storedAppointments] });
  } catch (error) {
    return res.json({ appointments: (listEntries('appointments') || []).map(normalizeAppointment) });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params || {};
    const { status } = req.body || {};

    if (!id) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    const normalizedStatus = String(status || '').trim();
    if (!VALID_APPOINTMENT_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid appointment status' });
    }

    const inMemoryAppointments = listEntries('appointments') || [];
    const inMemoryAppointment = inMemoryAppointments.find((entry) => String(entry._id) === String(id));

    if (inMemoryAppointment) {
      inMemoryAppointment.status = normalizedStatus;
      inMemoryAppointment.updatedAt = new Date().toISOString();
      return res.json({ appointment: normalizeAppointment(inMemoryAppointment), message: 'Appointment status updated successfully' });
    }

    const appointment = await Appointment.findByIdAndUpdate(id, { status: normalizedStatus }, { new: true })
      .populate({
        path: 'property',
        select: 'title location price owner',
        populate: { path: 'owner', select: 'name phone email' },
      })
      .populate('user', 'name email phone')
      .lean();

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    return res.json({ appointment: normalizeAppointment(appointment), message: 'Appointment status updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update appointment status', error: error.message });
  }
};

exports.bookAppointment = async (req, res) => {
  try {
    const { date, property, user, notes } = req.body || {};

    if (!date || !property || !user) {
      return res.status(400).json({ message: 'Appointment date, property ID, and user ID are required' });
    }

    const propertyRecord = isObjectId(property)
      ? await Property.findById(property).populate('owner', 'name phone email').lean()
      : null;

    if (!isObjectId(property) || !isObjectId(user)) {
      const appointment = addEntry('appointments', {
        date: new Date(date).toISOString(),
        property: propertyRecord || property,
        user,
        notes,
        status: 'Pending',
        agent: propertyRecord?.owner
          ? {
            name: propertyRecord.owner.name,
            phone: propertyRecord.owner.phone,
            email: propertyRecord.owner.email,
          }
          : undefined,
      });

      return res.status(201).json({ appointment, message: 'Appointment booked successfully' });
    }

    const appointment = await Appointment.create({
      date: new Date(date),
      property,
      user,
      notes,
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate({
        path: 'property',
        select: 'title location price owner',
        populate: { path: 'owner', select: 'name phone email' },
      })
      .populate('user', 'name email phone')
      .lean();

    return res.status(201).json({ appointment: normalizeAppointment(populatedAppointment), message: 'Appointment booked successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unable to book appointment', error: error.message });
  }
};
