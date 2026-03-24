import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { promptVersions, prompts, projects, workspaceMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and, desc } from "drizzle-orm";

const app = new Hono();

const createVersionSchema = z.object({
  promptId: z.string().uuid(),
  content: z.string().min(1),
  commitMessage: z.string().optional(),
  variables: z.array(z.string()).optional(),
  model: z.string().optional(),
  temperature: z.string().optional(),
  systemPrompt: z.string().optional(),
});

app.get("/prompt/:promptId", requireAuth, async (c) => {
  const user = c.get("user");
  const { promptId } = c.req.param();

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, promptId),
    with: { project: true },
  });
  if (!prompt) return c.json({ error: "Not found" }, 404);

  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, prompt.project.workspaceId), eq(workspaceMembers.userId, user.id)),
  });
  if (!member) return c.json({ error: "Forbidden" }, 403);

  const versions = await db.query.promptVersions.findMany({
    where: eq(promptVersions.promptId, promptId),
    orderBy: [desc(promptVersions.versionNumber)],
    with: { deployments: true },
  });

  return c.json(versions);
});

app.post("/", requireAuth, zValidator("json", createVersionSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, data.promptId),
    with: {
      project: true,
      versions: { orderBy: (v, { desc }) => [desc(v.versionNumber)], limit: 1 },
    },
  });
  if (!prompt) return c.json({ error: "Prompt not found" }, 404);

  const member = await db.query.workspaceMembers.findFirst({
    where: and(eq(workspaceMembers.workspaceId, prompt.project.workspaceId), eq(workspaceMembers.userId, user.id)),
  });
  if (!member || member.role === "viewer") return c.json({ error: "Forbidden" }, 403);

  const lastVersion = prompt.versions[0];
  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;
  const versionTag = `v${versionNumber}.0`;

  const [version] = await db.insert(promptVersions).values({
    ...data,
    versionNumber,
    versionTag,
    createdBy: user.id,
  }).returning();

  return c.json(version, 201);
});

export default app;
