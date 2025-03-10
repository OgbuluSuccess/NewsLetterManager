import { z } from "zod";
import { Types } from "mongoose";

// Zod Schemas for Validation
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertSubscriberSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  subscribed: z.boolean().default(true),
});

export const insertNewsletterSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  userId: z.string().or(z.instanceof(Types.ObjectId)),
});

export const insertCampaignSchema = z.object({
  newsletterId: z.string(),
  opens: z.number().default(0),
  clicks: z.number().default(0),
});

export const insertSmtpConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1, "Port is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  fromEmail: z.string().email("Invalid from email"),
  fromName: z.string().min(1, "From name is required"),
  isDefault: z.boolean().default(false),
  dailyLimit: z.number().min(1).default(500),
});

// Export type aliases for convenience
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type InsertSmtpConfig = z.infer<typeof insertSmtpConfigSchema>;