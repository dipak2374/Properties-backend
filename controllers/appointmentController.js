const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');
const { addEntry, listEntries } = require('../utils/inMemoryStore');
const Property = require('../models/Property');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

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
    res.json({ appointments: [...listEntries('appointments'), ...appointments] });
  } catch (error) {
    return res.json({ appointments: listEntries('appointments') });
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

    return res.status(201).json({ appointment: populatedAppointment, message: 'Appointment booked successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unable to book appointment', error: error.message });
  }
};
