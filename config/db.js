const mongoose = require('mongoose');

const connectDB = async (uri) => {
  try {
    mongoose.connection.on('connected', () => {
      console.log(`MongoDB connected: ${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    await mongoose.connect(uri);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
