const API_URL = import.meta.env.PUBLIC_API_URL || "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Auth API (better-auth)
export const authApi = {
  signIn: (email: string, password: string) =>
    request("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signUp: (name: string, email: string, password: string) =>
    request("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  signOut: () => request("/api/auth/sign-out", { method: "POST" }),
  getSession: () => request<{ user: User; session: Session } | null>("/api/auth/get-session"),
};

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
}

export interface Prompt {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description?: string;
  versions: PromptVersion[];
  project?: {
    name: string;
    workspace: Workspace;
  };
}

export interface PromptVersion {
  id: string;
  promptId: string;
  content: string;
  versionTag: string;
  versionNumber: number;
  variables: string[];
  commitMessage?: string;
  model?: string;
  systemPrompt?: string;
  createdAt: string;
  deployments: Deployment[];
}

export interface Deployment {
  id: string;
  environment: "development" | "staging" | "production";
  isActive: boolean;
  deployedAt: string;
}
