import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/sos", async (req, res) => {
    const { anchorPhone, locationUrl } = req.body;
    
    console.log(`🚨 SOS Triggered! Anchor: ${anchorPhone}, Location: ${locationUrl}`);

    // Placeholder for future API integration (e.g., Twilio, SendGrid, etc.)
    res.json({ 
      success: true, 
      message: "SOS triggered (Placeholder Mode)",
      data: { anchorPhone, locationUrl }
    });
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
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
