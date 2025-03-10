import mongoose from 'mongoose';
import {
  userSchema,
  subscriberSchema,
  newsletterSchema,
  campaignSchema,
  smtpConfigSchema,
  emailLogSchema
} from './schemas';

// Only create models if they haven't been compiled yet
console.log('Loading User model, already exists:', !!mongoose.models.User);
export const User = mongoose.models.User || mongoose.model('User', userSchema);

console.log('Loading Subscriber model, already exists:', !!mongoose.models.Subscriber);
export const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);

console.log('Loading Newsletter model, already exists:', !!mongoose.models.Newsletter);
export const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', newsletterSchema);

console.log('Loading Campaign model, already exists:', !!mongoose.models.Campaign);
export const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);

console.log('Loading SmtpConfig model, already exists:', !!mongoose.models.SmtpConfig);
export const SmtpConfig = mongoose.models.SmtpConfig || mongoose.model('SmtpConfig', smtpConfigSchema);

console.log('Loading EmailLog model, already exists:', !!mongoose.models.EmailLog);
export const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);

// Export interfaces
export interface IUser extends mongoose.Document {
  username: string;
  password: string;
  createdAt: Date;
}

export interface ISubscriber extends mongoose.Document {
  email: string;
  name?: string;
  subscribed: boolean;
  createdAt: Date;
}

export interface INewsletter extends mongoose.Document {
  subject: string;
  content: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface ICampaign extends mongoose.Document {
  newsletterId: mongoose.Types.ObjectId;
  sentAt: Date;
  opens: number;
  clicks: number;
}

export interface ISmtpConfig extends mongoose.Document {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  isDefault: boolean;
  dailyLimit: number;
  createdAt: Date;
}

export interface IEmailLog extends mongoose.Document {
  smtpConfigId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  subscriberId: mongoose.Types.ObjectId;
  status: string;
  error?: string;
  sentAt: Date;
}