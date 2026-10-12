const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in your environment.');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log('MongoDB Connected: ' + conn.connection.host);
  } catch (error) {
    console.error('Error: ' + error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

