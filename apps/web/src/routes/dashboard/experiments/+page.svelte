<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import type { Workspace } from "$lib/api";

  interface Variant {
    id: string;
    name: string;
    promptVersionId: string;
    trafficPercent: number;
    isControl: boolean;
    versionTag?: string;
  }

  interface Experiment {
    id: string;
    name: string;
    description?: string;
    status: "draft" | "running" | "completed" | "archived";
    promptId: string;
    prompt?: { name: string; slug: string; versions: any[] };
    variants: Variant[];
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
  }

  let workspaces: Workspace[] = [];
  let selectedWorkspaceId = "";
  let experiments: Experiment[] = [];
  let prompts: any[] = [];
  let loading = true;
  let showCreate = false;
  let selectedExperiment: Experiment | null = null;
  let experimentResults: any = null;
  let loadingResults = false;

  // Create form
  let newName = "";
  let newDescription = "";
  let selectedPromptId = "";
  let formVariants: { name: string; promptVersionId: string; trafficPercent: number; isControl: boolean }[] = [
    { name: "Control", promptVersionId: "", trafficPercent: 50, isControl: true },
    { name: "Variant A", promptVersionId: "", trafficPercent: 50, isControl: false },
  ];
  let creating = false;
  let createError = "";

  $: selectedPrompt = prompts.find(p => p.id === selectedPromptId);
  $: trafficTotal = formVariants.reduce((s, v) => s + v.trafficPercent, 0);
  $: trafficValid = trafficTotal === 100;

  onMount(async () => {
    try {
      workspaces = await api.get<Workspace[]>("/api/workspaces");
      if (workspaces.length > 0) {
        selectedWorkspaceId = workspaces[0].id;
        await loadData();
      } else {
        loading = false;
      }
    } catch (e) {
      console.error("Failed to load workspaces", e);
      loading = false;
    }
  });

  async function selectWorkspace(id: string) {
    selectedWorkspaceId = id;
    selectedExperiment = null;
    experimentResults = null;
    await loadData();
  }

  async function loadData() {
    if (!selectedWorkspaceId) { loading = false; return; }
    loading = true;
    try {
      experiments = await api.get<Experiment[]>(`/api/experiments/workspace/${selectedWorkspaceId}`);
    } catch (e) {
      console.error(e);
      experiments = [];
    } finally {
      loading = false;
    }
  }

  async function loadPromptsForWorkspace() {
    try {
      const projects = await api.get<any[]>(`/api/projects/workspace/${selectedWorkspaceId}`);
      const allPrompts: any[] = [];
      for (const p of projects) {
        try {
          const pp = await api.get<any[]>(`/api/prompts/project/${p.id}`);
          allPrompts.push(...pp);
        } catch {}
      }
      prompts = allPrompts;
    } catch(e) { console.error(e); }
  }

  function openCreate() {
    loadPromptsForWorkspace();
    showCreate = true;
  }

  async function createExperiment() {
    if (!trafficValid) { createError = "Traffic must sum to 100%"; return; }
    const controlCount = formVariants.filter(v => v.isControl).length;
    if (controlCount !== 1) { createError = "Exactly one variant must be Control"; return; }

    creating = true;
    createError = "";
    try {
      const exp = await api.post<Experiment>("/api/experiments", {
        workspaceId: selectedWorkspaceId,
        promptId: selectedPromptId,
        name: newName,
        description: newDescription || undefined,
        variants: formVariants,
      });
      experiments = [exp, ...experiments];
      showCreate = false;
      resetForm();
    } catch(e: any) {
      createError = e.message;
    } finally {
      creating = false;
    }
  }

  function resetForm() {
    newName = "";
    newDescription = "";
    selectedPromptId = "";
    formVariants = [
      { name: "Control", promptVersionId: "", trafficPercent: 50, isControl: true },
      { name: "Variant A", promptVersionId: "", trafficPercent: 50, isControl: false },
    ];
  }

  function addVariant() {
    const remaining = 100 - trafficTotal;
    formVariants = [...formVariants, { name: `Variant ${String.fromCharCode(64 + formVariants.length)}`, promptVersionId: "", trafficPercent: Math.max(remaining, 10), isControl: false }];
  }

  function removeVariant(i: number) {
    if (formVariants.length <= 2) return;
    formVariants = formVariants.filter((_, idx) => idx !== i);
  }

  async function startExperiment(id: string) {
    try { await api.post(`/api/experiments/${id}/start`, {}); } catch(e: any) { alert(e.message); }
    await loadData();
  }

  async function stopExperiment(id: string) {
    try { await api.post(`/api/experiments/${id}/stop`, {}); } catch(e: any) { alert(e.message); }
    await loadData();
    if (selectedExperiment?.id === id) loadResults(id);
  }

  async function deleteExperiment(id: string) {
    if (!confirm("Delete this experiment?")) return;
    try { await api.delete(`/api/experiments/${id}`); } catch(e: any) { alert(e.message); return; }
    experiments = experiments.filter(e => e.id !== id);
    if (selectedExperiment?.id === id) selectedExperiment = null;
  }

  async function loadResults(id: string) {
    loadingResults = true;
    experimentResults = null;
    try {
      experimentResults = await api.get<any>(`/api/experiments/${id}/results`);
    } catch(e) {
      console.error(e);
    } finally {
      loadingResults = false;
    }
  }

  async function selectExperiment(exp: Experiment) {
    selectedExperiment = exp;
    await loadResults(exp.id);
  }

  const statusColors: Record<string, string> = {
    draft: "text-zinc-400 bg-surface-800 border-surface-700",
    running: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    completed: "text-brand-300 bg-brand-300/10 border-brand-300/20",
    archived: "text-zinc-600 bg-surface-900 border-surface-800",
  };
  const statusIcons: Record<string, string> = { draft: "📋", running: "🟢", completed: "✅", archived: "📦" };
