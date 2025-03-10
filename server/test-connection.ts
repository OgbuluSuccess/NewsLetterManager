import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load env variables
config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

console.log('Testing MongoDB connection...');
console.log(`Using URI: ${uri.replace(/:[^:@]+@/, ':****@')}`);

// Basic validation of URI format
if (uri.includes('<') || uri.includes('>')) {
  console.error('Error: MongoDB URI contains angle brackets (< or >).');
  console.error('Please replace <username>, <password>, and any other placeholders with actual values.');
  process.exit(1);
}

if (!uri.includes('mongodb+srv://') && !uri.includes('mongodb://')) {
  console.error('Error: MongoDB URI must start with mongodb+srv:// or mongodb://');
  process.exit(1);
}

if (uri.includes(' ')) {
  console.error('Error: MongoDB URI contains spaces. Please remove any spaces from the connection string.');
  process.exit(1);
}

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
}).then(() => {
  console.log('✓ Successfully connected to MongoDB Atlas');
  process.exit(0);
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);

  // Provide helpful error messages for common issues
  if (err.message.includes('ENOTFOUND')) {
    console.error('\nPossible issues:');
    console.error('1. Cluster hostname is incorrect');
    console.error('2. Network connectivity issue');
  } else if (err.message.includes('bad auth')) {
    console.error('\nAuthentication failed. Please check:');
    console.error('1. Username is correct');
    console.error('2. Password is correct');
    console.error('3. User has correct permissions');
  } else if (err.message.includes('EBADNAME')) {
    console.error('\nInvalid connection string format. Please ensure:');
    console.error('1. No angle brackets remain in the string');
    console.error('2. Password is URL-encoded if it contains special characters');
    console.error('3. Database name is properly specified');
  }

  process.exit(1);
});