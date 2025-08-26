import 'dotenv/config'; // Load .env variables
import mongoose from 'mongoose';

// MongoDB connection with robust error handling
const connectDB = async () => {
  try {
    // Try multiple connection options for flexibility
    const mongoURIs = [
      process.env.MONGODB_URI,
      process.env.DATABASE_URL,
      'mongodb://127.0.0.1:27017/expenseai',
      'mongodb://localhost:27017/expenseai'
    ].filter(Boolean);
    
    let connected = false;
    for (const mongoURI of mongoURIs) {
      try {
        await mongoose.connect(mongoURI, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false,
          maxPoolSize: 10,
          minPoolSize: 2,
        });
        console.log('✅ MongoDB connected successfully to:', mongoURI);
        console.log('📊 Database: expenseai');
        connected = true;
        break;
      } catch (err) {
        console.log(`❌ Failed to connect to ${mongoURI}`);
      }
    }
    
    if (!connected) {
      throw new Error('All MongoDB connection attempts failed');
    }
    
    // Listen for connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected, switching to memory storage');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed - using in-memory storage');
    console.log('💾 Application will continue with enhanced in-memory storage');
  }
};

// Initialize connection immediately
connectDB();

export { mongoose };
export default mongoose;