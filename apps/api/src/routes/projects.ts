import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { projects, workspaceMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and } from "drizzle-orm";

const app = new Hono();

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  workspaceId: z.string().uuid(),
});

app.get("/workspace/:workspaceId", requireAuth, async (c) => {
  const user = c.get("user");
  const { workspaceId } = c.req.param();

  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)),
  });
  if (!member) return c.json({ error: "Forbidden" }, 403);

  const projectList = await db.query.projects.findMany({
    where: eq(projects.workspaceId, workspaceId),
    with: { prompts: true },
  });
  return c.json(projectList);
});

app.post("/", requireAuth, zValidator("json", createProjectSchema), async (c) => {
  const user = c.get("user");
  const { name, description, workspaceId } = c.req.valid("json");

  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)),
  });
  if (!member) return c.json({ error: "Forbidden" }, 403);

  const [project] = await db.insert(projects).values({
    name, description, workspaceId, createdBy: user.id,
  }).returning();

  return c.json(project, 201);
});

export default app;
