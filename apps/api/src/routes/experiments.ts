import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import {
  experiments,
  experimentVariants,
  experimentAssignments,
  prompts,
  promptVersions,
  workspaceMembers,
  metrics,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and, inArray, count, avg, sql } from "drizzle-orm";

const app = new Hono();

// ── Schemas ─────────────────────────────────────────────────────────────────

const createExperimentSchema = z.object({
  workspaceId: z.string().uuid(),
  promptId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  variants: z
    .array(
      z.object({
        promptVersionId: z.string().uuid(),
        name: z.string().min(1).max(100),
        trafficPercent: z.number().min(1).max(99),
        isControl: z.boolean().default(false),
      })
    )
    .min(2)
    .max(5),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function canAccess(userId: string, workspaceId: string) {
  const m = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });
  return m;
}

// Deterministic variant assignment using hashed user identifier
function assignVariant(
  userIdentifier: string,
  variants: { id: string; trafficPercent: number }[]
): string {
  // Simple deterministic hash
  let hash = 0;
  const str = userIdentifier;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const bucket = Math.abs(hash) % 100;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.trafficPercent;
    if (bucket < cumulative) return variant.id;
  }
  return variants[variants.length - 1].id;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/experiments/workspace/:workspaceId
app.get("/workspace/:workspaceId", requireAuth, async (c) => {
  const user = c.get("user") as any;
  const { workspaceId } = c.req.param();

  if (!(await canAccess(user.id, workspaceId))) return c.json({ error: "Forbidden" }, 403);

  const list = await db.query.experiments.findMany({
    where: eq(experiments.workspaceId, workspaceId),
    with: {
      prompt: true,
      variants: { with: { promptVersion: true } },
    },
    orderBy: (e, { desc }) => [desc(e.createdAt)],
  });

  return c.json(list);
});

// GET /api/experiments/:id
app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user") as any;
  const { id } = c.req.param();

  const experiment = await db.query.experiments.findFirst({
    where: eq(experiments.id, id),
    with: {
      prompt: true,
      variants: {
        with: { promptVersion: true, assignments: true },
      },
    },
  });

  if (!experiment) return c.json({ error: "Not found" }, 404);
  if (!(await canAccess(user.id, experiment.workspaceId))) return c.json({ error: "Forbidden" }, 403);

  return c.json(experiment);
});

// POST /api/experiments
app.post("/", requireAuth, zValidator("json", createExperimentSchema), async (c) => {
  const user = c.get("user") as any;
  const data = c.req.valid("json");

  const member = await canAccess(user.id, data.workspaceId);
  if (!member) return c.json({ error: "Forbidden" }, 403);
  if (member.role === "viewer") return c.json({ error: "Forbidden" }, 403);

  // Validate traffic sums to 100
  const totalTraffic = data.variants.reduce((sum, v) => sum + v.trafficPercent, 0);
  if (totalTraffic !== 100) {
    return c.json({ error: `Traffic percentages must sum to 100, got ${totalTraffic}` }, 400);
  }

  // Ensure exactly one control
  const controlCount = data.variants.filter((v) => v.isControl).length;
  if (controlCount !== 1) {
    return c.json({ error: "Exactly one variant must be marked as control" }, 400);
  }

  const [experiment] = await db
    .insert(experiments)
    .values({
      workspaceId: data.workspaceId,
      promptId: data.promptId,
      name: data.name,
      description: data.description,
      createdBy: user.id,
    })
    .returning();

  const variantRows = await db
    .insert(experimentVariants)
    .values(
      data.variants.map((v) => ({
        experimentId: experiment.id,
        promptVersionId: v.promptVersionId,
        name: v.name,
        trafficPercent: v.trafficPercent,
        isControl: v.isControl,
      }))
    )
    .returning();

  return c.json({ ...experiment, variants: variantRows }, 201);
});

// POST /api/experiments/:id/start
app.post("/:id/start", requireAuth, async (c) => {
  const user = c.get("user") as any;
  const { id } = c.req.param();

  const experiment = await db.query.experiments.findFirst({
    where: eq(experiments.id, id),
  });
  if (!experiment) return c.json({ error: "Not found" }, 404);
  if (!(await canAccess(user.id, experiment.workspaceId))) return c.json({ error: "Forbidden" }, 403);
  if (experiment.status !== "draft") return c.json({ error: "Experiment must be in draft state" }, 400);

  const [updated] = await db
    .update(experiments)
    .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(experiments.id, id))
    .returning();

  return c.json(updated);
});

