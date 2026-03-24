import type { Context, Next } from "hono";
import { auth } from "../lib/auth";

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
}

export async function requireApiKey(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer pvcs_")) {
    return c.json({ error: "Invalid API key" }, 401);
  }
  // API key validation handled in route
  await next();
}
