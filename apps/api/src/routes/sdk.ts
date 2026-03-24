import { Hono } from "hono";
import { db } from "../db";
import { apiKeys, prompts, deployments, promptVersions, metrics, experiments, experimentAssignments } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono();

// Middleware to validate API key
async function validateApiKey(authHeader: string | undefined) {
  if (!authHeader?.startsWith("Bearer pvcs_")) return null;
  const rawKey = authHeader.replace("Bearer ", "");

  const allKeys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.isActive, true),
  });

  for (const key of allKeys) {
    const valid = await Bun.password.verify(rawKey, key.keyHash);
    if (valid) return key;
  }
  return null;
}

// GET /api/sdk/prompts/:slug?environment=production&version=v1.0
app.get("/prompts/:slug", async (c) => {
  const authKey = await validateApiKey(c.req.header("Authorization"));
  if (!authKey) return c.json({ error: "Invalid API key" }, 401);

  const { slug } = c.req.param();
  const environment = (c.req.query("environment") || "production") as "development" | "staging" | "production";
  const versionTag = c.req.query("version");

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.slug, slug),
    with: {
      project: { with: { workspace: true } },
      versions: {
        orderBy: (v, { desc }) => [desc(v.versionNumber)],
        with: { deployments: true },
      },
    },
  });

  if (!prompt || prompt.project.workspace.id !== authKey.workspaceId) {
    return c.json({ error: "Prompt not found" }, 404);
  }

  let version;
  if (versionTag) {
    version = prompt.versions.find((v) => v.versionTag === versionTag);
  } else {
    version = prompt.versions.find((v) =>
      v.deployments.some((d) => d.environment === environment && d.isActive)
    );
    // Fallback to latest
    if (!version) version = prompt.versions[0];
  }

  if (!version) return c.json({ error: "No version found" }, 404);

  // Update last used
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, authKey.id));

  return c.json({
    id: version.id,
    slug: prompt.slug,
    name: prompt.name,
    content: version.content,
    versionTag: version.versionTag,
    versionNumber: version.versionNumber,
    variables: version.variables,
    model: version.model,
    systemPrompt: version.systemPrompt,
  });
});

// POST /api/sdk/metrics - track usage
const metricsSchema = z.object({
  promptVersionId: z.string().uuid(),
  latencyMs: z.number().optional(),
  tokenCount: z.number().optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  rating: z.number().min(1).max(5).optional(),
  metadata: z.record(z.unknown()).optional(),
});

app.post("/metrics", zValidator("json", metricsSchema), async (c) => {
  const authKey = await validateApiKey(c.req.header("Authorization"));
  if (!authKey) return c.json({ error: "Invalid API key" }, 401);

  const data = c.req.valid("json");
  const [metric] = await db.insert(metrics).values(data).returning();
  return c.json(metric, 201);
});

// POST /api/sdk/experiment/assign — get variant for a user
const assignSchema = z.object({
  experimentName: z.string(),
  userIdentifier: z.string(),
});

app.post("/experiment/assign", zValidator("json", assignSchema), async (c) => {
  const authKey = await validateApiKey(c.req.header("Authorization"));
  if (!authKey) return c.json({ error: "Invalid API key" }, 401);

  const { experimentName, userIdentifier } = c.req.valid("json");

  // Find running experiment by name in this workspace
  const experiment = await db.query.experiments.findFirst({
    where: and(
      eq(experiments.status, "running"),
      eq(experiments.workspaceId, authKey.workspaceId)
    ),
    with: {
      variants: { with: { promptVersion: true } },
    },
  });

  if (!experiment || experiment.name !== experimentName) {
    return c.json({ error: "Experiment not found or not running" }, 404);
  }

  // Check if already assigned
  const existing = await db.query.experimentAssignments.findFirst({
    where: and(
      eq(experimentAssignments.experimentId, experiment.id),
      eq(experimentAssignments.userIdentifier, userIdentifier)
    ),
    with: { variant: { with: { promptVersion: true } } },
  });

  if (existing) {
    return c.json({
      variantId: existing.variant.id,
      variantName: existing.variant.name,
      isControl: existing.variant.isControl,
      prompt: {
        id: existing.variant.promptVersion.id,
        content: existing.variant.promptVersion.content,
        versionTag: existing.variant.promptVersion.versionTag,
        variables: existing.variant.promptVersion.variables,
      },
    });
  }

  // New assignment
  function assignVariantId(uid: string, variants: { id: string; trafficPercent: number }[]) {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = ((hash << 5) - hash + uid.charCodeAt(i)) | 0;
    const bucket = Math.abs(hash) % 100;
    let cumulative = 0;
    for (const v of variants) {
      cumulative += v.trafficPercent;
      if (bucket < cumulative) return v.id;
    }
    return variants[variants.length - 1].id;
  }

  const assignedVariantId = assignVariantId(userIdentifier, experiment.variants);
  const assignedVariant = experiment.variants.find((v) => v.id === assignedVariantId)!;

  await db.insert(experimentAssignments).values({
    experimentId: experiment.id,
    variantId: assignedVariantId,
    userIdentifier,
  });

  return c.json({
    variantId: assignedVariant.id,
    variantName: assignedVariant.name,
    isControl: assignedVariant.isControl,
    prompt: {
      id: assignedVariant.promptVersion.id,
      content: assignedVariant.promptVersion.content,
      versionTag: assignedVariant.promptVersion.versionTag,
      variables: assignedVariant.promptVersion.variables,
    },
  });
});

export default app;
