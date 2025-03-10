import {
  insertUserSchema,
  insertSubscriberSchema,
  insertNewsletterSchema,
  insertCampaignSchema,
  insertSmtpConfigSchema,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import {
  User,
  Subscriber,
  Newsletter,
  Campaign,
  SmtpConfig,
  EmailLog,
  IUser,
  ISubscriber,
  INewsletter,
  ICampaign,
  ISmtpConfig,
  IEmailLog,
} from "./models";
import mongoose from "mongoose";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<IUser | undefined>;
  getUserByUsername(username: string): Promise<IUser | undefined>;
  createUser(user: typeof insertUserSchema._type): Promise<IUser>;

  // Subscriber operations
  getSubscribers(): Promise<ISubscriber[]>;
  createSubscriber(
    subscriber: typeof insertSubscriberSchema._type
  ): Promise<ISubscriber>;
  updateSubscriber(
    id: string,
    subscriber: Partial<typeof insertSubscriberSchema._type>
  ): Promise<ISubscriber>;
  deleteSubscriber(id: string): Promise<void>;

  // Newsletter operations
  getNewsletters(): Promise<INewsletter[]>;
  getNewsletter(id: string): Promise<INewsletter | undefined>;
  createNewsletter(
    newsletter: typeof insertNewsletterSchema._type
  ): Promise<INewsletter>;

  // Campaign operations
  getCampaigns(): Promise<ICampaign[]>;
  createCampaign(
    campaign: typeof insertCampaignSchema._type
  ): Promise<ICampaign>;
  incrementCampaignOpens(id: string): Promise<void>;

  // SMTP Config operations
  getSmtpConfigs(): Promise<ISmtpConfig[]>;
  getSmtpConfig(id: string): Promise<ISmtpConfig | undefined>;
  createSmtpConfig(
    config: typeof insertSmtpConfigSchema._type
  ): Promise<ISmtpConfig>;
  updateSmtpConfig(
    id: string,
    config: Partial<typeof insertSmtpConfigSchema._type>
  ): Promise<ISmtpConfig>;
  deleteSmtpConfig(id: string): Promise<void>;
  getDefaultSmtpConfig(): Promise<ISmtpConfig | undefined>;

  // Email logging operations
  logEmail(log: Omit<IEmailLog, "id" | "sentAt">): Promise<IEmailLog>;
  getEmailLogsByCampaign(campaignId: string): Promise<IEmailLog[]>;
  getSmtpDailyCount(smtpConfigId: mongoose.Types.ObjectId): Promise<number>;

  sessionStore: session.Store;
}

export function createSessionStore(session: typeof import("express-session")) {
  return new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
}

export class MongoDBStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = createSessionStore(session);
  }

  async getUser(id: string): Promise<IUser | undefined> {
    const user = await User.findById(id);
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<IUser | undefined> {
    const user = await User.findOne({ username });
    return user || undefined;
  }

  async createUser(insertUser: typeof insertUserSchema._type): Promise<IUser> {
    const user = await User.create(insertUser);
    return user;
  }

  async getSubscribers(): Promise<ISubscriber[]> {
    return Subscriber.find();
  }

  async createSubscriber(
    insertSubscriber: typeof insertSubscriberSchema._type
  ): Promise<ISubscriber> {
    const subscriber = await Subscriber.create(insertSubscriber);
    return subscriber;
  }

  async updateSubscriber(
    id: string,
    update: Partial<typeof insertSubscriberSchema._type>
  ): Promise<ISubscriber> {
    const subscriber = await Subscriber.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!subscriber) throw new Error("Subscriber not found");
    return subscriber;
  }

  async deleteSubscriber(id: string): Promise<void> {
    await Subscriber.findByIdAndDelete(id);
  }

  async getNewsletters(): Promise<INewsletter[]> {
    return Newsletter.find().sort({ createdAt: -1 });
  }

  async getNewsletter(id: string): Promise<INewsletter | undefined> {
    const newsletter = await Newsletter.findById(id);
    return newsletter || undefined;
  }

  async createNewsletter(
    insertNewsletter: typeof insertNewsletterSchema._type
  ): Promise<INewsletter> {
    const newsletter = await Newsletter.create(insertNewsletter);
    return newsletter;
  }

  async getCampaigns(): Promise<ICampaign[]> {
    return Campaign.find().sort({ sentAt: -1 });
  }

  async createCampaign(
    insertCampaign: typeof insertCampaignSchema._type
  ): Promise<ICampaign> {
    const campaign = await Campaign.create(insertCampaign);
    return campaign;
  }

  async incrementCampaignOpens(id: string): Promise<void> {
    await Campaign.findByIdAndUpdate(id, { $inc: { opens: 1 } });
  }

  async getSmtpConfigs(): Promise<ISmtpConfig[]> {
    return SmtpConfig.find();
  }

  async getSmtpConfig(id: string): Promise<ISmtpConfig | undefined> {
    const config = await SmtpConfig.findById(id);
    return config || undefined;
  }

  async createSmtpConfig(
    insertConfig: typeof insertSmtpConfigSchema._type
  ): Promise<ISmtpConfig> {
    // If this is set as default, remove default from others
    if (insertConfig.isDefault) {
      await SmtpConfig.updateMany(
        { isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const config = await SmtpConfig.create(insertConfig);
    return config;
  }

  async updateSmtpConfig(
    id: string,
    update: Partial<typeof insertSmtpConfigSchema._type>
  ): Promise<ISmtpConfig> {
    // Handle default SMTP logic
    if (update.isDefault) {
      await SmtpConfig.updateMany(
        { _id: { $ne: id }, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const config = await SmtpConfig.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!config) throw new Error("SMTP config not found");
    return config;
  }

  async deleteSmtpConfig(id: string): Promise<void> {
    await SmtpConfig.findByIdAndDelete(id);
  }

  async getDefaultSmtpConfig(): Promise<ISmtpConfig | undefined> {
    const config = await SmtpConfig.findOne({ isDefault: true });
    return config || undefined;
  }

  async logEmail(
    insertLog: Omit<IEmailLog, "id" | "sentAt">
  ): Promise<IEmailLog> {
    const log = await EmailLog.create({
      ...insertLog,
      sentAt: new Date(),
    });
    return log;
  }

  async getEmailLogsByCampaign(campaignId: string): Promise<IEmailLog[]> {
    return EmailLog.find({ campaignId });
  }

  async getSmtpDailyCount(
    smtpConfigId: mongoose.Types.ObjectId
  ): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return EmailLog.countDocuments({
      smtpConfigId,
      sentAt: { $gte: today },
      status: "sent",
    });
  }
}

export const storage = new MongoDBStorage();
