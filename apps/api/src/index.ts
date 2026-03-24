import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./lib/auth";
import { routes } from "./routes";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

// Auth routes — reconstruct full URL so Better Auth can match its internal routes
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3001";
  const rawUrl = c.req.raw.url;
  const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${baseURL}${rawUrl}`;
  const req = new Request(fullUrl, {
    method: c.req.raw.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  });
  return auth.handler(req);
});

// API Routes
app.route("/api", routes);

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

const port = Number(process.env.PORT) || 3001;
console.log(`🚀 API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