// POST /api/experiments/:id/stop
app.post("/:id/stop", requireAuth, async (c) => {
  const user = c.get("user") as any;
  const { id } = c.req.param();

  const experiment = await db.query.experiments.findFirst({
    where: eq(experiments.id, id),
  });
  if (!experiment) return c.json({ error: "Not found" }, 404);
  if (!(await canAccess(user.id, experiment.workspaceId))) return c.json({ error: "Forbidden" }, 403);
  if (experiment.status !== "running") return c.json({ error: "Experiment must be running" }, 400);

  const [updated] = await db
    .update(experiments)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(experiments.id, id))
    .returning();

  return c.json(updated);
});

// GET /api/experiments/:id/results — Full statistical comparison
app.get("/:id/results", requireAuth, async (c) => {
  const user = c.get("user") as any;
  const { id } = c.req.param();

  const experiment = await db.query.experiments.findFirst({
    where: eq(experiments.id, id),
    with: {
      variants: {
        with: { promptVersion: true, assignments: true },
      },
    },
  });

  if (!experiment) return c.json({ error: "Not found" }, 404);
  if (!(await canAccess(user.id, experiment.workspaceId))) return c.json({ error: "Forbidden" }, 403);

  const variantResults = await Promise.all(
    experiment.variants.map(async (variant) => {
      const assignmentCount = variant.assignments.length;

      const [agg] = await db
        .select({
          requestCount: count(),
          avgLatencyMs: avg(metrics.latencyMs),
          avgRating: avg(metrics.rating),
          avgTokens: avg(metrics.tokenCount),
        })
        .from(metrics)
        .where(eq(metrics.promptVersionId, variant.promptVersionId));

      // Rating distribution
      const ratingDist = await db
        .select({
          rating: metrics.rating,
          count: count(),
        })
        .from(metrics)
        .where(eq(metrics.promptVersionId, variant.promptVersionId))
        .groupBy(metrics.rating);

      return {
        variantId: variant.id,
        variantName: variant.name,
        isControl: variant.isControl,
        trafficPercent: variant.trafficPercent,
        versionTag: variant.promptVersion.versionTag,
        promptVersionId: variant.promptVersionId,
        assignmentCount,
        requestCount: Number(agg.requestCount) || 0,
        avgLatencyMs: Math.round(Number(agg.avgLatencyMs) || 0),
        avgRating: Number(Number(agg.avgRating || 0).toFixed(2)),
        avgTokens: Math.round(Number(agg.avgTokens) || 0),
        ratingDistribution: [1, 2, 3, 4, 5].map((r) => ({
          rating: r,
          count: Number(ratingDist.find((d) => d.rating === r)?.count || 0),
        })),
      };
    })
  );

  // Calculate relative improvement vs control
  const control = variantResults.find((v) => v.isControl);
  const withImprovements = variantResults.map((v) => {
    if (!control || v.isControl) return { ...v, improvement: null };
    const ratingImprovement =
      control.avgRating > 0 ? ((v.avgRating - control.avgRating) / control.avgRating) * 100 : null;
    const latencyImprovement =
      control.avgLatencyMs > 0
        ? ((control.avgLatencyMs - v.avgLatencyMs) / control.avgLatencyMs) * 100
        : null;
    return {
      ...v,
      improvement: {
        rating: ratingImprovement ? Number(ratingImprovement.toFixed(1)) : null,
        latency: latencyImprovement ? Number(latencyImprovement.toFixed(1)) : null,
      },
    };
  });

  return c.json({
    experiment: {
      id: experiment.id,
      name: experiment.name,
      status: experiment.status,
      startedAt: experiment.startedAt,
      completedAt: experiment.completedAt,
    },
    variants: withImprovements,
    totalAssignments: variantResults.reduce((s, v) => s + v.assignmentCount, 0),
    totalRequests: variantResults.reduce((s, v) => s + v.requestCount, 0),
  });
});

// DELETE /api/experiments/:id
app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user") as any;
  const { id } = c.req.param();

  const experiment = await db.query.experiments.findFirst({
    where: eq(experiments.id, id),
  });
  if (!experiment) return c.json({ error: "Not found" }, 404);
  if (!(await canAccess(user.id, experiment.workspaceId))) return c.json({ error: "Forbidden" }, 403);
  if (experiment.status === "running") return c.json({ error: "Stop the experiment before deleting" }, 400);

  await db.delete(experiments).where(eq(experiments.id, id));
  return c.json({ success: true });
});

export default app;
