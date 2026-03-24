import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { prompts, projects, workspaceMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and, inArray } from "drizzle-orm";

const app = new Hono();

const createPromptSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  projectId: z.string().uuid(),
});

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");

  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, user.id),
  });
  if (members.length === 0) return c.json([]);

  const workspaceIds = members.map((m) => m.workspaceId);

  const userProjects = await db.query.projects.findMany({
    where: inArray(projects.workspaceId, workspaceIds),
  });
  if (userProjects.length === 0) return c.json([]);

  const projectIds = userProjects.map((p) => p.id);

  const promptList = await db.query.prompts.findMany({
    where: inArray(prompts.projectId, projectIds),
    with: {
      versions: { orderBy: (v, { desc }) => [desc(v.versionNumber)] },
      project: { with: { workspace: true } },
    },
    orderBy: (p, { desc }) => [desc(p.updatedAt)],
  });

  return c.json(promptList);
});

app.get("/project/:projectId", requireAuth, async (c) => {
  const user = c.get("user");
  const { projectId } = c.req.param();

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: { workspace: true },
  });
  if (!project) return c.json({ error: "Not found" }, 404);

  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, user.id)),
  });
  if (!member) return c.json({ error: "Forbidden" }, 403);

  const promptList = await db.query.prompts.findMany({
    where: eq(prompts.projectId, projectId),
    with: { versions: { orderBy: (v, { desc }) => [desc(v.versionNumber)] } },
  });

  return c.json(promptList);
});

app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, id),
    with: {
      versions: { orderBy: (v, { desc }) => [desc(v.versionNumber)] },
      project: { with: { workspace: true } },
    },
  });
  if (!prompt) return c.json({ error: "Not found" }, 404);

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, prompt.project.workspaceId),
      eq(workspaceMembers.userId, user.id)
    ),
  });
  if (!member) return c.json({ error: "Forbidden" }, 403);

  return c.json(prompt);
});

app.post("/", requireAuth, zValidator("json", createPromptSchema), async (c) => {
  const user = c.get("user");
  const { name, slug, description, projectId } = c.req.valid("json");

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return c.json({ error: "Project not found" }, 404);

  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, user.id)),
  });
  if (!member) return c.json({ error: "Forbidden" }, 403);

  const [prompt] = await db.insert(prompts).values({
    name, slug, description, projectId, createdBy: user.id,
  }).returning();

  return c.json(prompt, 201);
});

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, id),
    with: { project: true },
  });
  if (!prompt) return c.json({ error: "Not found" }, 404);

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, prompt.project.workspaceId),
      eq(workspaceMembers.userId, user.id)
    ),
  });
  if (!member || member.role === "viewer") return c.json({ error: "Forbidden" }, 403);

  await db.delete(prompts).where(eq(prompts.id, id));
  return c.json({ success: true });
});

export default app;
