# PromptVCS 🚀

**Prompts are the code of the AI era. Manage them like you manage your codebase.**

PromptVCS is a comprehensive platform for version controlling, analyzing, and deploying LLM prompts. It provides a beautiful dashboard, a developer-friendly SDK, and robust analytics to help you iterate on your AI features with confidence.

## ✨ Key Features

- **Prompt Versioning**: Track every change, tag versions, and rollback when needed.
- **Analytics Dashboard**: Monitor latency, token usage, and quality ratings in real-time.
- **A/B Testing**: Deterministically assign variants and track their performance.
- **Client SDK**: Seamlessly fetch prompts and track performance in your application.
- **Monorepo Architecture**: High-velocity development with Bun and Turborepo.
- **Modern Tech**: Built with Svelte 5 (Runes) and Hono for maximum performance.

## 🛠 Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Mono-repo Tools**: [Turborepo](https://turbo.build)
- **Frontend Framework**: [SvelteKit](https://kit.svelte.dev) (v5 with Runes)
- **Backend Framework**: [Hono](https://hono.dev)
- **Database**: [PostgreSQL (Neon)](https://neon.tech)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team)
- **Authentication**: [Better Auth](https://better-auth.com)
- **Validator**: [Zod](https://zod.dev)

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed.
- A Neon PostgreSQL database or a local Postgres instance.

### Installation

1. Copy this repository to your local machine.
2. Install dependencies:
   ```bash
   bun install
   ```

### Configuration

Create `.env` files in the following locations:

**`apps/api/.env`**
```env
DATABASE_URL=your_postgres_connection_string
PORT=3001
FRONTEND_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=any_long_secret_string
```

**`apps/web/.env`**
```env
# Optional: defaults to localhost:3001 if omitted in some parts of the code
# but good to have for consistency
PUBLIC_API_URL=http://localhost:3001/api
```

### Database Setup

Push the schema to your database:
```bash
bun db:push
```

### Running Locally

To start all services (API, Web, and SDK) in development mode:
```bash
bun dev
```

- **Dashboard**: `http://localhost:5173`
- **API**: `http://localhost:3001`
- **Health Check**: `http://localhost:3001/health`

## 📦 Project Structure

- `apps/web`: SvelteKit frontend dashboard for visualizing prompts and analytics.
- `apps/api`: Hono backend API providing workspace, project, and analytics endpoints.
- `packages/sdk`: TypeScript client SDK for easy integration into LLM-powered apps.

## 🤝 Contributing

We welcome contributions! Please check our [Contribution Guide](CONTRIBUTING.md) to get started.

## 📄 License

Internal use only / Proprietary (or specify your license here).
