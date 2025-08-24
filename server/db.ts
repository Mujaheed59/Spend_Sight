import 'dotenv/config'; // Load .env variables
import mongoose from 'mongoose';

// MongoDB connection with robust error handling
const connectDB = async () => {
  try {
    // Primary connection attempt - use local MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-tracker';
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 5,
    });
    console.log('✅ MongoDB connected successfully to:', mongoURI);
    
    // Listen for connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.log('🔄 Retrying MongoDB connection in 5 seconds...');
    
    setTimeout(connectDB, 5000);
  }
};

// Initialize connection
connectDB();

export { mongoose };
export default mongoose;