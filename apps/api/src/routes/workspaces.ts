import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { workspaces, workspaceMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and } from "drizzle-orm";

const app = new Hono();

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

// GET /api/workspaces - list user's workspaces
app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const memberOf = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, user.id),
    with: { workspace: true },
  });
  return c.json(memberOf.map((m) => m.workspace));
});

// POST /api/workspaces - create workspace
app.post("/", requireAuth, zValidator("json", createWorkspaceSchema), async (c) => {
  const user = c.get("user");
  const { name, slug } = c.req.valid("json");

  const [workspace] = await db.insert(workspaces).values({
    name, slug, ownerId: user.id,
  }).returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
  });

  return c.json(workspace, 201);
});

// GET /api/workspaces/:id
app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const workspaceId = c.req.param("id");

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, user.id)
    ),
    with: { workspace: { with: { projects: true } } },
  });

  if (!member) return c.json({ error: "Not found" }, 404);
  return c.json(member.workspace);
});

export default app;
