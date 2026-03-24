<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import type { Workspace } from "$lib/api";
  import LineChart from "$lib/components/LineChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";

  // State
  let workspaces: Workspace[] = [];
  let selectedWorkspaceId = "";
  let selectedTimeRange = 30;
  let loading = true;
  let loadError = "";

  // Safe defaults — guarantee these are always valid objects/arrays
  const defaultOverview = { totalRequests: 0, avgLatencyMs: 0, avgRating: 0, totalTokens: 0, totalPrompts: 0, totalVersions: 0, requestsToday: 0, workspaceCount: 0 };
  let overview = { ...defaultOverview };
  let requestsOverTime: { date: string; count: number }[] = [];
  let tokensOverTime: { date: string; totalTokens: number; requests: number }[] = [];
  let topPrompts: { promptId: string; promptName: string; slug: string; requestCount: number; avgLatencyMs: number; avgRating: number }[] = [];
  let ratingDistribution: { rating: number; count: number }[] = [1,2,3,4,5].map(r => ({ rating: r, count: 0 }));

  onMount(async () => {
    try {
      workspaces = await api.get<Workspace[]>("/api/workspaces");
    } catch (e) { console.error("Failed to load workspaces", e); }
    await loadData();
  });

  async function loadData() {
    loading = true;
    loadError = "";

    // Build query params cleanly
    const wsQuery = selectedWorkspaceId ? `workspaceId=${encodeURIComponent(selectedWorkspaceId)}` : "";
    const daysQuery = `days=${selectedTimeRange}`;
    const sep = (q: string) => q ? `?${q}` : "";
    const join = (...parts: string[]) => parts.filter(Boolean).join("&");

    const overviewUrl = selectedWorkspaceId
      ? `/api/analytics/overview?${wsQuery}`
      : `/api/analytics/global-overview`;

    const roUrl  = `/api/analytics/requests-over-time?${join(wsQuery, daysQuery)}`;
    const tokUrl = `/api/analytics/tokens-over-time?${join(wsQuery, daysQuery)}`;
    const ratUrl = `/api/analytics/rating-distribution${sep(wsQuery)}`;
    const topUrl = selectedWorkspaceId ? `/api/analytics/top-prompts?workspaceId=${encodeURIComponent(selectedWorkspaceId)}&limit=8` : null;

    // Fetch each independently — never let one failure crash the whole page
    const safeGet = async <T>(url: string | null, fallback: T): Promise<T> => {
      if (!url) return fallback;
      try { return await api.get<T>(url); }
      catch (e) { console.error(`Analytics fetch failed: ${url}`, e); return fallback; }
    };

    try {
      [overview, requestsOverTime, tokensOverTime, topPrompts, ratingDistribution] = await Promise.all([
        safeGet(overviewUrl, { ...defaultOverview }),
        safeGet(roUrl,  [] as typeof requestsOverTime),
        safeGet(tokUrl, [] as typeof tokensOverTime),
        safeGet(topUrl, [] as typeof topPrompts),
        safeGet(ratUrl, [1,2,3,4,5].map(r => ({ rating: r, count: 0 })) as typeof ratingDistribution),
      ]);
    } catch (e) {
      loadError = "Failed to load analytics data.";
      console.error(e);
    } finally {
      loading = false;
    }
  }

  // Derived
  $: requestLabels = requestsOverTime.map(r => {
    const d = new Date(r.date + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  $: requestCounts = requestsOverTime.map(r => r.count);

  $: tokenLabels = tokensOverTime.map(r => {
    const d = new Date(r.date + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  $: tokenCounts = tokensOverTime.map(r => r.totalTokens);

  $: ratingLabels = ratingDistribution.map(r => `${r.rating}★`);
  $: ratingCounts = ratingDistribution.map(r => r.count);

  $: topPromptLabels = topPrompts.map(p => p.promptName.length > 16 ? p.promptName.slice(0, 14) + "…" : p.promptName);
  $: topPromptCounts = topPrompts.map(p => p.requestCount);
  $: topPromptLatencies = topPrompts.map(p => p.avgLatencyMs);

  $: hasRequests = requestCounts.some(c => c > 0);
  $: hasTokens = tokenCounts.some(c => c > 0);
  $: hasRatings = ratingCounts.some(c => c > 0);
  $: hasTopPrompts = topPrompts.length > 0 && topPromptCounts.some(c => c > 0);

  function fmtTokens(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return String(v ?? 0);
  }

  async function selectWorkspace(id: string) {
    selectedWorkspaceId = id;
    await loadData();
  }
</script>

<svelte:head><title>Analytics — PromptVCS</title></svelte:head>

<div class="w-full max-w-7xl mx-auto">

  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-start gap-4 mb-8">
    <div class="flex-1">
      <h1 class="section-title">Analytics</h1>
      <p class="section-subtitle">Track performance across {selectedWorkspaceId ? "the selected workspace" : "all your workspaces"}</p>
    </div>
    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Workspace selector -->
      <div class="flex gap-1 bg-surface-900 p-1 rounded-xl border border-surface-800 overflow-x-auto hide-scrollbar">
        <button
          on:click={() => selectWorkspace("")}
          class="px-3.5 py-1.5 text-sm rounded-lg whitespace-nowrap transition-all duration-200
            {selectedWorkspaceId === '' ? 'bg-brand-300 text-surface-950 font-medium shadow-glow-sm' : 'text-zinc-500 hover:text-zinc-300'}"
        >
          All
        </button>
        {#each workspaces as ws}
          <button
            on:click={() => selectWorkspace(ws.id)}
            class="px-3.5 py-1.5 text-sm rounded-lg whitespace-nowrap transition-all duration-200
              {selectedWorkspaceId === ws.id ? 'bg-brand-300 text-surface-950 font-medium shadow-glow-sm' : 'text-zinc-500 hover:text-zinc-300'}"
          >
            {ws.name}
          </button>
        {/each}
      </div>
      <!-- Time range -->
      <div class="flex gap-1 bg-surface-900 p-1 rounded-xl border border-surface-800">
        {#each [[7, "7d"], [14, "14d"], [30, "30d"]] as [days, label]}
          <button
            on:click={() => { selectedTimeRange = days; loadData(); }}
            class="px-3.5 py-1.5 text-sm rounded-lg transition-all duration-200
              {selectedTimeRange === days ? 'bg-surface-700 text-zinc-200 font-medium' : 'text-zinc-500 hover:text-zinc-300'}"
          >
            {label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  {#if loading}
    <!-- Skeleton -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {#each Array(4) as _}
        <div class="card animate-pulse h-28 bg-surface-800/50"></div>
      {/each}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card animate-pulse h-64 bg-surface-800/50"></div>
      <div class="card animate-pulse h-64 bg-surface-800/50"></div>
    </div>
  {:else}

    {#if loadError}
      <div class="card border-red-500/20 mb-6 flex items-center justify-between gap-4">
        <p class="text-sm text-red-400">{loadError}</p>
        <button on:click={loadData} class="btn-secondary text-xs">Retry</button>
      </div>
    {/if}

    <!-- ── Hero Stats ─────────────────────────────────────── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <!-- Big three -->
      <div class="card col-span-1 flex flex-col gap-1">
        <span class="text-xs text-zinc-500 uppercase tracking-widest">Requests</span>
        <span class="text-3xl font-bold text-white">{overview.totalRequests.toLocaleString()}</span>
        <span class="text-xs text-zinc-600 mt-1">{overview.requestsToday} today</span>
      </div>
      <div class="card col-span-1 flex flex-col gap-1">
        <span class="text-xs text-zinc-500 uppercase tracking-widest">Tokens Used</span>
        <span class="text-3xl font-bold text-white">{fmtTokens(overview.totalTokens)}</span>
        <span class="text-xs text-zinc-600 mt-1">Cumulative</span>
      </div>
      <div class="card col-span-1 flex flex-col gap-1">
        <span class="text-xs text-zinc-500 uppercase tracking-widest">Avg Latency</span>
        <span class="text-3xl font-bold {overview.avgLatencyMs === 0 ? 'text-zinc-600' : overview.avgLatencyMs < 300 ? 'text-emerald-400' : overview.avgLatencyMs < 700 ? 'text-brand-300' : 'text-red-400'}">
          {overview.avgLatencyMs ? `${overview.avgLatencyMs}ms` : "—"}
        </span>
        <span class="text-xs text-zinc-600 mt-1">across all calls</span>
      </div>
      <div class="card col-span-1 flex flex-col gap-1">
        <span class="text-xs text-zinc-500 uppercase tracking-widest">Avg Rating</span>
        <span class="text-3xl font-bold text-white">{overview.avgRating ? `${overview.avgRating}/5` : "—"}</span>
        <span class="text-xs text-zinc-600 mt-1">{overview.avgRating ? "⭐".repeat(Math.round(overview.avgRating)) : "No ratings yet"}</span>
      </div>
    </div>

    <!-- Sub stats -->
    <div class="grid grid-cols-3 gap-3 mb-8">
      <div class="bg-surface-900/60 border border-surface-800 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span class="text-xl">📝</span>
        <div>
          <p class="text-lg font-semibold text-white">{overview.totalPrompts}</p>
          <p class="text-xs text-zinc-600">Prompts</p>
        </div>
      </div>
      <div class="bg-surface-900/60 border border-surface-800 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span class="text-xl">🏷️</span>
        <div>
          <p class="text-lg font-semibold text-white">{overview.totalVersions}</p>
          <p class="text-xs text-zinc-600">Versions</p>
        </div>
      </div>
      <div class="bg-surface-900/60 border border-surface-800 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span class="text-xl">🗂️</span>
        <div>
          <p class="text-lg font-semibold text-white">{overview.workspaceCount ?? workspaces.length}</p>
          <p class="text-xs text-zinc-600">Workspaces</p>
        </div>
      </div>
    </div>

    <!-- ── Charts Row 1 ───────────────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Requests Over Time -->
      <div class="card">
        <h3 class="font-semibold text-white mb-1">Requests Over Time</h3>
        <p class="text-xs text-zinc-600 mb-4">Last {selectedTimeRange} days</p>
        <div class="h-56">
          {#if hasRequests}
            <LineChart labels={requestLabels} datasets={[{ label: "Requests", data: requestCounts, color: "#b4f200" }]} yLabel="Requests" />
          {:else}
            <div class="h-full flex items-center justify-center flex-col gap-2 text-zinc-700">
              <span class="text-2xl">📊</span>
              <span class="text-sm">No requests yet — track with the SDK</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Token Usage Over Time -->
      <div class="card">
        <h3 class="font-semibold text-white mb-1">Token Usage Over Time</h3>
        <p class="text-xs text-zinc-600 mb-4">Daily token burn — last {selectedTimeRange} days</p>
        <div class="h-56">
          {#if hasTokens}
            <LineChart labels={tokenLabels} datasets={[{ label: "Tokens", data: tokenCounts, color: "#34d399" }]} yLabel="Tokens" />
          {:else}
            <div class="h-full flex items-center justify-center flex-col gap-2 text-zinc-700">
              <span class="text-2xl">🔤</span>
              <span class="text-sm">No token data yet</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- ── Charts Row 2 ───────────────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Top Prompts by Usage -->
      <div class="card">
        <h3 class="font-semibold text-white mb-1">Top Prompts by Usage</h3>
        <p class="text-xs text-zinc-600 mb-4">
          {selectedWorkspaceId ? "Request count per prompt" : "Select a workspace above to see per-prompt breakdown"}
        </p>
        <div class="h-56">
          {#if hasTopPrompts}
            <BarChart labels={topPromptLabels} datasets={[{ label: "Requests", data: topPromptCounts, color: "#FBBF24" }]} />
          {:else}
            <div class="h-full flex items-center justify-center flex-col gap-2 text-zinc-700">
              <span class="text-2xl">🔍</span>
              <span class="text-sm">{selectedWorkspaceId ? "No usage data yet" : "Select a workspace to see prompt breakdown"}</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Rating Distribution -->
      <div class="card">
        <h3 class="font-semibold text-white mb-1">Rating Distribution</h3>
        <p class="text-xs text-zinc-600 mb-4">Breakdown of 1–5 star ratings</p>
        <div class="h-56">
          {#if hasRatings}
            <BarChart labels={ratingLabels} datasets={[{ label: "Ratings", data: ratingCounts, color: "#F59E0B" }]} />
          {:else}
            <div class="h-full flex flex-col items-center justify-center gap-2 text-zinc-700">
              <span class="text-2xl">⭐</span>
              <span class="text-sm">No ratings recorded yet</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- ── Avg Latency By Prompt ──────────────────────────── -->
    {#if hasTopPrompts && topPromptLatencies.some(l => l > 0)}
      <div class="card mb-6">
        <h3 class="font-semibold text-white mb-1">Avg Latency by Prompt</h3>
        <p class="text-xs text-zinc-600 mb-4">Milliseconds — lower is better</p>
        <div class="h-48">
          <BarChart labels={topPromptLabels} datasets={[{ label: "Avg Latency (ms)", data: topPromptLatencies, color: "#34d399" }]} />
        </div>
      </div>
    {/if}

    <!-- ── Prompt Performance Table ───────────────────────── -->
    {#if topPrompts.length > 0}
      <div class="card mb-6">
        <h3 class="font-semibold text-white mb-5">Prompt Performance</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-surface-800">
                <th class="text-left text-zinc-500 font-medium pb-3">Prompt</th>
                <th class="text-right text-zinc-500 font-medium pb-3">Requests</th>
                <th class="text-right text-zinc-500 font-medium pb-3">Avg Latency</th>
                <th class="text-right text-zinc-500 font-medium pb-3">Avg Rating</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-800">
              {#each topPrompts as p, i}
                <tr class="hover:bg-surface-800/30 transition-colors group">
                  <td class="py-3">
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-zinc-700 w-5 text-right tabular-nums">{i + 1}</span>
                      <div>
                        <span class="text-zinc-200 font-medium">{p.promptName}</span>
                        <span class="text-zinc-600 text-xs font-mono ml-2">{p.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 text-right text-zinc-400 tabular-nums">{p.requestCount.toLocaleString()}</td>
                  <td class="py-3 text-right tabular-nums">
                    <span class="{p.avgLatencyMs === 0 ? 'text-zinc-600' : p.avgLatencyMs < 300 ? 'text-emerald-400' : p.avgLatencyMs < 700 ? 'text-brand-300' : 'text-red-400'}">
                      {p.avgLatencyMs ? `${p.avgLatencyMs}ms` : "—"}
                    </span>
                  </td>
                  <td class="py-3 text-right">
                    {#if p.avgRating}
                      <span class="text-brand-300">{"★".repeat(Math.round(p.avgRating))}{"☆".repeat(5 - Math.round(p.avgRating))}</span>
                      <span class="text-zinc-600 ml-1 text-xs">{p.avgRating}</span>
                    {:else}
                      <span class="text-zinc-700">—</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- ── SDK Integration Hint ───────────────────────────── -->
    <div class="bg-brand-300/5 border border-brand-300/15 rounded-2xl p-6">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-xl bg-brand-300/10 flex items-center justify-center text-xl flex-shrink-0">📦</div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-white mb-1">Auto-track with the SDK</h3>
          <p class="text-zinc-500 text-sm mb-4">
            Use <code class="text-brand-300 bg-brand-300/10 px-1 rounded">client.run()</code> to automatically capture latency, token counts, and a quality rating — no manual tracking needed.
          </p>

          <!-- OpenAI example -->
          <p class="text-xs text-zinc-500 uppercase tracking-widest mb-2">OpenAI / Azure</p>
          <pre class="bg-surface-950 rounded-xl p-4 text-sm font-mono text-zinc-400 overflow-auto border border-surface-800 mb-4"><code><span class="text-brand-300">import</span> PromptClient <span class="text-brand-300">from</span> <span class="text-emerald-400">'@promptvcs/sdk'</span>
<span class="text-brand-300">import</span> OpenAI <span class="text-brand-300">from</span> <span class="text-emerald-400">'openai'</span>

<span class="text-zinc-500">// Setup (once)</span>
<span class="text-brand-300">const</span> client = <span class="text-brand-300">new</span> PromptClient(&#123; apiKey: <span class="text-emerald-400">'pvcs_...'</span> &#125;)
<span class="text-brand-300">const</span> openai = <span class="text-brand-300">new</span> OpenAI()

<span class="text-zinc-500">// One line — latency, tokens & rating tracked automatically</span>
<span class="text-brand-300">const</span> &#123; response, latencyMs, tokenCount, autoRating &#125; = <span class="text-brand-300">await</span> client.run(
  <span class="text-emerald-400">'my-prompt'</span>,
  (content) =&gt; openai.chat.completions.create(&#123;
    model: <span class="text-emerald-400">'gpt-4o-mini'</span>,
    messages: [&#123; role: <span class="text-emerald-400">'user'</span>, content &#125;],
  &#125;)
)

<span class="text-zinc-500">// latencyMs, tokenCount, autoRating are returned automatically</span>
console.log(<span class="text-emerald-400">"Tracked: " + latencyMs + "ms, " + tokenCount + " tokens, ⭐ " + autoRating + "/5"</span>)</code></pre>

          <!-- Anthropic example -->
          <p class="text-xs text-zinc-500 uppercase tracking-widest mb-2">Anthropic Claude</p>
          <pre class="bg-surface-950 rounded-xl p-4 text-sm font-mono text-zinc-400 overflow-auto border border-surface-800 mb-4"><code><span class="text-brand-300">const</span> &#123; response &#125; = <span class="text-brand-300">await</span> client.run(
  <span class="text-emerald-400">'my-prompt'</span>,
  (content) =&gt; anthropic.messages.create(&#123;
    model: <span class="text-emerald-400">'claude-3-5-haiku-latest'</span>,
    max_tokens: 1024,
    messages: [&#123; role: <span class="text-emerald-400">'user'</span>, content &#125;],
  &#125;)
)
<span class="text-zinc-500">// Anthropic token format auto-detected ✅</span></code></pre>

          <!-- trackAuto fallback -->
          <p class="text-xs text-zinc-500 uppercase tracking-widest mb-2">Manual fallback with auto-rating</p>
          <pre class="bg-surface-950 rounded-xl p-4 text-sm font-mono text-zinc-400 overflow-auto border border-surface-800"><code><span class="text-zinc-500">// If you manage the LLM call yourself:</span>
<span class="text-brand-300">const</span> prompt = <span class="text-brand-300">await</span> client.get(<span class="text-emerald-400">'my-prompt'</span>)
<span class="text-brand-300">const</span> start = Date.now()
<span class="text-brand-300">const</span> llmResponse = <span class="text-brand-300">await</span> myLLM(prompt.content)
<span class="text-brand-300">const</span> latencyMs = Date.now() - start

<span class="text-zinc-500">// Extracts tokens + computes rating for you</span>
<span class="text-brand-300">await</span> client.trackAuto(prompt.id, llmResponse, latencyMs)</code></pre>

          <div class="mt-4 flex items-center gap-2 text-xs text-zinc-600">
            <span class="w-2 h-2 rounded-full bg-emerald-500/60"></span>
            Rating is auto-computed: latency speed (50%) + token throughput (50%)
          </div>
        </div>
      </div>
    </div>

  {/if}
</div>

<style>
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
