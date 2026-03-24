import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["owner", "admin", "editor", "viewer"]);
export const environmentEnum = pgEnum("environment", ["development", "staging", "production"]);

// Users (managed by better-auth)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspaces
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workspace Members
export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Projects
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Prompts
export const prompts = pgTable("prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Prompt Versions
export const promptVersions = pgTable("prompt_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  promptId: uuid("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  versionTag: text("version_tag").notNull(), // e.g. "v1.0", "v1.1"
  versionNumber: integer("version_number").notNull(),
  variables: jsonb("variables").$type<string[]>().default([]),
  commitMessage: text("commit_message"),
  model: text("model"),
  temperature: text("temperature"),
  systemPrompt: text("system_prompt"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Deployments
export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  promptVersionId: uuid("prompt_version_id").notNull().references(() => promptVersions.id),
  environment: environmentEnum("environment").notNull(),
  deployedBy: text("deployed_by").notNull().references(() => users.id),
  deployedAt: timestamp("deployed_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

// API Keys
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(), // first 8 chars for display
  lastUsedAt: timestamp("last_used_at"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
});

// Metrics
export const metrics = pgTable("metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  promptVersionId: uuid("prompt_version_id").notNull().references(() => promptVersions.id),
  latencyMs: integer("latency_ms"),
  tokenCount: integer("token_count"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  rating: integer("rating"), // 1-5
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  projects: many(projects),
  apiKeys: many(apiKeys),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [projects.workspaceId], references: [workspaces.id] }),
  prompts: many(prompts),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  project: one(projects, { fields: [prompts.projectId], references: [projects.id] }),
  versions: many(promptVersions),
}));

export const promptVersionsRelations = relations(promptVersions, ({ one, many }) => ({
  prompt: one(prompts, { fields: [promptVersions.promptId], references: [prompts.id] }),
  deployments: many(deployments),
  metrics: many(metrics),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  promptVersion: one(promptVersions, { fields: [deployments.promptVersionId], references: [promptVersions.id] }),
}));

export const metricsRelations = relations(metrics, ({ one }) => ({
  promptVersion: one(promptVersions, { fields: [metrics.promptVersionId], references: [promptVersions.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  workspace: one(workspaces, { fields: [apiKeys.workspaceId], references: [workspaces.id] }),
}));

// ─── A/B Testing ──────────────────────────────────────────────────────────

export const experimentStatusEnum = pgEnum("experiment_status", ["draft", "running", "completed", "archived"]);

export const experiments = pgTable("experiments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  promptId: uuid("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: experimentStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by").notNull().references(() => users.id),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const experimentVariants = pgTable("experiment_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  experimentId: uuid("experiment_id").notNull().references(() => experiments.id, { onDelete: "cascade" }),
  promptVersionId: uuid("prompt_version_id").notNull().references(() => promptVersions.id),
  name: text("name").notNull(), // e.g. "Control", "Variant A"
  trafficPercent: integer("traffic_percent").notNull().default(50), // 0-100, all variants must sum to 100
  isControl: boolean("is_control").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const experimentAssignments = pgTable("experiment_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  experimentId: uuid("experiment_id").notNull().references(() => experiments.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => experimentVariants.id),
  userIdentifier: text("user_identifier").notNull(), // hashed user id or anonymous id
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const experimentsRelations = relations(experiments, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [experiments.workspaceId], references: [workspaces.id] }),
  prompt: one(prompts, { fields: [experiments.promptId], references: [prompts.id] }),
  variants: many(experimentVariants),
}));

export const experimentVariantsRelations = relations(experimentVariants, ({ one, many }) => ({
  experiment: one(experiments, { fields: [experimentVariants.experimentId], references: [experiments.id] }),
  promptVersion: one(promptVersions, { fields: [experimentVariants.promptVersionId], references: [promptVersions.id] }),
  assignments: many(experimentAssignments),
}));

export const experimentAssignmentsRelations = relations(experimentAssignments, ({ one }) => ({
  experiment: one(experiments, { fields: [experimentAssignments.experimentId], references: [experiments.id] }),
  variant: one(experimentVariants, { fields: [experimentAssignments.variantId], references: [experimentVariants.id] }),
}));
