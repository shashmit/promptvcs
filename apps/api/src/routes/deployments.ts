import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { deployments, promptVersions, prompts, projects, workspaceMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and } from "drizzle-orm";

const app = new Hono();

const deploySchema = z.object({
  promptVersionId: z.string().uuid(),
  environment: z.enum(["development", "staging", "production"]),
});

app.post("/", requireAuth, zValidator("json", deploySchema), async (c) => {
  const user = c.get("user");
  const { promptVersionId, environment } = c.req.valid("json");

  const version = await db.query.promptVersions.findFirst({
    where: eq(promptVersions.id, promptVersionId),
    with: {
      prompt: { with: { project: true } },
    },
  });
  if (!version) return c.json({ error: "Version not found" }, 404);

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, version.prompt.project.workspaceId),
      eq(workspaceMembers.userId, user.id)
    ),
  });
  if (!member || member.role === "viewer") return c.json({ error: "Forbidden" }, 403);

  // Deactivate previous deployments for this prompt+env
  const allVersions = await db.query.promptVersions.findMany({
    where: eq(promptVersions.promptId, version.prompt.id),
  });
  const versionIds = allVersions.map((v) => v.id);

  for (const vid of versionIds) {
    await db
      .update(deployments)
      .set({ isActive: false })
      .where(and(eq(deployments.promptVersionId, vid), eq(deployments.environment, environment)));
  }

  const [deployment] = await db.insert(deployments).values({
    promptVersionId,
    environment,
    deployedBy: user.id,
  }).returning();

  return c.json(deployment, 201);
});

export default app;
