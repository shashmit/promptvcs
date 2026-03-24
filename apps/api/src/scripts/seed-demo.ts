import { db } from "../db";
import {
  users, accounts, workspaces, workspaceMembers,
  projects, prompts, promptVersions, deployments,
  apiKeys, metrics, experiments, experimentVariants
} from "../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";

// Fixed UUIDs for demo data (user ID will be overwritten by Better Auth)
let IDS = {
  user:       "00000000-0000-0000-0000-000000000001",
  account:    "00000000-0000-0000-0000-000000000002",
  workspace:  "00000000-0000-0000-0000-000000000010",
  apiKey:     "00000000-0000-0000-0000-000000000020",
  project1:   "00000000-0000-0000-0000-000000000030",
  project2:   "00000000-0000-0000-0000-000000000031",
  prompt1:    "00000000-0000-0000-0000-000000000040",
  prompt2:    "00000000-0000-0000-0000-000000000041",
  prompt3:    "00000000-0000-0000-0000-000000000042",
  prompt4:    "00000000-0000-0000-0000-000000000043",
  v001:       "00000000-0000-0000-0000-000000000050",
  v002:       "00000000-0000-0000-0000-000000000051",
  v003:       "00000000-0000-0000-0000-000000000052",
  v004:       "00000000-0000-0000-0000-000000000053",
  v005:       "00000000-0000-0000-0000-000000000054",
  v006:       "00000000-0000-0000-0000-000000000055",
  v007:       "00000000-0000-0000-0000-000000000056",
  v008:       "00000000-0000-0000-0000-000000000057",
  d001:       "00000000-0000-0000-0000-000000000060",
  d002:       "00000000-0000-0000-0000-000000000061",
  d003:       "00000000-0000-0000-0000-000000000062",
  d004:       "00000000-0000-0000-0000-000000000063",
  d005:       "00000000-0000-0000-0000-000000000064",
  d006:       "00000000-0000-0000-0000-000000000065",
  exp1:       "00000000-0000-0000-0000-000000000070",
  ev1:        "00000000-0000-0000-0000-000000000071",
  ev2:        "00000000-0000-0000-0000-000000000072",
};

