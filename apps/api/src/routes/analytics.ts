import { Hono } from "hono";
import { db } from "../db";
import { metrics, promptVersions, prompts, projects, workspaceMembers } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and, gte, sql, desc, count, avg, sum, inArray } from "drizzle-orm";

const app = new Hono();

// Helper: verify workspace access
async function canAccessWorkspace(userId: string, workspaceId: string) {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });
  return !!member;
}

// Helper: get all version IDs for a workspace
async function getWorkspaceVersionIds(workspaceId: string): Promise<string[]> {
  const projectList = await db.query.projects.findMany({
    where: eq(projects.workspaceId, workspaceId),
    with: {
      prompts: {
        with: { versions: true },
      },
    },
  });

  const ids: string[] = [];
  for (const project of projectList) {
    for (const prompt of project.prompts) {
      for (const version of prompt.versions) {
        ids.push(version.id);
      }
    }
  }
  return ids;
}

// GET /api/analytics/overview
app.get("/overview", requireAuth, async (c) => {
  const user = c.get("user");
  const workspaceId = c.req.query("workspaceId");
  if (!workspaceId) return c.json({ error: "workspaceId required" }, 400);
  if (!(await canAccessWorkspace(user.id, workspaceId))) return c.json({ error: "Forbidden" }, 403);

  const versionIds = await getWorkspaceVersionIds(workspaceId);

  if (versionIds.length === 0) {
    return c.json({
      totalRequests: 0,
      avgLatencyMs: 0,
      avgRating: 0,
      totalTokens: 0,
      totalPrompts: 0,
      totalVersions: 0,
      requestsToday: 0,
    });
  }

  // Aggregate metrics
  const [agg] = await db
    .select({
      totalRequests: count(),
      avgLatencyMs: avg(metrics.latencyMs),
      avgRating: avg(metrics.rating),
      totalTokens: sum(metrics.tokenCount),
    })
    .from(metrics)
    .where(inArray(metrics.promptVersionId, versionIds));

  // Count prompts and versions in workspace
  const projectList = await db.query.projects.findMany({
    where: eq(projects.workspaceId, workspaceId),
    with: { prompts: { with: { versions: true } } },
  });

  let totalPrompts = 0;
  let totalVersions = 0;
  for (const p of projectList) {
    totalPrompts += p.prompts.length;
    for (const pr of p.prompts) totalVersions += pr.versions.length;
  }

  // Requests today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayAgg] = await db
    .select({ count: count() })
    .from(metrics)
    .where(and(inArray(metrics.promptVersionId, versionIds), gte(metrics.createdAt, todayStart)));

  return c.json({
    totalRequests: Number(agg.totalRequests) || 0,
    avgLatencyMs: Math.round(Number(agg.avgLatencyMs) || 0),
    avgRating: Number(Number(agg.avgRating || 0).toFixed(1)),
    totalTokens: Number(agg.totalTokens) || 0,
    totalPrompts,
    totalVersions,
    requestsToday: Number(todayAgg.count) || 0,
  });
});

