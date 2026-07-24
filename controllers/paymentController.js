const Payment = require('../models/Payment');

exports.listPayments = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 }).lean();
    res.json({ payments });
  } catch (error) {
    if (error.name === 'MongooseError' || error.name === 'MongoServerSelectionError') {
      return res.json({ payments: [] });
    }

    return res.status(500).json({ message: 'Unable to list payments' });
  }
};

exports.createPayment = (req, res) => {
  res.json({ success: true });
};
