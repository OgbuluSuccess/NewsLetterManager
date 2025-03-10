import mongoose from "mongoose";
import {
  User,
  Newsletter,
  Subscriber,
  Campaign,
  SmtpConfig,
  EmailLog,
} from "./models";

export async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  try {
    console.log("Attempting to connect to MongoDB...");
    console.log(
      `Using MongoDB URI: ${process.env.MONGODB_URI.replace(
        /:[^:@]+@/,
        ":****@"
      )}`
    );

    mongoose.set("debug", process.env.NODE_ENV !== "production");

    // Add retry options for better stability
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Give more time for initial connection
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    });
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      console.error("Could not connect to MongoDB. Please ensure:");
      console.error("1. Your MongoDB Atlas IP whitelist includes 0.0.0.0/0");
      console.error("2. Your database credentials are correct");
      console.error("3. Your MongoDB Atlas cluster is running");
    }
    throw error; // Re-throw to be handled by the main application
  }
}

// Separate function for index synchronization
export async function syncIndexes() {
  try {
    console.log("Starting database schema and index synchronization...");
    await Promise.all([
      User.syncIndexes(),
      Newsletter.syncIndexes(),
      Subscriber.syncIndexes(),
      Campaign.syncIndexes(),
      SmtpConfig.syncIndexes(),
      EmailLog.syncIndexes(),
    ]);
    console.log("Database schemas and indexes synchronized successfully");
  } catch (error) {
    console.error("Error synchronizing indexes:", error);
    // Don't throw the error - we want the application to continue running
    // even if index syncing fails
  }
}

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit(0);
});