// GET /api/analytics/requests-over-time
app.get("/requests-over-time", requireAuth, async (c) => {
  const user = c.get("user");
  const workspaceId = c.req.query("workspaceId");
  const days = parseInt(c.req.query("days") || "30");

  let versionIds: string[] = [];

  if (workspaceId) {
    if (!(await canAccessWorkspace(user.id, workspaceId))) return c.json({ error: "Forbidden" }, 403);
    versionIds = await getWorkspaceVersionIds(workspaceId);
  } else {
    const memberWorkspaces = await db.query.workspaceMembers.findMany({ where: eq(workspaceMembers.userId, user.id) });
    const wIds = memberWorkspaces.map((m) => m.workspaceId);
    if (wIds.length > 0) {
      const projectList = await db.query.projects.findMany({ where: inArray(projects.workspaceId, wIds), with: { prompts: { with: { versions: true } } } });
      for (const project of projectList)
        for (const prompt of project.prompts)
          for (const v of prompt.versions) versionIds.push(v.id);
    }
  }

  if (versionIds.length === 0) return c.json([]);

  const since = new Date(Date.now() - days * 86400000);
  const rows = await db
    .select({ date: sql<string>`DATE(${metrics.createdAt})`, count: count() })
    .from(metrics)
    .where(and(inArray(metrics.promptVersionId, versionIds), gte(metrics.createdAt, since)))
    .groupBy(sql`DATE(${metrics.createdAt})`)
    .orderBy(sql`DATE(${metrics.createdAt})`);

  const dateMap = new Map(rows.map((r) => [r.date, Number(r.count)]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    result.push({ date: key, count: dateMap.get(key) || 0 });
  }
  return c.json(result);
});

// GET /api/analytics/top-prompts
app.get("/top-prompts", requireAuth, async (c) => {
  const user = c.get("user");
  const workspaceId = c.req.query("workspaceId");
  const limit = parseInt(c.req.query("limit") || "10");
  if (!workspaceId) return c.json({ error: "workspaceId required" }, 400);
  if (!(await canAccessWorkspace(user.id, workspaceId))) return c.json({ error: "Forbidden" }, 403);

  const projectList = await db.query.projects.findMany({
    where: eq(projects.workspaceId, workspaceId),
    with: {
      prompts: {
        with: { versions: true },
      },
    },
  });

  const result = [];

  for (const project of projectList) {
    for (const prompt of project.prompts) {
      const vIds = prompt.versions.map((v) => v.id);
      if (vIds.length === 0) continue;

      const [agg] = await db
        .select({
          requestCount: count(),
          avgLatencyMs: avg(metrics.latencyMs),
          avgRating: avg(metrics.rating),
        })
        .from(metrics)
        .where(inArray(metrics.promptVersionId, vIds));

      result.push({
        promptId: prompt.id,
        promptName: prompt.name,
        slug: prompt.slug,
        requestCount: Number(agg.requestCount) || 0,
        avgLatencyMs: Math.round(Number(agg.avgLatencyMs) || 0),
        avgRating: Number(Number(agg.avgRating || 0).toFixed(1)),
      });
    }
  }

  result.sort((a, b) => b.requestCount - a.requestCount);
  return c.json(result.slice(0, limit));
});

// GET /api/analytics/latency-trend
app.get("/latency-trend", requireAuth, async (c) => {
  const user = c.get("user");
  const promptId = c.req.query("promptId");
  const days = parseInt(c.req.query("days") || "14");
  if (!promptId) return c.json({ error: "promptId required" }, 400);

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, promptId),
    with: { project: true, versions: true },
  });
  if (!prompt) return c.json({ error: "Not found" }, 404);
  if (!(await canAccessWorkspace(user.id, prompt.project.workspaceId))) return c.json({ error: "Forbidden" }, 403);

  const vIds = prompt.versions.map((v) => v.id);
  if (vIds.length === 0) return c.json([]);

  const since = new Date(Date.now() - days * 86400000);

  const rows = await db
    .select({
      date: sql<string>`DATE(${metrics.createdAt})`,
      avgLatencyMs: avg(metrics.latencyMs),
      count: count(),
    })
    .from(metrics)
    .where(and(inArray(metrics.promptVersionId, vIds), gte(metrics.createdAt, since)))
    .groupBy(sql`DATE(${metrics.createdAt})`)
    .orderBy(sql`DATE(${metrics.createdAt})`);

  const dateMap = new Map(rows.map((r) => [r.date, { avgLatencyMs: Math.round(Number(r.avgLatencyMs) || 0), count: Number(r.count) }]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    const entry = dateMap.get(key);
    result.push({ date: key, avgLatencyMs: entry?.avgLatencyMs || 0, count: entry?.count || 0 });
  }

  return c.json(result);
});

// GET /api/analytics/version-comparison
app.get("/version-comparison", requireAuth, async (c) => {
  const user = c.get("user");
  const promptId = c.req.query("promptId");
  if (!promptId) return c.json({ error: "promptId required" }, 400);

  const prompt = await db.query.prompts.findFirst({
    where: eq(prompts.id, promptId),
    with: { project: true, versions: { orderBy: (v, { asc }) => [asc(v.versionNumber)] } },
  });
  if (!prompt) return c.json({ error: "Not found" }, 404);
  if (!(await canAccessWorkspace(user.id, prompt.project.workspaceId))) return c.json({ error: "Forbidden" }, 403);

  const result = [];
  for (const version of prompt.versions) {
    const [agg] = await db
      .select({
        requestCount: count(),
        avgLatencyMs: avg(metrics.latencyMs),
        avgRating: avg(metrics.rating),
        totalTokens: sum(metrics.tokenCount),
      })
      .from(metrics)
      .where(eq(metrics.promptVersionId, version.id));

    result.push({
      versionId: version.id,
      versionTag: version.versionTag,
      versionNumber: version.versionNumber,
      requestCount: Number(agg.requestCount) || 0,
      avgLatencyMs: Math.round(Number(agg.avgLatencyMs) || 0),
      avgRating: Number(Number(agg.avgRating || 0).toFixed(1)),
      totalTokens: Number(agg.totalTokens) || 0,
    });
  }

  return c.json(result);
});

