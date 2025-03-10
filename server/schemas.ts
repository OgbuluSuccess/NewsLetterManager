import mongoose from "mongoose";

// User Schema with proper MongoDB setup
export const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Other schemas remain unchanged
export const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  subscribed: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export const newsletterSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  content: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

// Update the campaign schema to include status and progress tracking
export const campaignSchema = new mongoose.Schema({
  newsletterId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Newsletter",
  },
  sentAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["processing", "completed", "failed"],
    default: "processing",
  },
  opens: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  emailsSent: { type: Number, default: 0 },
  totalEmails: { type: Number, required: true },
  error: String,
});

export const smtpConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  host: { type: String, required: true },
  port: { type: Number, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  fromEmail: { type: String, required: true },
  fromName: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  dailyLimit: { type: Number, default: 500 },
  createdAt: { type: Date, default: Date.now },
});

export const emailLogSchema = new mongoose.Schema({
  smtpConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "SmtpConfig",
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Campaign",
  },
  subscriberId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Subscriber",
  },
  status: { type: String, required: true },
  error: String,
  sentAt: { type: Date, default: Date.now },
});

// Create indexes
userSchema.index({ username: 1 }, { unique: true });
subscriberSchema.index({ email: 1 }, { unique: true });
newsletterSchema.index({ userId: 1 });
campaignSchema.index({ newsletterId: 1 });
smtpConfigSchema.index({ isDefault: 1 });
emailLogSchema.index({ campaignId: 1, subscriberId: 1 });
