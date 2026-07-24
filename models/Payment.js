const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: Number,
  status: String,
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