// GET /api/analytics/global-overview — aggregates across ALL user workspaces
app.get("/global-overview", requireAuth, async (c) => {
  const user = c.get("user");

  const memberWorkspaces = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, user.id),
  });

  if (memberWorkspaces.length === 0) {
    return c.json({ totalRequests: 0, avgLatencyMs: 0, avgRating: 0, totalTokens: 0, totalPrompts: 0, totalVersions: 0, requestsToday: 0, workspaceCount: 0 });
  }

  const workspaceIds = memberWorkspaces.map((m) => m.workspaceId);

  const projectList = await db.query.projects.findMany({
    where: inArray(projects.workspaceId, workspaceIds),
    with: { prompts: { with: { versions: true } } },
  });

  let totalPrompts = 0;
  let totalVersions = 0;
  const allVersionIds: string[] = [];
  for (const project of projectList) {
    totalPrompts += project.prompts.length;
    for (const prompt of project.prompts) {
      totalVersions += prompt.versions.length;
      for (const v of prompt.versions) allVersionIds.push(v.id);
    }
  }

  if (allVersionIds.length === 0) {
    return c.json({ totalRequests: 0, avgLatencyMs: 0, avgRating: 0, totalTokens: 0, totalPrompts, totalVersions, requestsToday: 0, workspaceCount: workspaceIds.length });
  }

  const [agg] = await db
    .select({ totalRequests: count(), avgLatencyMs: avg(metrics.latencyMs), avgRating: avg(metrics.rating), totalTokens: sum(metrics.tokenCount) })
    .from(metrics)
    .where(inArray(metrics.promptVersionId, allVersionIds));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayAgg] = await db
    .select({ count: count() })
    .from(metrics)
    .where(and(inArray(metrics.promptVersionId, allVersionIds), gte(metrics.createdAt, todayStart)));

  return c.json({
    totalRequests: Number(agg.totalRequests) || 0,
    avgLatencyMs: Math.round(Number(agg.avgLatencyMs) || 0),
    avgRating: Number(Number(agg.avgRating || 0).toFixed(1)),
    totalTokens: Number(agg.totalTokens) || 0,
    totalPrompts,
    totalVersions,
    requestsToday: Number(todayAgg.count) || 0,
    workspaceCount: workspaceIds.length,
  });
});

// GET /api/analytics/tokens-over-time
app.get("/tokens-over-time", requireAuth, async (c) => {
  const user = c.get("user");
  const workspaceId = c.req.query("workspaceId");
  const days = parseInt(c.req.query("days") || "30");

  let versionIds: string[] = [];

  if (workspaceId) {
    if (!(await canAccessWorkspace(user.id, workspaceId))) return c.json({ error: "Forbidden" }, 403);
    versionIds = await getWorkspaceVersionIds(workspaceId);
  } else {
    const memberWorkspaces = await db.query.workspaceMembers.findMany({ where: eq(workspaceMembers.userId, user.id) });
    const wIds = memberWorkspaces.map((m) => m.workspaceId);
    if (wIds.length > 0) {
      const projectList = await db.query.projects.findMany({ where: inArray(projects.workspaceId, wIds), with: { prompts: { with: { versions: true } } } });
      for (const project of projectList)
        for (const prompt of project.prompts)
          for (const v of prompt.versions) versionIds.push(v.id);
    }
  }

  if (versionIds.length === 0) return c.json([]);

  const since = new Date(Date.now() - days * 86400000);
  const rows = await db
    .select({ date: sql<string>`DATE(${metrics.createdAt})`, totalTokens: sum(metrics.tokenCount), requests: count() })
    .from(metrics)
    .where(and(inArray(metrics.promptVersionId, versionIds), gte(metrics.createdAt, since)))
    .groupBy(sql`DATE(${metrics.createdAt})`)
    .orderBy(sql`DATE(${metrics.createdAt})`);

  const dateMap = new Map(rows.map((r) => [r.date, { totalTokens: Number(r.totalTokens) || 0, requests: Number(r.requests) || 0 }]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    const entry = dateMap.get(key);
    result.push({ date: key, totalTokens: entry?.totalTokens || 0, requests: entry?.requests || 0 });
  }
  return c.json(result);
});

// GET /api/analytics/rating-distribution
app.get("/rating-distribution", requireAuth, async (c) => {
  const user = c.get("user");
  const workspaceId = c.req.query("workspaceId");

  let versionIds: string[] = [];

  if (workspaceId) {
    if (!(await canAccessWorkspace(user.id, workspaceId))) return c.json({ error: "Forbidden" }, 403);
    versionIds = await getWorkspaceVersionIds(workspaceId);
  } else {
    const memberWorkspaces = await db.query.workspaceMembers.findMany({ where: eq(workspaceMembers.userId, user.id) });
    const wIds = memberWorkspaces.map((m) => m.workspaceId);
    if (wIds.length > 0) {
      const projectList = await db.query.projects.findMany({ where: inArray(projects.workspaceId, wIds), with: { prompts: { with: { versions: true } } } });
      for (const project of projectList)
        for (const prompt of project.prompts)
          for (const v of prompt.versions) versionIds.push(v.id);
    }
  }

  if (versionIds.length === 0) return c.json([1,2,3,4,5].map(r => ({ rating: r, count: 0 })));

  const rows = await db
    .select({ rating: metrics.rating, count: count() })
    .from(metrics)
    .where(and(inArray(metrics.promptVersionId, versionIds), sql`${metrics.rating} IS NOT NULL`))
    .groupBy(metrics.rating)
    .orderBy(metrics.rating);

  const ratingMap = new Map(rows.map((r) => [r.rating, Number(r.count)]));
  return c.json([1,2,3,4,5].map(r => ({ rating: r, count: ratingMap.get(r) || 0 })));
});

export default app;
