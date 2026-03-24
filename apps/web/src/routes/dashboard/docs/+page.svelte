<script lang="ts">
  import { onMount } from "svelte";

  // ── Code snippets stored as plain strings to bypass Svelte's template parser ──
  const code = {
    install: `npm install @promptvcs/sdk
# or
yarn add @promptvcs/sdk`,

    init: `import PromptClient from '@promptvcs/sdk'

const client = new PromptClient({
  apiKey: process.env.PROMPTVCS_API_KEY, // starts with pvcs_
  baseUrl: 'https://api.promptvcs.dev',  // optional
})`,

    getPrompt: `const prompt = await client.get('my-prompt')

// prompt.content    — the raw prompt text
// prompt.id         — the version ID (needed for tracking)
// prompt.versionTag — e.g. "v1.2"
// prompt.variables  — array of detected template variables`,

    getPromptEnv: `// Fetch the staging version
const prompt = await client.get('my-prompt', { environment: 'staging' })

// Fetch a specific tagged version
const prompt = await client.get('my-prompt', { version: 'v2.0' })`,

    format: `const prompt = await client.get('customer-email')
// prompt.content = "Dear {{name}}, your order {{orderId}} is ready."

const message = client.format(prompt.content, {
  name: 'Alice',
  orderId: '#8821',
})
// → "Dear Alice, your order #8821 is ready."`,

    run: `import PromptClient from '@promptvcs/sdk'
import OpenAI from 'openai'

const client = new PromptClient({ apiKey: process.env.PROMPTVCS_API_KEY })
const openai = new OpenAI()

const { response, latencyMs, tokenCount, autoRating } = await client.run(
  'my-prompt',
  (content) => openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content }],
  })
)

// response    — the raw OpenAI response object
// latencyMs   — measured time from call start to finish
// tokenCount  — auto-extracted from response.usage.total_tokens
// autoRating  — 1–5 computed from speed + efficiency`,

    runAnthropic: `// Anthropic Claude
const { response } = await client.run(
  'my-prompt',
  (content) => anthropic.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 1024,
    messages: [{ role: 'user', content }],
  })
)
// Anthropic usage.input_tokens / output_tokens auto-detected ✅`,

    trackAuto: `const prompt = await client.get('my-prompt')

const start = Date.now()
const llmResponse = await myLLMCall(prompt.content)
const latencyMs = Date.now() - start

// Extracts tokens from any provider format, computes rating automatically
await client.trackAuto(prompt.id, llmResponse, latencyMs)

// With explicit rating override:
await client.trackAuto(prompt.id, llmResponse, latencyMs, {
  rating: 5,
  metadata: { userId: 'user_123', feature: 'chatbot' },
})`,

    track: `await client.track({
  promptVersionId: prompt.id,  // required
  latencyMs: 312,              // ms from call start to finish
  tokenCount: 450,             // total tokens consumed
  promptTokens: 120,           // optional breakdown
  completionTokens: 330,       // optional breakdown
  rating: 4,                   // 1–5 manual rating
  metadata: {                  // any JSON you want to store
    userId: 'u_abc',
    experiment: 'test-v2',
  },
})`,

    variables: `You are a helpful assistant for {{companyName}}.
The user's name is {{userName}}.
Respond in {{language}}.`,

    formatVars: `const filled = client.format(prompt.content, {
  companyName: 'Acme',
  userName: 'Alice',
  language: 'French',
})`,

    getEnv: `// Fetches the currently deployed production version
const prompt = await client.get('my-prompt')

// Fetches the staging deployment
const prompt = await client.get('my-prompt', { environment: 'staging' })`,

    experimentAssign: `const variant = await client.getVariant('email-tone-test', userId)

// variant.variantName  — "control" or your treatment name
// variant.isControl    — boolean
// variant.prompt       — the prompt content for this variant

const result = await myLLM(variant.prompt.content)`,

    latency: `const start = Date.now()
const response = await openai.chat.completions.create({...})
const latencyMs = Date.now() - start

await client.track({ promptVersionId: prompt.id, latencyMs })`,

    apiKeyHeader: `Authorization: Bearer pvcs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,

    metricsSchema: `{
  promptVersionId: string,  // required — version UUID
  latencyMs?: number,       // milliseconds
  tokenCount?: number,      // total tokens
  promptTokens?: number,
  completionTokens?: number,
  rating?: 1|2|3|4|5,
  metadata?: object,
}`,

    experimentSchema: `{
  experimentName: string,    // exact experiment name
  userIdentifier: string,    // any stable user ID
}`,
  };

  // HTML-escape everything to avoid XSS through {@ html}
  function esc(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  const sections = [
    { id: "introduction", title: "Introduction", icon: "🚀", items: [
      { id: "what-is-promptvcs", label: "What is PromptVCS?" },
      { id: "core-concepts", label: "Core Concepts" },
      { id: "quick-start", label: "Quick Start" },
    ]},
    { id: "sdk", title: "SDK", icon: "📦", items: [
      { id: "sdk-install", label: "Installation" },
      { id: "sdk-init", label: "Initialization" },
      { id: "sdk-get-prompt", label: "Fetching Prompts" },
      { id: "sdk-format", label: "Formatting Variables" },
      { id: "sdk-run", label: "Auto-Tracking with run()" },
      { id: "sdk-track-auto", label: "trackAuto()" },
      { id: "sdk-track", label: "Manual track()" },
      { id: "sdk-rating", label: "Auto-Rating Formula" },
    ]},
    { id: "workspaces", title: "Workspaces", icon: "🗂️", items: [
      { id: "workspaces-overview", label: "Overview" },
      { id: "workspaces-members", label: "Members & Roles" },
    ]},
    { id: "projects", title: "Projects", icon: "📁", items: [
      { id: "projects-overview", label: "Overview" },
      { id: "projects-create", label: "Creating Projects" },
    ]},
    { id: "prompts", title: "Prompts & Versions", icon: "📝", items: [
      { id: "prompts-overview", label: "Overview" },
      { id: "prompts-versions", label: "Versioning" },
      { id: "prompts-variables", label: "Template Variables" },
      { id: "prompts-deploy", label: "Deployments" },
    ]},
    { id: "experiments", title: "Experiments", icon: "🧪", items: [
      { id: "experiments-overview", label: "Overview" },
      { id: "experiments-variants", label: "Variants & Traffic" },
      { id: "experiments-assign", label: "SDK Assignment" },
    ]},
    { id: "analytics", title: "Analytics", icon: "📊", items: [
      { id: "analytics-overview", label: "Overview" },
      { id: "analytics-latency", label: "Latency" },
      { id: "analytics-tokens", label: "Token Counts" },
      { id: "analytics-ratings", label: "Ratings" },
    ]},
    { id: "api-keys", title: "API Keys", icon: "🔑", items: [
      { id: "apikeys-overview", label: "Overview" },
      { id: "apikeys-create", label: "Creating Keys" },
      { id: "apikeys-auth", label: "Authentication" },
    ]},
    { id: "api-reference", title: "REST API", icon: "📡", items: [
      { id: "api-prompts", label: "Prompts API" },
      { id: "api-metrics", label: "Metrics API" },
      { id: "api-experiments", label: "Experiments API" },
      { id: "api-analytics", label: "Analytics API" },
    ]},
  ];

  let activeSection = "what-is-promptvcs";

  function scrollTo(id: string) {
    activeSection = id;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) activeSection = entry.target.id;
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    const allIds = sections.flatMap(s => s.items.map(i => i.id));
    allIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  });
</script>

<svelte:head><title>Documentation — PromptVCS</title></svelte:head>

<div class="w-full max-w-7xl mx-auto flex gap-8 min-h-screen">

  <!-- ── Left Nav ── -->
  <aside class="hidden lg:block w-60 flex-shrink-0">
    <div class="sticky top-8 overflow-y-auto max-h-[calc(100vh-8rem)] pr-2 hide-scrollbar">
      <div class="mb-6">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1">Docs</p>
        <h2 class="text-lg font-bold text-white">PromptVCS</h2>
      </div>
      <nav class="space-y-5">
        {#each sections as section}
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2 flex items-center gap-1.5">
              <span>{section.icon}</span> {section.title}
            </p>
            <ul class="space-y-0.5">
              {#each section.items as item}
                <li>
                  <button
                    on:click={() => scrollTo(item.id)}
                    class="w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200
                      {activeSection === item.id
                        ? 'bg-brand-300/10 text-brand-300 font-medium'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}"
                  >{item.label}</button>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </nav>
    </div>
  </aside>

  <!-- ── Content ── -->
  <main class="flex-1 min-w-0 pb-40">

    <!-- INTRODUCTION -->
    <div class="mb-12">
      <p class="text-xs font-semibold uppercase tracking-widest text-brand-300/80 mb-2">Introduction</p>
    </div>

    <section id="what-is-promptvcs" class="doc-section">
      <h2 class="doc-h2">What is PromptVCS?</h2>
      <p class="doc-p">PromptVCS is a <strong>prompt management and observability platform</strong> for AI applications. It gives teams a centralized place to write, version, deploy, and monitor the prompts that power their LLM features — without littering them across notebooks, environment variables, or codebases.</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {#each [
          { icon: "📝", title: "Version Control", desc: "Track every change to every prompt. Roll back, compare, and deploy specific versions to specific environments." },
          { icon: "📊", title: "Observability", desc: "Auto-capture latency, token counts, and quality ratings from every LLM call with a single line of code." },
          { icon: "🧪", title: "Experiments", desc: "A/B test prompt variants with deterministic user assignment and real traffic splitting." },
        ] as card}
          <div class="bg-surface-900 border border-surface-800 rounded-2xl p-4">
            <span class="text-2xl">{card.icon}</span>
            <h3 class="text-white font-semibold mt-2 mb-1">{card.title}</h3>
            <p class="text-zinc-500 text-sm">{card.desc}</p>
          </div>
        {/each}
      </div>
    </section>

    <section id="core-concepts" class="doc-section">
      <h2 class="doc-h2">Core Concepts</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-800">
              <th class="text-left text-zinc-500 font-medium pb-3 pr-6">Concept</th>
              <th class="text-left text-zinc-500 font-medium pb-3">Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800/60">
            {#each [
              ["Workspace", "The top-level container. A team or organisation owns a workspace. All projects, prompts, and API keys live inside a workspace."],
              ["Project", "A logical grouping of related prompts within a workspace."],
              ["Prompt", "A named, sluggable template. A prompt has many versions over its lifetime."],
              ["Version", "A snapshot of a prompt's content at a point in time. Versions are immutable once created."],
              ["Deployment", "Links a version to an environment (development / staging / production). The SDK fetches the deployed version."],
              ["Metric", "A datapoint recorded for a single LLM call — latency, token count, and rating."],
              ["Experiment", "Compares two or more prompt versions with real traffic, using deterministic user-bucket assignment."],
            ] as [term, desc]}
              <tr>
                <td class="py-3 pr-6 font-mono text-brand-300 text-xs align-top whitespace-nowrap">{term}</td>
                <td class="py-3 text-zinc-400">{desc}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <section id="quick-start" class="doc-section">
      <h2 class="doc-h2">Quick Start</h2>
      <ol class="space-y-4 list-none">
        {#each [
          ["Create a workspace", "Go to the dashboard and create your first workspace."],
          ["Create a project", "Inside the workspace, create a project to group your prompts."],
          ["Write & version your prompt", "Create a prompt with a unique slug. Write the first version."],
          ["Deploy to production", "Deploy the version so the SDK can fetch it."],
          ["Generate an API key", "Go to Settings → API Keys and generate a key."],
          ["Install the SDK", "npm install @promptvcs/sdk — wrap your LLM call with client.run()."],
        ] as [title, desc], i}
          <li class="flex items-start gap-4">
            <span class="flex-shrink-0 w-7 h-7 rounded-full bg-brand-300/15 text-brand-300 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
            <div>
              <p class="text-white font-medium text-sm">{title}</p>
              <p class="text-zinc-500 text-sm mt-0.5">{desc}</p>
            </div>
          </li>
        {/each}
      </ol>
    </section>

    <!-- SDK -->
    <div class="doc-chapter-header">
      <p class="text-xs font-semibold uppercase tracking-widest text-brand-300/80 mb-2">SDK</p>
    </div>

    <section id="sdk-install" class="doc-section">
      <h2 class="doc-h2">Installation</h2>
      <p class="doc-p">Install the PromptVCS SDK from npm. Zero dependencies, works in Node.js, Bun, Deno, and edge runtimes.</p>
      <pre class="doc-code">{@html esc(code.install)}</pre>
    </section>

    <section id="sdk-init" class="doc-section">
      <h2 class="doc-h2">Initialization</h2>
      <p class="doc-p">Create a single shared client instance:</p>
      <pre class="doc-code">{@html esc(code.init)}</pre>
      <div class="doc-callout mt-4">
        <p class="font-medium text-white mb-1">Keep your API key secret</p>
        <p class="text-sm text-zinc-400">Never embed API keys in client-side code. Always use environment variables on the server.</p>
      </div>
    </section>

    <section id="sdk-get-prompt" class="doc-section">
      <h2 class="doc-h2">Fetching Prompts</h2>
      <p class="doc-p">Fetch a prompt by slug. Returns the version deployed to <code class="doc-inline-code">production</code> by default:</p>
      <pre class="doc-code">{@html esc(code.getPrompt)}</pre>
      <p class="doc-p mt-4">Override environment or version:</p>
      <pre class="doc-code">{@html esc(code.getPromptEnv)}</pre>
    </section>

    <section id="sdk-format" class="doc-section">
      <h2 class="doc-h2">Formatting Variables</h2>
      <p class="doc-p">Use <code class="doc-inline-code">&#123;&#123;variableName&#125;&#125;</code> placeholders in prompt content. Use <code class="doc-inline-code">client.format()</code> to substitute them:</p>
      <pre class="doc-code">{@html esc(code.format)}</pre>
    </section>

    <section id="sdk-run" class="doc-section">
      <h2 class="doc-h2">Auto-Tracking with run()</h2>
      <p class="doc-p"><code class="doc-inline-code">client.run()</code> is the recommended API. It fetches the prompt, calls your LLM, and auto-tracks latency, tokens, and rating — all in one call.</p>
      <pre class="doc-code">{@html esc(code.run)}</pre>
      <p class="doc-p mt-4">Works identically with Anthropic, Google Gemini, or any provider:</p>
      <pre class="doc-code">{@html esc(code.runAnthropic)}</pre>
      <div class="doc-callout mt-4">
        <p class="font-medium text-white mb-1">Non-blocking tracking</p>
        <p class="text-sm text-zinc-400">Metrics are sent fire-and-forget. A tracking failure will never block the LLM response.</p>
      </div>
    </section>

    <section id="sdk-track-auto" class="doc-section">
      <h2 class="doc-h2">trackAuto()</h2>
      <p class="doc-p">When you manage the LLM call yourself, <code class="doc-inline-code">trackAuto()</code> auto-extracts tokens and computes a rating:</p>
      <pre class="doc-code">{@html esc(code.trackAuto)}</pre>
    </section>

    <section id="sdk-track" class="doc-section">
      <h2 class="doc-h2">Manual track()</h2>
      <p class="doc-p">For full control, provide all values explicitly:</p>
      <pre class="doc-code">{@html esc(code.track)}</pre>
    </section>

    <section id="sdk-rating" class="doc-section">
      <h2 class="doc-h2">Auto-Rating Formula</h2>
      <p class="doc-p">A 1–5 quality score computed from two equal signals:</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <p class="text-sm font-semibold text-white mb-3">Latency Score (50%)</p>
          <table class="w-full text-sm">
            <thead><tr class="border-b border-surface-800"><th class="text-left text-zinc-500 font-medium pb-2">Latency</th><th class="text-right text-zinc-500 font-medium pb-2">Score</th></tr></thead>
            <tbody class="divide-y divide-surface-800/40">
              {#each [["< 200ms","5 ⭐"],["200–500ms","4 ⭐"],["500–1000ms","3 ⭐"],["1000–2000ms","2 ⭐"],["> 2000ms","1 ⭐"]] as [r,s]}
                <tr><td class="py-1.5 text-zinc-400 font-mono text-xs">{r}</td><td class="py-1.5 text-right text-zinc-300 text-xs">{s}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div>
          <p class="text-sm font-semibold text-white mb-3">Efficiency Score (50%) — tokens/sec</p>
          <table class="w-full text-sm">
            <thead><tr class="border-b border-surface-800"><th class="text-left text-zinc-500 font-medium pb-2">Throughput</th><th class="text-right text-zinc-500 font-medium pb-2">Score</th></tr></thead>
            <tbody class="divide-y divide-surface-800/40">
              {#each [["> 100 t/s","5 ⭐"],["50–100 t/s","4 ⭐"],["25–50 t/s","3 ⭐"],["10–25 t/s","2 ⭐"],["< 10 t/s","1 ⭐"]] as [r,s]}
                <tr><td class="py-1.5 text-zinc-400 font-mono text-xs">{r}</td><td class="py-1.5 text-right text-zinc-300 text-xs">{s}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
      <p class="text-sm text-zinc-500 mt-4">Final = <code class="doc-inline-code">Math.round((latencyScore + efficiencyScore) / 2)</code></p>
    </section>

    <!-- WORKSPACES -->
    <div class="doc-chapter-header">
      <p class="text-xs font-semibold uppercase tracking-widest text-brand-300/80 mb-2">Workspaces</p>
    </div>

    <section id="workspaces-overview" class="doc-section">
      <h2 class="doc-h2">Overview</h2>
      <p class="doc-p">A <strong>workspace</strong> is the top-level container. It maps to an organisation or team. Every project, prompt, deployment, API key, and experiment is scoped to a workspace.</p>
    </section>

    <section id="workspaces-members" class="doc-section">
      <h2 class="doc-h2">Members & Roles</h2>
      <p class="doc-p">Each user added to a workspace becomes a member. API keys generated inside the workspace are scoped to it — they can only access prompts and metrics belonging to that workspace.</p>
    </section>

    <!-- PROJECTS -->
    <div class="doc-chapter-header">
      <p class="text-xs font-semibold uppercase tracking-widest text-brand-300/80 mb-2">Projects</p>
    </div>

    <section id="projects-overview" class="doc-section">
      <h2 class="doc-h2">Overview</h2>
      <p class="doc-p">Projects are organizational folders inside a workspace. For example, a <em>Customer Support</em> project might hold prompts for email replies, ticket classification, and FAQ answers.</p>
    </section>

    <section id="projects-create" class="doc-section">
      <h2 class="doc-h2">Creating Projects</h2>
      <ul class="doc-ul">
        <li>From the <strong>Projects</strong> page — click "+ New Project"</li>
        <li>From the <strong>Prompts</strong> page — click "+ New Project" inline</li>
      </ul>
    </section>

    <!-- PROMPTS -->
    <div class="doc-chapter-header">
      <p class="text-xs font-semibold uppercase tracking-widest text-brand-300/80 mb-2">Prompts & Versions</p>
    </div>

    <section id="prompts-overview" class="doc-section">
      <h2 class="doc-h2">Overview</h2>
      <p class="doc-p">A <strong>prompt</strong> is a named, versioned template identified by a unique <strong>slug</strong> (e.g. <code class="doc-inline-code">customer-reply</code>). The SDK uses the slug to fetch the prompt at runtime.</p>
    </section>

    <section id="prompts-versions" class="doc-section">
      <h2 class="doc-h2">Versioning</h2>
      <p class="doc-p">Every save creates a new <strong>immutable version</strong> numbered sequentially (<code class="doc-inline-code">v1</code>, <code class="doc-inline-code">v2</code>, …). Old versions are never deleted — you can view or redeploy them from the prompt detail page.</p>
    </section>

    <section id="prompts-variables" class="doc-section">
      <h2 class="doc-h2">Template Variables</h2>
      <p class="doc-p">Use <code class="doc-inline-code">&#123;&#123;variableName&#125;&#125;</code> syntax inside prompt content for dynamic placeholders. PromptVCS auto-detects and lists them on the version card.</p>
      <pre class="doc-code">{@html esc(code.variables)}</pre>
      <p class="doc-p mt-3">Fill them at runtime with <code class="doc-inline-code">client.format()</code>:</p>
      <pre class="doc-code">{@html esc(code.formatVars)}</pre>
    </section>

    <section id="prompts-deploy" class="doc-section">
      <h2 class="doc-h2">Deployments</h2>
      <p class="doc-p">A <strong>deployment</strong> links a version to <code class="doc-inline-code">development</code>, <code class="doc-inline-code">staging</code>, or <code class="doc-inline-code">production</code>. Only one version per environment is active at a time. To update what users see, deploy a different version — no code change needed.</p>
      <pre class="doc-code">{@html esc(code.getEnv)}</pre>
    </section>

    <!-- EXPERIMENTS -->
    <div class="doc-chapter-header">
      <p class="text-xs font-semibold uppercase tracking-widest text-brand-300/80 mb-2">Experiments</p>
    </div>

    <section id="experiments-overview" class="doc-section">
      <h2 class="doc-h2">Overview</h2>
      <p class="doc-p">Experiments compare two or more prompt versions with real traffic. Users are assigned <strong>deterministically</strong> — the same user always gets the same variant, with no database storage needed.</p>
    </section>

    <section id="experiments-variants" class="doc-section">
      <h2 class="doc-h2">Variants & Traffic Split</h2>
      <p class="doc-p">Each experiment has at least one <strong>control</strong> and one or more <strong>treatments</strong>. Traffic is allocated by percentage — all percentages must sum to 100.</p>
      <ul class="doc-ul">
        <li>Control (v1): 50%</li>
        <li>Treatment A (v2): 30%</li>
        <li>Treatment B (v3): 20%</li>
      </ul>
    </section>

    <section id="experiments-assign" class="doc-section">
      <h2 class="doc-h2">SDK Assignment</h2>
      <p class="doc-p">Use <code class="doc-inline-code">client.getVariant()</code>. The assignment is hashed from <code class="doc-inline-code">userIdentifier</code> — completely deterministic:</p>
      <pre class="doc-code">{@html esc(code.experimentAssign)}</pre>
    </section>

    <!-- ANALYTICS -->
    <div class="doc-chapter-header">
      <p class="text-xs font-semibold uppercase tracking-widest text-brand-300/80 mb-2">Analytics</p>
    </div>

    <section id="analytics-overview" class="doc-section">
      <h2 class="doc-h2">Overview</h2>
      <p class="doc-p">The Analytics dashboard shows aggregate metrics across workspaces. All data flows in via the SDK tracking methods. Includes requests over time, token usage, rating distribution, and a top-prompts performance table.</p>
    </section>

    <section id="analytics-latency" class="doc-section">
      <h2 class="doc-h2">Latency</h2>
      <p class="doc-p"><code class="doc-inline-code">latencyMs</code> is wall-clock time from LLM call start to response. Auto-measured by <code class="doc-inline-code">client.run()</code>. For manual tracking:</p>
      <pre class="doc-code">{@html esc(code.latency)}</pre>
    </section>

    <section id="analytics-tokens" class="doc-section">
      <h2 class="doc-h2">Token Counts</h2>
      <p class="doc-p">Tokens are auto-extracted from LLM response objects. Supported providers:</p>
      <div class="overflow-x-auto mt-4">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-surface-800"><th class="text-left text-zinc-500 font-medium pb-3">Provider</th><th class="text-left text-zinc-500 font-medium pb-3">Response field</th></tr></thead>
          <tbody class="divide-y divide-surface-800/60">
            {#each [
              ["OpenAI / Azure", "response.usage.total_tokens, prompt_tokens, completion_tokens"],
              ["Anthropic", "response.usage.input_tokens, output_tokens"],
              ["Google Gemini", "response.usageMetadata.totalTokenCount"],
              ["Raw / custom", "response.tokenCount, tokens, totalTokens, total_tokens"],
            ] as [provider, fields]}
              <tr>
                <td class="py-3 pr-6 font-medium text-zinc-300 whitespace-nowrap">{provider}</td>
                <td class="py-3 text-zinc-500 font-mono text-xs">{fields}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <section id="analytics-ratings" class="doc-section">
      <h2 class="doc-h2">Ratings</h2>
      <p class="doc-p">Ratings (1–5) can come from:</p>
      <ul class="doc-ul">
        <li><strong>Auto-computed</strong> — via the rating formula when using <code class="doc-inline-code">run()</code> or <code class="doc-inline-code">trackAuto()</code></li>
        <li><strong>Explicit</strong> — pass <code class="doc-inline-code">rating: 5</code> in <code class="doc-inline-code">track()</code> or as an override</li>
        <li><strong>User feedback</strong> — capture thumbs up/down and map to 1 or 5</li>
      </ul>
    </section>

    <!-- API KEYS -->
    <div class="doc-chapter-header">
      <p class="text-xs font-semibold uppercase tracking-widest text-brand-300/80 mb-2">API Keys</p>
    </div>

    <section id="apikeys-overview" class="doc-section">
      <h2 class="doc-h2">Overview</h2>
      <p class="doc-p">API keys authenticate SDK requests. Each key is scoped to a single workspace — it can only access prompts and submit metrics for that workspace.</p>
    </section>

    <section id="apikeys-create" class="doc-section">
      <h2 class="doc-h2">Creating Keys</h2>
      <p class="doc-p">Go to <strong>Settings → API Keys</strong> and click "Generate Key".</p>
      <div class="doc-callout border-red-500/20 bg-red-500/5 mt-4">
        <p class="font-medium text-red-400 mb-1">⚠ Copy immediately</p>
        <p class="text-sm text-zinc-400">The full key is only shown once. We store only a hash. If you lose it, generate a new one.</p>
      </div>
    </section>

    <section id="apikeys-auth" class="doc-section">
      <h2 class="doc-h2">Authentication</h2>
      <p class="doc-p">All SDK endpoints require the key in the Authorization header:</p>
      <pre class="doc-code">{@html esc(code.apiKeyHeader)}</pre>
    </section>

    <!-- REST API -->
    <div class="doc-chapter-header">
      <p class="text-xs font-semibold uppercase tracking-widest text-brand-300/80 mb-2">REST API Reference</p>
    </div>

    <section id="api-prompts" class="doc-section">
      <h2 class="doc-h2">Prompts API</h2>
      <div class="space-y-3">
        {#each [
          { m: "GET", p: "/api/sdk/prompts/:slug", d: "Fetch a prompt by slug. Bearer API key required.", q: "?environment=production&version=v2.0" },
          { m: "GET", p: "/api/prompts/", d: "List all prompts. Session auth required.", q: "" },
          { m: "GET", p: "/api/projects/workspace/:id", d: "List all projects in a workspace.", q: "" },
        ] as row}
          <div class="bg-surface-900 border border-surface-800 rounded-xl p-4">
            <div class="flex items-center gap-3 mb-1">
              <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">{row.m}</span>
              <code class="text-sm text-zinc-300">{row.p}</code>
            </div>
            <p class="text-sm text-zinc-500">{row.d}</p>
            {#if row.q}<p class="text-xs text-zinc-600 mt-1 font-mono">{row.q}</p>{/if}
          </div>
        {/each}
      </div>
    </section>

    <section id="api-metrics" class="doc-section">
      <h2 class="doc-h2">Metrics API</h2>
      <div class="bg-surface-900 border border-surface-800 rounded-xl p-4">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400">POST</span>
          <code class="text-sm text-zinc-300">/api/sdk/metrics</code>
        </div>
        <p class="text-sm text-zinc-500 mb-3">Record a metric. Bearer API key required.</p>
        <pre class="doc-code text-xs">{@html esc(code.metricsSchema)}</pre>
      </div>
    </section>

    <section id="api-experiments" class="doc-section">
      <h2 class="doc-h2">Experiments API</h2>
      <div class="bg-surface-900 border border-surface-800 rounded-xl p-4">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400">POST</span>
          <code class="text-sm text-zinc-300">/api/sdk/experiment/assign</code>
        </div>
        <p class="text-sm text-zinc-500 mb-3">Get a deterministic variant assignment for a user.</p>
        <pre class="doc-code text-xs">{@html esc(code.experimentSchema)}</pre>
      </div>
    </section>

    <section id="api-analytics" class="doc-section">
      <h2 class="doc-h2">Analytics API</h2>
      <div class="space-y-2">
        {#each [
          ["GET", "/api/analytics/global-overview", "Aggregate stats across all workspaces."],
          ["GET", "/api/analytics/overview", "Stats for one workspace. ?workspaceId required."],
          ["GET", "/api/analytics/requests-over-time", "Daily request counts. ?days=30"],
          ["GET", "/api/analytics/tokens-over-time", "Daily token usage. ?days=30"],
          ["GET", "/api/analytics/top-prompts", "Usage ranked by requests. ?workspaceId required."],
          ["GET", "/api/analytics/rating-distribution", "Count of 1–5 star ratings."],
          ["GET", "/api/analytics/latency-trend", "Daily avg latency for a prompt. ?promptId required."],
          ["GET", "/api/analytics/version-comparison", "Per-version stats. ?promptId required."],
        ] as [m, p, d]}
          <div class="bg-surface-900 border border-surface-800 rounded-xl p-3 flex items-start gap-3">
            <span class="text-xs font-bold px-2 py-0.5 rounded-md mt-0.5 flex-shrink-0 bg-emerald-500/15 text-emerald-400">{m}</span>
            <div>
              <code class="text-sm text-zinc-300">{p}</code>
              <p class="text-xs text-zinc-600 mt-0.5">{d}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>

  </main>
</div>

<style>
  .doc-section { margin-bottom: 3rem; scroll-margin-top: 2rem; }
  .doc-chapter-header { margin-top: 3.5rem; margin-bottom: 1.5rem; padding-top: 2rem; border-top: 1px solid rgba(39,39,42,0.6); }
  .doc-h2 { font-size: 1.25rem; font-weight: 700; color: white; margin-bottom: 0.75rem; }
  .doc-p { font-size: 0.9rem; line-height: 1.75; color: #a1a1aa; margin-bottom: 0.75rem; }
  .doc-p strong { color: #e4e4e7; }
  .doc-p em { color: #d4d4d8; }
  .doc-ul { list-style: disc; padding-left: 1.5rem; font-size: 0.875rem; color: #a1a1aa; margin-bottom: 0.75rem; }
  .doc-ul li { margin-bottom: 0.35rem; }
  .doc-ul strong { color: #e4e4e7; }
  .doc-code { background: #09090b; border: 1px solid #27272a; border-radius: 0.75rem; padding: 1rem; font-size: 0.8rem; font-family: ui-monospace, monospace; color: #a1a1aa; overflow-x: auto; white-space: pre; line-height: 1.6; }
  .doc-inline-code { background: rgba(180,242,0,0.1); color: #b4f200; padding: 0.1em 0.4em; border-radius: 0.3em; font-size: 0.85em; font-family: ui-monospace, monospace; }
  .doc-callout { background: rgba(180,242,0,0.04); border: 1px solid rgba(180,242,0,0.15); border-radius: 0.75rem; padding: 1rem; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