async function seed() {
  console.log("🌱 Seeding demo data...\n");

  // 1. User — use Better Auth's own sign-up so password is hashed correctly
  await db.delete(users).where(eq(users.email, "demo@promptvcs.dev")).catch(() => {});

  const signUpRes = await auth.api.signUpEmail({
    body: {
      name: "Demo User",
      email: "demo@promptvcs.dev",
      password: "demo1234",
    },
  });

  const createdUser = signUpRes?.user;
  if (!createdUser) throw new Error("Failed to create demo user");

  // Use the actual ID Better Auth assigned
  IDS.user = createdUser.id;
  console.log("✅ User: demo@promptvcs.dev / demo1234 (id:", IDS.user, ")");

  // 2. Workspace
  await db.insert(workspaces).values({
    id: IDS.workspace,
    name: "Demo Workspace",
    slug: "demo-workspace",
    ownerId: IDS.user,
  }).onConflictDoNothing();

  await db.insert(workspaceMembers).values({
    workspaceId: IDS.workspace,
    userId: IDS.user,
    role: "owner",
  }).onConflictDoNothing();
  console.log("✅ Workspace: Demo Workspace");

  // 3. API Key
  const rawKey = "pvcs_demo_key_12345678901234567890123456";
  const keyHash = await Bun.password.hash(rawKey);
  await db.insert(apiKeys).values({
    id: IDS.apiKey,
    workspaceId: IDS.workspace,
    name: "Demo API Key",
    keyHash,
    keyPrefix: "pvcs_demo",
    createdBy: IDS.user,
  }).onConflictDoNothing();
  console.log("✅ API Key: pvcs_demo_key_12345678901234567890123456");

  // 4. Projects
  await db.insert(projects).values([
    { id: IDS.project1, workspaceId: IDS.workspace, name: "Customer Support Bot", description: "AI prompts for customer support workflows", createdBy: IDS.user },
    { id: IDS.project2, workspaceId: IDS.workspace, name: "Content Generator", description: "Marketing and content creation prompts", createdBy: IDS.user },
  ]).onConflictDoNothing();
  console.log("✅ Projects: Customer Support Bot, Content Generator");

  // 5. Prompts
  await db.insert(prompts).values([
    { id: IDS.prompt1, projectId: IDS.project1, name: "Support Response", slug: "support-response", description: "Generates empathetic support replies", createdBy: IDS.user },
    { id: IDS.prompt2, projectId: IDS.project1, name: "Ticket Classifier", slug: "ticket-classifier", description: "Classifies support tickets by urgency", createdBy: IDS.user },
    { id: IDS.prompt3, projectId: IDS.project2, name: "Blog Post Writer", slug: "blog-post-writer", description: "Writes SEO-optimized blog posts", createdBy: IDS.user },
    { id: IDS.prompt4, projectId: IDS.project2, name: "Social Media Copy", slug: "social-media-copy", description: "Creates engaging social posts", createdBy: IDS.user },
  ]).onConflictDoNothing();
  console.log("✅ Prompts: 4 prompts");

  // 6. Versions
  await db.insert(promptVersions).values([
    { id: IDS.v001, promptId: IDS.prompt1, versionNumber: 1, versionTag: "v1.0", content: "You are a customer support agent. Answer the following query professionally:\n\n{{query}}", systemPrompt: "You are a helpful customer support agent.", commitMessage: "Initial version", variables: ["query"], createdBy: IDS.user },
    { id: IDS.v002, promptId: IDS.prompt1, versionNumber: 2, versionTag: "v2.0", content: "You are a friendly and empathetic customer support agent at {{company}}.\n\nCustomer query: {{query}}\n\nRespond with empathy, acknowledge their issue, and provide a clear solution. Keep your response under 150 words.", systemPrompt: "You are a warm, professional customer support specialist. Always start with empathy.", commitMessage: "Added empathy + word limit", variables: ["query", "company"], createdBy: IDS.user },
    { id: IDS.v003, promptId: IDS.prompt1, versionNumber: 3, versionTag: "v3.0", content: "You are a senior customer support specialist at {{company}}.\n\nCustomer: {{customer_name}}\nQuery: {{query}}\nAccount tier: {{tier}}\n\nProvide a personalized, solution-focused response. Premium accounts get expedited options. Keep under 120 words.", systemPrompt: "You are an expert support specialist. Personalize every response.", commitMessage: "Personalization + account tier handling", variables: ["query", "company", "customer_name", "tier"], createdBy: IDS.user },
    { id: IDS.v004, promptId: IDS.prompt2, versionNumber: 1, versionTag: "v1.0", content: 'Classify this support ticket:\n{{ticket}}\n\nReturn JSON: {"category": "billing|technical|general", "urgency": "low|medium|high"}', commitMessage: "Initial classifier", variables: ["ticket"], createdBy: IDS.user },
    { id: IDS.v005, promptId: IDS.prompt2, versionNumber: 2, versionTag: "v2.0", content: 'Analyze this support ticket:\n\nTicket: {{ticket}}\n\nReturn valid JSON:\n{\n  "category": "billing|technical|account|general|refund",\n  "urgency": "low|medium|high|critical",\n  "sentiment": "positive|neutral|negative|angry",\n  "estimated_resolution_time": "<1h|1-4h|1d|>1d"\n}', commitMessage: "Added sentiment + resolution time", variables: ["ticket"], createdBy: IDS.user },
    { id: IDS.v006, promptId: IDS.prompt3, versionNumber: 1, versionTag: "v1.0", content: "Write a blog post about {{topic}} for {{audience}}. Length: {{word_count}} words.", commitMessage: "Initial version", variables: ["topic", "audience", "word_count"], createdBy: IDS.user },
    { id: IDS.v007, promptId: IDS.prompt3, versionNumber: 2, versionTag: "v2.0", content: "Write an SEO-optimized blog post:\n\nTopic: {{topic}}\nTarget audience: {{audience}}\nPrimary keyword: {{keyword}}\nWord count: {{word_count}}\nTone: {{tone}}\n\nStructure:\n1. Compelling H1 headline\n2. Hook opening paragraph\n3. 3-5 main sections with H2s\n4. Conclusion with CTA\n\nNaturally include the keyword 3-5 times.", commitMessage: "SEO structure + keyword optimization", variables: ["topic", "audience", "keyword", "word_count", "tone"], createdBy: IDS.user },
    { id: IDS.v008, promptId: IDS.prompt4, versionNumber: 1, versionTag: "v1.0", content: "Create social media posts for {{platform}} about: {{topic}}\n\nBrand voice: {{brand_voice}}\nInclude relevant hashtags. Optimize for engagement.", commitMessage: "Initial social copy generator", variables: ["platform", "topic", "brand_voice"], createdBy: IDS.user },
  ]).onConflictDoNothing();
  console.log("✅ Versions: 8 versions");

  // 7. Deployments
  await db.insert(deployments).values([
    { id: IDS.d001, promptVersionId: IDS.v003, environment: "production", deployedBy: IDS.user },
    { id: IDS.d002, promptVersionId: IDS.v002, environment: "staging", deployedBy: IDS.user },
    { id: IDS.d003, promptVersionId: IDS.v001, environment: "development", deployedBy: IDS.user },
    { id: IDS.d004, promptVersionId: IDS.v005, environment: "production", deployedBy: IDS.user },
    { id: IDS.d005, promptVersionId: IDS.v007, environment: "production", deployedBy: IDS.user },
    { id: IDS.d006, promptVersionId: IDS.v008, environment: "production", deployedBy: IDS.user },
  ]).onConflictDoNothing();
  console.log("✅ Deployments: 4 prompts live in production");

  // 8. Metrics (30 days)
  const metricsRecords: any[] = [];
  const now = Date.now();
  const configs = [
    { id: IDS.v001, baseLatency: 420, baseRating: 3.2, dailyAvg: 8 },
    { id: IDS.v002, baseLatency: 380, baseRating: 3.9, dailyAvg: 25 },
    { id: IDS.v003, baseLatency: 290, baseRating: 4.6, dailyAvg: 65 },
    { id: IDS.v004, baseLatency: 180, baseRating: 3.5, dailyAvg: 15 },
    { id: IDS.v005, baseLatency: 150, baseRating: 4.2, dailyAvg: 48 },
    { id: IDS.v006, baseLatency: 650, baseRating: 3.7, dailyAvg: 10 },
    { id: IDS.v007, baseLatency: 580, baseRating: 4.4, dailyAvg: 32 },
    { id: IDS.v008, baseLatency: 310, baseRating: 4.1, dailyAvg: 22 },
  ];

  for (const cfg of configs) {
    for (let day = 29; day >= 0; day--) {
      const trend = (30 - day) / 30;
      const count = Math.floor(cfg.dailyAvg * (0.7 + trend * 0.6) + Math.random() * 5);
      for (let i = 0; i < count; i++) {
        const ts = new Date(now - day * 86400000 - Math.random() * 86400000);
        const ratingRoll = Math.random();
        metricsRecords.push({
          promptVersionId: cfg.id,
          latencyMs: Math.floor(cfg.baseLatency * (0.8 + Math.random() * 0.4)),
          tokenCount: Math.floor(Math.random() * 400 + 80),
          promptTokens: Math.floor(Math.random() * 150 + 40),
          completionTokens: Math.floor(Math.random() * 250 + 40),
          rating: ratingRoll > 0.25 ? Math.min(5, Math.max(1, Math.round(cfg.baseRating + (Math.random() - 0.4)))) : null,
          createdAt: ts,
        });
      }
    }
  }

  for (let i = 0; i < metricsRecords.length; i += 200) {
    await db.insert(metrics).values(metricsRecords.slice(i, i + 200));
  }
  console.log(`✅ Metrics: ${metricsRecords.length} records over 30 days`);

  // 9. Experiment
  await db.insert(experiments).values({
    id: IDS.exp1,
    workspaceId: IDS.workspace,
    promptId: IDS.prompt1,
    name: "Support tone test",
    description: "Testing v2 empathetic tone vs v3 personalized approach",
    status: "running",
    startedAt: new Date(now - 7 * 86400000),
    createdBy: IDS.user,
  }).onConflictDoNothing();

  await db.insert(experimentVariants).values([
    { id: IDS.ev1, experimentId: IDS.exp1, promptVersionId: IDS.v002, name: "Control (v2)", trafficPercent: 50, isControl: true },
    { id: IDS.ev2, experimentId: IDS.exp1, promptVersionId: IDS.v003, name: "Personalized (v3)", trafficPercent: 50, isControl: false },
  ]).onConflictDoNothing();
  console.log("✅ Experiment: Support tone test (running)");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Demo seed complete!\n");
  console.log("📧 Email:    demo@promptvcs.dev");
  console.log("🔑 Password: demo1234");
  console.log("🌐 URL:      http://localhost:5173");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
