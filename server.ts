import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for email subscription
  app.post("/api/subscribe", async (req, res) => {
    const { email, archetype, insights } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log(`Subscribing email: ${email}`);

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP is not configured. Logging email instead.");
      return res.json({ 
        success: true, 
        message: "Subscription received (SMTP not configured, logged to console)",
        mock: true 
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Aura Concierge" <aura@example.com>',
        to: email,
        subject: "Your Spark & Sync Relationship Roadmap",
        text: `Hello,\n\nYour relationship archetype is: ${archetype}\n\nInsights:\n${insights}\n\nWelcome to the path back to connection.\n\nBest,\nAura`,
        html: `
          <div style="font-family: serif; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #EBE6DE;">
            <h1 style="font-style: italic; font-weight: 300; border-bottom: 1px solid #C5A059; padding-bottom: 20px;">Your Relationship Roadmap</h1>
            <p style="text-transform: uppercase; letter-spacing: 0.2em; font-size: 10px; color: #C5A059; font-weight: bold;">Archetype: ${archetype}</p>
            <div style="line-height: 1.6; font-size: 16px; margin-top: 30px;">
              ${insights.replace(/\n/g, '<br>')}
            </div>
            <p style="margin-top: 40px; font-style: italic; opacity: 0.6;">"Intimacy is an architecture. You've just laid the first stone."</p>
            <hr style="border: 0; border-top: 1px solid #EBE6DE; margin: 40px 0;">
            <p style="font-size: 12px; opacity: 0.4;">Aura Concierge • Neural Synchronization Architecture</p>
          </div>
        `,
      });

      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
