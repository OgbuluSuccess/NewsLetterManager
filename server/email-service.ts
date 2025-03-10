import nodemailer from "nodemailer";
import { storage } from "./storage";
import { ISmtpConfig } from "./models";

const RATE_LIMIT_DELAY = 2000; // 2 seconds between emails

export class EmailService {
  private transports: Map<string, nodemailer.Transporter>;
  private currentSmtpIndex: number;
  private smtpQueue: ISmtpConfig[];

  constructor() {
    this.transports = new Map();
    this.currentSmtpIndex = 0;
    this.smtpQueue = [];
  }

  private async getTransport(
    config: ISmtpConfig
  ): Promise<nodemailer.Transporter> {
    if (!this.transports.has(config._id.toString())) {
      const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.username,
          pass: config.password,
        },
      });
      this.transports.set(config._id.toString(), transport);
    }
    return this.transports.get(config._id.toString())!;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async refreshSmtpQueue(): Promise<void> {
    const configs = await storage.getSmtpConfigs();

    // Start with default SMTP if available
    this.smtpQueue = [];
    const defaultConfig = configs.find((c) => c.isDefault);
    if (defaultConfig) {
      this.smtpQueue.push(defaultConfig);
      configs.forEach((c) => {
        if (!c.isDefault) this.smtpQueue.push(c);
      });
    } else {
      this.smtpQueue = configs;
    }

    this.currentSmtpIndex = 0;
  }

  private async getNextAvailableSmtp(): Promise<ISmtpConfig> {
    if (!this.smtpQueue.length) {
      await this.refreshSmtpQueue();
    }

    if (!this.smtpQueue.length) {
      throw new Error("No SMTP configurations available");
    }

    const startIndex = this.currentSmtpIndex;
    do {
      const config = this.smtpQueue[this.currentSmtpIndex];
      const count = await storage.getSmtpDailyCount(config._id);

      if (count < config.dailyLimit) {
        return config;
      }

      // Move to next SMTP
      this.currentSmtpIndex =
        (this.currentSmtpIndex + 1) % this.smtpQueue.length;

      // If we've checked all SMTPs and come back to start
      if (this.currentSmtpIndex === startIndex) {
        throw new Error(
          "Daily sending limit reached for all SMTP configurations"
        );
      }
    } while (true);
  }

  async sendBulkEmails(
    campaignId: string,
    emails: Array<{
      subscriberId: string;
      to: string;
      subject: string;
      html: string;
    }>
  ) {
    await this.refreshSmtpQueue();

    for (const email of emails) {
      try {
        // Get next available SMTP configuration
        const smtpConfig = await this.getNextAvailableSmtp();
        const transport = await this.getTransport(smtpConfig);

        // Send email
        await transport.sendMail({
          from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
          to: email.to,
          subject: email.subject,
          html: email.html,
        });

        // Log success
        await storage.logEmail({
          smtpConfigId: smtpConfig._id,
          campaignId,
          subscriberId: email.subscriberId,
          status: "sent",
        });

        // Rate limiting delay
        await this.delay(RATE_LIMIT_DELAY);
      } catch (error) {
        // Log failure and rotate to next SMTP
        const smtpConfig = await this.getNextAvailableSmtp();
        await storage.logEmail({
          smtpConfigId: smtpConfig._id,
          campaignId,
          subscriberId: email.subscriberId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });

        // Additional delay after error to prevent rapid failures
        await this.delay(RATE_LIMIT_DELAY * 2);
      }
    }
  }
}

export const emailService = new EmailService();
