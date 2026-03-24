import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { apiKeys, workspaceMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  workspaceId: z.string().uuid(),
});

app.get("/workspace/:workspaceId", requireAuth, async (c) => {
  const user = c.get("user");
  const { workspaceId } = c.req.param();

  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)),
  });
  if (!member) return c.json({ error: "Forbidden" }, 403);

  const keys = await db.query.apiKeys.findMany({
    where: and(eq(apiKeys.workspaceId, workspaceId), eq(apiKeys.isActive, true)),
  });

  return c.json(keys.map((k) => ({ ...k, keyHash: undefined })));
});

app.post("/", requireAuth, zValidator("json", createKeySchema), async (c) => {
  const user = c.get("user");
  const { name, workspaceId } = c.req.valid("json");

  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)),
  });
  if (!member || member.role === "viewer") return c.json({ error: "Forbidden" }, 403);

  const rawKey = `pvcs_${nanoid(32)}`;
  const keyPrefix = rawKey.substring(0, 12);

  // In production, hash with bcrypt/argon2 - using simple hash for now
  const keyHash = await Bun.password.hash(rawKey);

  const [key] = await db.insert(apiKeys).values({
    name,
    workspaceId,
    keyHash,
    keyPrefix,
    createdBy: user.id,
  }).returning();

  // Return the raw key ONCE - never shown again
  return c.json({ ...key, keyHash: undefined, rawKey }, 201);
});

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const key = await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, id) });
  if (!key) return c.json({ error: "Not found" }, 404);

  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, key.workspaceId), eq(workspaceMembers.userId, user.id)),
  });
  if (!member || member.role === "viewer") return c.json({ error: "Forbidden" }, 403);

  await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, id));
  return c.json({ success: true });
});

export default app;