</script>

<svelte:head><title>A/B Experiments — PromptVCS</title></svelte:head>

<div class="w-full max-w-7xl mx-auto">
  <div class="flex flex-col md:flex-row md:items-start gap-4 mb-8">
    <div class="flex-1">
      <h1 class="section-title">A/B Experiments</h1>
      <p class="section-subtitle">Test prompt versions against each other with real traffic</p>
    </div>
    <div class="flex items-center gap-3">
      {#if workspaces.length > 1}
        <div class="flex gap-1 bg-surface-900 p-1 rounded-xl border border-surface-800 overflow-x-auto hide-scrollbar">
          {#each workspaces as ws}
            <button
              on:click={() => selectWorkspace(ws.id)}
              class="px-3.5 py-1.5 text-sm rounded-lg whitespace-nowrap transition-all duration-200
                {selectedWorkspaceId === ws.id ? 'bg-brand-300 text-surface-950 font-medium' : 'text-zinc-500 hover:text-zinc-300'}"
            >{ws.name}</button>
          {/each}
        </div>
      {/if}
      <button on:click={openCreate} disabled={!selectedWorkspaceId} class="btn-primary disabled:opacity-40">+ New Experiment</button>
    </div>
  </div>

  {#if !selectedWorkspaceId && !loading}
    <div class="card text-center py-20">
      <p class="text-zinc-500">No workspaces found. Create a workspace first.</p>
      <a href="/dashboard" class="btn-primary mt-4 inline-block">Go to Dashboard</a>
    </div>

  {:else if loading}
    <div class="text-center py-16 text-zinc-600 flex items-center justify-center gap-3">
      <div class="w-4 h-4 border-2 border-brand-300/30 border-t-brand-300 rounded-full animate-spin"></div>
      Loading experiments...
    </div>

  {:else}
    <div class="grid grid-cols-5 gap-6">
      <!-- Experiment list -->
      <div class="col-span-2 space-y-3">
        {#if experiments.length === 0}
          <div class="card text-center py-16">
            <div class="w-16 h-16 bg-brand-300/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">🧪</div>
            <h3 class="text-white font-medium mb-1">No experiments yet</h3>
            <p class="text-zinc-600 text-sm mb-4">Create your first A/B test to compare prompt versions</p>
            <button on:click={openCreate} class="btn-primary text-sm">Create experiment</button>
          </div>
        {:else}
          {#each experiments as exp}
            <button
              on:click={() => selectExperiment(exp)}
              class="w-full text-left p-4 rounded-2xl border transition-all duration-200
                {selectedExperiment?.id === exp.id
                  ? 'bg-brand-300/10 border-brand-300/20'
                  : 'bg-surface-900 border-surface-800 hover:border-surface-600'}"
            >
              <div class="flex items-start justify-between mb-2">
                <h3 class="font-medium text-zinc-200 text-sm">{exp.name}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full border {statusColors[exp.status]} ml-2 flex-shrink-0">
                  {statusIcons[exp.status]} {exp.status}
                </span>
              </div>
              {#if exp.prompt}
                <p class="text-xs text-zinc-600 font-mono mb-2">{exp.prompt.slug}</p>
              {/if}
              <div class="flex gap-3 text-xs text-zinc-700">
                <span>{exp.variants?.length ?? 0} variants</span>
                {#if exp.startedAt}
                  <span>Started {new Date(exp.startedAt).toLocaleDateString()}</span>
                {/if}
              </div>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Results panel -->
      <div class="col-span-3">
        {#if !selectedExperiment}
          <div class="card h-full flex items-center justify-center text-center py-24">
            <div>
              <div class="w-16 h-16 bg-brand-300/10 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5">📊</div>
              <p class="text-zinc-600">Select an experiment to view results</p>
            </div>
          </div>

        {:else}
          <div class="space-y-4">
            <!-- Header -->
            <div class="card">
              <div class="flex items-start justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-white">{selectedExperiment.name}</h2>
                  {#if selectedExperiment.description}
                    <p class="text-zinc-500 text-sm mt-1">{selectedExperiment.description}</p>
                  {/if}
                </div>
                <div class="flex items-center gap-2">
                  {#if selectedExperiment.status === "draft"}
                    <button on:click={() => startExperiment(selectedExperiment.id)} class="btn-primary text-sm px-3 py-1.5">
                      ▶ Start
                    </button>
                  {:else if selectedExperiment.status === "running"}
                    <span class="flex items-center gap-1.5 text-emerald-400 text-sm">
                      <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Live
                    </span>
                    <button on:click={() => stopExperiment(selectedExperiment.id)} class="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm px-3 py-1.5 rounded-xl transition-colors">
                      ⏹ Stop
                    </button>
                  {:else if selectedExperiment.status === "completed"}
                    <span class="text-brand-300 text-sm">✅ Completed</span>
                  {/if}
                  {#if selectedExperiment.status !== "running"}
                    <button on:click={() => deleteExperiment(selectedExperiment.id)} class="text-zinc-700 hover:text-red-400 text-sm transition-colors">🗑</button>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Results -->
            {#if loadingResults}
              <div class="card text-center py-8 text-zinc-600 flex items-center justify-center gap-3">
                <div class="w-4 h-4 border-2 border-brand-300/30 border-t-brand-300 rounded-full animate-spin"></div>
                Loading results...
              </div>
            {:else if experimentResults}
              <!-- Summary row -->
              <div class="grid grid-cols-3 gap-3">
                <div class="card text-center">
                  <p class="text-2xl font-bold text-white">{experimentResults.totalAssignments.toLocaleString()}</p>
                  <p class="text-xs text-zinc-600 mt-1">Total Assignments</p>
                </div>
                <div class="card text-center">
                  <p class="text-2xl font-bold text-white">{experimentResults.totalRequests.toLocaleString()}</p>
                  <p class="text-xs text-zinc-600 mt-1">Total Requests</p>
                </div>
                <div class="card text-center">
                  <p class="text-2xl font-bold text-white">{experimentResults.variants.length}</p>
                  <p class="text-xs text-zinc-600 mt-1">Variants</p>
                </div>
              </div>

              <!-- Variant cards -->
              <div class="space-y-3">
                {#each experimentResults.variants as variant}
                  <div class="card border {variant.isControl ? 'border-surface-600' : variant.improvement?.rating > 0 ? 'border-emerald-500/30' : variant.improvement?.rating < 0 ? 'border-red-500/30' : 'border-surface-800'}">
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex items-center gap-3">
                        <div class="w-2 h-8 rounded-full {variant.isControl ? 'bg-zinc-600' : variant.improvement?.rating > 0 ? 'bg-emerald-500' : variant.improvement?.rating < 0 ? 'bg-red-500' : 'bg-brand-300'}"></div>
                        <div>
                          <h3 class="font-semibold text-white">{variant.variantName}</h3>
                          <p class="text-xs text-zinc-600 font-mono">{variant.versionTag}</p>
                        </div>
                        {#if variant.isControl}
                          <span class="text-xs bg-surface-700 text-zinc-400 px-2 py-0.5 rounded-full">Control</span>
                        {/if}
                      </div>
                      <div class="text-right">
                        <p class="text-sm text-zinc-500">{variant.trafficPercent}% traffic</p>
                        {#if variant.improvement && !variant.isControl}
                          <div class="flex gap-2 mt-1">
                            {#if variant.improvement.rating !== null}
                              <span class="text-xs {variant.improvement.rating >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                                {variant.improvement.rating >= 0 ? "+" : ""}{variant.improvement.rating}% rating
                              </span>
                            {/if}
                            {#if variant.improvement.latency !== null}
                              <span class="text-xs {variant.improvement.latency >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                                {variant.improvement.latency >= 0 ? "-" : "+"}{Math.abs(variant.improvement.latency)}% latency
                              </span>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    </div>

                    <div class="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <p class="text-xs text-zinc-600 mb-1">Requests</p>
                        <p class="text-lg font-semibold text-white">{variant.requestCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p class="text-xs text-zinc-600 mb-1">Avg Latency</p>
                        <p class="text-lg font-semibold {variant.avgLatencyMs === 0 ? 'text-zinc-600' : variant.avgLatencyMs < 300 ? 'text-emerald-400' : variant.avgLatencyMs < 700 ? 'text-brand-300' : 'text-red-400'}">
                          {variant.avgLatencyMs ? `${variant.avgLatencyMs}ms` : "—"}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs text-zinc-600 mb-1">Avg Rating</p>
                        <p class="text-lg font-semibold text-brand-300">{variant.avgRating || "—"}</p>
                      </div>
                      <div>
                        <p class="text-xs text-zinc-600 mb-1">Avg Tokens</p>
                        <p class="text-lg font-semibold text-white">{variant.avgTokens || "—"}</p>
                      </div>
                    </div>

                    <!-- Rating distribution bar -->
                    {#if variant.ratingDistribution.some(r => r.count > 0)}
                      {@const maxCount = Math.max(...variant.ratingDistribution.map(r => r.count), 1)}
                      <div>
                        <p class="text-xs text-zinc-700 mb-2">Rating distribution</p>
                        <div class="flex gap-1 items-end h-8">
                          {#each variant.ratingDistribution as r}
                            <div class="flex-1 flex flex-col items-center gap-1">
                              <div
                                class="w-full rounded-t bg-brand-300/60 transition-all"
                                style="height: {Math.max((r.count / maxCount) * 100, 4)}%"
                              ></div>
                              <span class="text-xs text-zinc-700">{r.rating}★</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>

              <!-- SDK integration tip -->
              {#if selectedExperiment.status === "running"}
                <div class="bg-brand-300/5 border border-brand-300/15 rounded-2xl p-4">
                  <p class="text-sm font-medium text-white mb-2">🔌 SDK Integration</p>
                  <pre class="text-xs font-mono text-zinc-500 overflow-auto"><code>const variant = await client.getVariant(
  '{selectedExperiment.name}',
  userId  // deterministic per user
)
// variant.prompt.content has the assigned prompt
// variant.isControl — true if control group</code></pre>
                </div>
              {/if}
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Create Experiment Modal -->
{#if showCreate}
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div class="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-full max-w-2xl my-4 shadow-glow">
      <h2 class="text-lg font-semibold text-white mb-6">Create A/B Experiment</h2>

      <form on:submit|preventDefault={createExperiment} class="space-y-5">
        {#if createError}
          <div class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{createError}</div>
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="label">Experiment name</label>
            <input type="text" bind:value={newName} class="input" placeholder="Summer tone test" required />
          </div>
          <div class="col-span-2">
            <label class="label">Description (optional)</label>
            <input type="text" bind:value={newDescription} class="input" placeholder="Testing formal vs casual tone..." />
          </div>
          <div class="col-span-2">
            <label class="label">Prompt</label>
            <select bind:value={selectedPromptId} class="input" required>
              <option value="">Select a prompt...</option>
              {#each prompts as p}
                <option value={p.id}>{p.name} ({p.slug})</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Variants -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <label class="text-sm text-zinc-400 font-medium">Variants</label>
            <div class="flex items-center gap-3">
              <span class="text-xs {trafficValid ? 'text-emerald-400' : 'text-red-400'}">
                Total: {trafficTotal}% {trafficValid ? "✓" : "(must be 100%)"}
              </span>
              {#if formVariants.length < 5}
                <button type="button" on:click={addVariant} class="text-xs text-brand-300 hover:text-brand-200 transition-colors">+ Add variant</button>
              {/if}
            </div>
          </div>
          <div class="space-y-3">
            {#each formVariants as variant, i}
              <div class="bg-surface-850 border border-surface-800 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <input type="text" bind:value={variant.name} class="input py-1.5 text-sm w-36" />
                    <label class="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                      <input
                        type="radio"
                        name="control"
                        checked={variant.isControl}
                        on:change={() => { formVariants = formVariants.map((v, idx) => ({ ...v, isControl: idx === i })); }}
                        class="accent-brand-300"
                      />
                      Control
                    </label>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      bind:value={variant.trafficPercent}
                      min="1" max="99"
                      class="input py-1.5 text-sm w-20 text-center"
                    />
                    <span class="text-zinc-600 text-sm">%</span>
                    {#if formVariants.length > 2}
                      <button type="button" on:click={() => removeVariant(i)} class="text-zinc-700 hover:text-red-400 transition-colors text-sm">✕</button>
                    {/if}
                  </div>
                </div>
                <div>
                  <select bind:value={variant.promptVersionId} class="input text-sm py-1.5" required>
                    <option value="">Select version...</option>
                    {#if selectedPrompt}
                      {#each selectedPrompt.versions ?? [] as v}
                        <option value={v.id}>{v.versionTag} {v.commitMessage ? `— ${v.commitMessage}` : ""}</option>
                      {/each}
                    {/if}
                  </select>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button type="submit" disabled={creating || !trafficValid} class="btn-primary disabled:opacity-50">
            {creating ? "Creating..." : "Create experiment"}
          </button>
          <button type="button" on:click={() => { showCreate = false; resetForm(); }} class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  </div>
{/if}
