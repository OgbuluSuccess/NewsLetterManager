import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertSubscriberSchema,
  insertNewsletterSchema,
  insertSmtpConfigSchema,
} from "@shared/schema";
import { Newsletter, Subscriber, Campaign, SmtpConfig } from "./models";
import mongoose from "mongoose";
import { emailService } from "./email-service";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Newsletter routes
  app.get("/api/newsletters", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const newsletters = await Newsletter.find({ userId: req.user!._id }).sort(
        { createdAt: -1 }
      );
      res.json(newsletters);
    } catch (error) {
      console.error("Error fetching newsletters:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/newsletters", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log("Creating newsletter - Request body:", req.body);

      const data = insertNewsletterSchema.parse({
        ...req.body,
        userId: req.user!._id.toString(), // Convert ObjectId to string for validation
      });

      console.log("Validated newsletter data:", data);

      const newsletter = await Newsletter.create({
        ...data,
        userId: new mongoose.Types.ObjectId(data.userId), // Convert back to ObjectId for storage
      });

      console.log("Newsletter created:", newsletter);
      res.status(201).json(newsletter);
    } catch (error) {
      console.error("Newsletter creation error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Subscriber routes
  app.get("/api/subscribers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const subscribers = await storage.getSubscribers();
    res.json(subscribers);
  });

  app.post("/api/subscribers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const data = insertSubscriberSchema.parse(req.body);
      const subscriber = await storage.createSubscriber(data);
      res.status(201).json(subscriber);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  });

  app.delete("/api/subscribers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    await storage.deleteSubscriber(id);
    res.sendStatus(200);
  });

  app.post("/api/subscribers/bulk", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Validate each subscriber in the array
      const subscribers = req.body;
      const results = await Promise.all(
        subscribers.map(async (data) => {
          try {
            const validData = insertSubscriberSchema.parse(data);
            return await storage.createSubscriber(validData);
          } catch (error) {
            return { error: String(error), data };
          }
        })
      );

      const successful = results.filter((r) => !r.error);
      const failed = results.filter((r) => r.error);

      res.status(201).json({
        message: `Successfully imported ${successful.length} subscribers. ${failed.length} failed.`,
        successful,
        failed,
      });
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  });

  app.post("/api/newsletters/:id/send", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const newsletterId = req.params.id;
      const newsletter = await Newsletter.findById(newsletterId);
      if (!newsletter) {
        return res.status(404).json({ error: "Newsletter not found" });
      }

      const subscribers = await Subscriber.find({ subscribed: true });
      console.log(
        `Found ${subscribers.length} active subscribers for newsletter`
      );

      // Create campaign
      const campaign = await Campaign.create({
        newsletterId,
        opens: 0,
        clicks: 0,
        status: "processing",
        emailsSent: 0,
        totalEmails: subscribers.length,
      });

      console.log(
        `Created campaign ${campaign._id} for newsletter ${newsletterId}`
      );

      // Prepare email batch
      const emailBatch = subscribers.map((subscriber) => ({
        subscriberId: subscriber._id.toString(),
        to: subscriber.email,
        subject: newsletter.subject,
        html: newsletter.content,
      }));

      // Send emails in the background
      emailService
        .sendBulkEmails(campaign._id.toString(), emailBatch)
        .catch((error) => console.error("Bulk email sending error:", error));

      res.json({
        message: "Campaign started successfully",
        campaign: campaign._id,
        totalEmails: subscribers.length,
        status: "processing",
      });
    } catch (error) {
      console.error("Newsletter sending error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // SMTP Configuration routes
  app.get("/api/smtp-configs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const configs = await SmtpConfig.find().lean();
      // Remove sensitive data
      const safeConfigs = configs.map(({ password, ...rest }) => rest);
      res.json(safeConfigs);
    } catch (error) {
      console.error("Error fetching SMTP configs:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/smtp-configs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log("Creating SMTP config - Request body:", {
        ...req.body,
        password: "***",
      });
      const data = insertSmtpConfigSchema.parse(req.body);

      // If this is set as default, remove default from others
      if (data.isDefault) {
        await SmtpConfig.updateMany(
          { isDefault: true },
          { $set: { isDefault: false } }
        );
      }

      const config = await SmtpConfig.create(data);
      console.log("SMTP config created:", {
        ...config.toObject(),
        password: "***",
      });

      const { password, ...safeConfig } = config.toObject();
      res.status(201).json(safeConfig);
    } catch (error) {
      console.error("SMTP config creation error:", error);
      res.status(400).json({ error: String(error) });
    }
  });

  app.put("/api/smtp-configs/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const id = req.params.id;
      const update = insertSmtpConfigSchema.partial().parse(req.body);

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

      if (!config) {
        return res.status(404).json({ error: "SMTP config not found" });
      }

      const { password, ...safeConfig } = config.toObject();
      res.json(safeConfig);
    } catch (error) {
      console.error("SMTP config update error:", error);
      res.status(400).json({ error: String(error) });
    }
  });

  app.delete("/api/smtp-configs/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const id = req.params.id;
      const result = await SmtpConfig.findByIdAndDelete(id);

      if (!result) {
        return res.status(404).json({ error: "SMTP config not found" });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("SMTP config deletion error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Campaign analytics
  app.get("/api/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const campaigns = await storage.getCampaigns();
    res.json(campaigns);
  });

  app.post("/api/campaigns/:id/track", async (req, res) => {
    const campaignId = parseInt(req.params.id);
    await storage.incrementCampaignOpens(campaignId);
    res.sendStatus(200);
  });

  app.get("/api/campaigns/:id/logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const campaignId = parseInt(req.params.id);
    const logs = await storage.getEmailLogsByCampaign(campaignId);
    res.json(logs);
  });

  const httpServer = createServer(app);
  return httpServer;
}
