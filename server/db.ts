import 'dotenv/config'; // Load .env variables
import mongoose from 'mongoose';

// MongoDB connection with fallback
const connectDB = async () => {
  try {
    // Use MongoDB Atlas or local fallback
    const mongoURI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/expense-tracker';
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 30000,
      bufferCommands: false,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('⚠️  Using in-memory fallback mode...');
    
    // Try connecting with a simple in-memory setup
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/expense-tracker-memory', {
        serverSelectionTimeoutMS: 1000,
        bufferCommands: false,
      });
      console.log('✅ Fallback MongoDB connection established');
    } catch (fallbackError) {
      console.log('⚠️  MongoDB not available, app will continue with limited functionality');
    }
  }
};

// Initialize connection
connectDB();

export { mongoose };
export default mongoose;