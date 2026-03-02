import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

// ─── Twilio client (lazy — only created when credentials exist) ───────────────
function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token || sid.startsWith("your_")) {
    return null; // credentials not yet configured — run in mock mode
  }

  return twilio(sid, token);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ─── POST /api/sos ──────────────────────────────────────────────────────────
  // Receives: { anchorPhone: string, locationUrl: string }
  // Sends an SMS via Twilio if credentials are configured, otherwise logs mock.
  app.post("/api/sos", async (req, res) => {
    const { anchorPhone, locationUrl } = req.body as {
      anchorPhone?: string;
      locationUrl?: string;
    };

    if (!anchorPhone) {
      res.status(400).json({ success: false, message: "anchorPhone is required." });
      return;
    }

    const from = process.env.TWILIO_PHONE_NUMBER;
    const client = getTwilioClient();

    const messageBody = `🚨 RESONANCE SOS ALERT\n\nYour contact needs help RIGHT NOW.\n\n📍 Location: ${locationUrl ?? "Unavailable"}\n\nSent via Resonance — Zero-Friction Mental Health`;

    console.log("─────────────────────────────────────────");
    console.log("🚨 SOS TRIGGERED");
    console.log(`   To       : ${anchorPhone}`);
    console.log(`   Location : ${locationUrl ?? "unavailable"}`);

    if (client && from) {
      // ── Real Twilio SMS ─────────────────────────────────────────────────────
      try {
        const message = await client.messages.create({
          body: messageBody,
          from,
          to: anchorPhone,
        });

        console.log(`   Twilio   : SMS sent ✓ (SID: ${message.sid})`);
        console.log("─────────────────────────────────────────");

        res.json({
          success: true,
          mode: "twilio",
          sid: message.sid,
          to: anchorPhone,
          locationUrl,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`   Twilio   : ✗ Failed — ${msg}`);
        console.log("─────────────────────────────────────────");

        res.status(500).json({
          success: false,
          mode: "twilio",
          message: `Twilio error: ${msg}`,
        });
      }
    } else {
      // ── Mock mode (no credentials yet) ─────────────────────────────────────
      console.log("   Mode     : MOCK (add Twilio credentials to .env to send real SMS)");
      console.log("─────────────────────────────────────────");
      console.log("\n📱 MOCK SMS CONTENT:\n");
      console.log(messageBody);
      console.log("\n─────────────────────────────────────────");

      res.json({
        success: true,
        mode: "mock",
        message: "SOS logged in mock mode. Add Twilio credentials to .env to send real SMS.",
        to: anchorPhone,
        locationUrl,
        mockSmsBody: messageBody,
      });
    }
  });

  // ─── Health check ───────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    const twilioConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER &&
      !process.env.TWILIO_ACCOUNT_SID.startsWith("your_")
    );

    res.json({
      status: "ok",
      twilioMode: twilioConfigured ? "live" : "mock",
    });
  });

  // ─── Vite middleware ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    const twilioConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      !process.env.TWILIO_ACCOUNT_SID.startsWith("your_")
    );

    console.log(`\n🎵 Resonance server running on http://localhost:${PORT}`);
    console.log(`📲 Twilio SMS: ${twilioConfigured ? "✅ LIVE" : "⚠️  MOCK MODE (fill .env to enable)"}\n`);
  });
}

startServer();
