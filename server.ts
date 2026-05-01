import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// Route imports
import authRoutes from "./backend/routes/auth";
import businessRoutes from "./backend/routes/business";
import operationRoutes from "./backend/routes/operation";
import financeRoutes from "./backend/routes/finance";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/business", businessRoutes);
  app.use("/api/operation", operationRoutes);
  app.use("/api/finance", financeRoutes);

  // 17Track Legacy Routes (keeping them just in case)
  app.post("/api/track/register", (req, res) => res.json({ code: 0, message: "Legacy route preserved" }));
  app.post("/api/track/gettrackinfo", (req, res) => res.json({ code: 0, data: [] }));

  // Health check
  app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 JCargo CMS Server running on http://localhost:${PORT}`);
  });
}

startServer();
