<script lang="ts">
  import { page } from "$app/stores";
  import { api } from "$lib/api";
  import type { Prompt, PromptVersion } from "$lib/api";
  import { onMount } from "svelte";

  let prompt: Prompt | null = null;
  let selectedVersion: PromptVersion | null = null;
  let compareVersion: PromptVersion | null = null;
  let showNewVersion = false;
  let newContent = "";
  let newCommitMessage = "";
  let newSystemPrompt = "";
  let deploying: string | null = null;
  let activeTab: "content" | "diff" | "deploy" = "content";

  const { id } = $page.params;

  onMount(async () => {
    prompt = await api.get<Prompt>(`/api/prompts/${id}`);
    if (prompt?.versions?.length) {
      selectedVersion = prompt.versions[0];
      newContent = selectedVersion.content;
    }
  });

  async function createVersion() {
    if (!prompt) return;
    const version = await api.post<PromptVersion>("/api/versions", {
      promptId: prompt.id,
      content: newContent,
      commitMessage: newCommitMessage,
      systemPrompt: newSystemPrompt || undefined,
    });
    prompt = { ...prompt, versions: [version, ...prompt.versions] };
    selectedVersion = version;
    showNewVersion = false;
    newCommitMessage = "";
  }

  async function deploy(environment: "development" | "staging" | "production") {
    if (!selectedVersion) return;
    deploying = environment;
    try {
      await api.post("/api/deployments", { promptVersionId: selectedVersion.id, environment });
      prompt = await api.get<Prompt>(`/api/prompts/${id}`);
      selectedVersion = prompt?.versions.find(v => v.id === selectedVersion?.id) ?? null;
    } finally {
      deploying = null;
    }
  }

  function getDiff(v1: string, v2: string) {
    const lines1 = v1.split("\n");
    const lines2 = v2.split("\n");
    const result: Array<{ type: "added" | "removed" | "same"; line: string }> = [];
    const maxLen = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= lines1.length) result.push({ type: "added", line: lines2[i] });
      else if (i >= lines2.length) result.push({ type: "removed", line: lines1[i] });
      else if (lines1[i] !== lines2[i]) {
        result.push({ type: "removed", line: lines1[i] });
        result.push({ type: "added", line: lines2[i] });
      } else {
        result.push({ type: "same", line: lines1[i] });
      }
    }
    return result;
  }

  $: diffLines = selectedVersion && compareVersion
    ? getDiff(compareVersion.content, selectedVersion.content)
    : [];
</script>

<svelte:head><title>{prompt?.name ?? "Prompt"} — PromptVCS</title></svelte:head>

{#if !prompt}
  <div class="flex items-center gap-3 text-zinc-600">
    <div class="w-4 h-4 border-2 border-brand-300/30 border-t-brand-300 rounded-full animate-spin"></div>
    Loading...
  </div>
{:else}
  <div class="w-full max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-start justify-between mb-8">
      <div>
        <div class="flex items-center gap-2 text-sm text-zinc-600 mb-2">
          <a href="/dashboard/prompts" class="hover:text-zinc-400 transition-colors">Prompts</a>
          <span class="text-zinc-700">/</span>
          <span class="text-zinc-400">{prompt.name}</span>
        </div>
        <h1 class="section-title">{prompt.name}</h1>
        <p class="text-zinc-500 text-sm mt-1 font-mono">{prompt.slug}</p>
      </div>
      <button on:click={() => showNewVersion = true} class="btn-primary">+ New Version</button>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <!-- Version list -->
      <div class="col-span-1">
        <h3 class="text-sm font-medium text-zinc-500 mb-3">Version History</h3>
        <div class="space-y-2">
          {#each prompt.versions as version}
            <button
              on:click={() => { selectedVersion = version; activeTab = "content"; }}
              class="w-full text-left p-3 rounded-xl border transition-all duration-200
                {selectedVersion?.id === version.id
                  ? 'bg-brand-300/10 border-brand-300/20 text-white'
                  : 'bg-surface-900 border-surface-800 text-zinc-500 hover:border-surface-600'}"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-mono text-sm font-medium">{version.versionTag}</span>
                {#if version.deployments?.some(d => d.isActive && d.environment === "production")}
                  <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-medium">prod</span>
                {/if}
              </div>
              {#if version.commitMessage}
                <p class="text-xs truncate">{version.commitMessage}</p>
              {/if}
              <p class="text-xs text-zinc-700 mt-1">{new Date(version.createdAt).toLocaleDateString()}</p>
            </button>
          {/each}
        </div>
      </div>

      <!-- Version detail -->
      <div class="col-span-2">
        {#if selectedVersion}
          <!-- Tabs -->
          <div class="flex gap-1 mb-4 bg-surface-900 rounded-xl p-1 border border-surface-800">
            {#each [["content", "Content"], ["diff", "Diff"], ["deploy", "Deploy"]] as [tab, label]}
              <button
                on:click={() => activeTab = tab as any}
                class="flex-1 py-2 text-sm rounded-lg transition-all duration-200
                  {activeTab === tab ? 'bg-surface-700 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'}"
              >
                {label}
              </button>
            {/each}
          </div>

          {#if activeTab === "content"}
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <span class="font-mono text-brand-300 font-medium">{selectedVersion.versionTag}</span>
                <span class="text-xs text-zinc-600">{new Date(selectedVersion.createdAt).toLocaleString()}</span>
              </div>
              {#if selectedVersion.commitMessage}
                <p class="text-sm text-zinc-500 mb-4 italic">"{selectedVersion.commitMessage}"</p>
              {/if}
              {#if selectedVersion.systemPrompt}
                <div class="mb-4">
                  <p class="text-xs text-zinc-600 mb-2 uppercase tracking-wider font-medium">System Prompt</p>
                  <pre class="bg-surface-950 rounded-xl p-4 text-sm text-brand-200 overflow-auto whitespace-pre-wrap font-mono border border-surface-800">{selectedVersion.systemPrompt}</pre>
                </div>
              {/if}
              <div>
                <p class="text-xs text-zinc-600 mb-2 uppercase tracking-wider font-medium">Prompt</p>
                <pre class="bg-surface-950 rounded-xl p-4 text-sm text-zinc-300 overflow-auto whitespace-pre-wrap font-mono border border-surface-800">{selectedVersion.content}</pre>
              </div>
            </div>

          {:else if activeTab === "diff"}
            <div class="card">
              <div class="flex items-center gap-3 mb-4">
                <span class="text-sm text-zinc-500">Compare</span>
                <select class="input py-1.5 text-sm w-auto" on:change={(e) => {
                  const v = prompt?.versions.find(v => v.id === (e.target as HTMLSelectElement).value);
                  if (v) compareVersion = v;
                }}>
                  <option value="">Select version...</option>
                  {#each prompt.versions.filter(v => v.id !== selectedVersion?.id) as v}
                    <option value={v.id}>{v.versionTag}</option>
                  {/each}
                </select>
                <span class="text-sm text-zinc-500">&rarr; {selectedVersion.versionTag}</span>
              </div>
              {#if compareVersion && diffLines.length > 0}
                <div class="bg-surface-950 rounded-xl p-4 font-mono text-sm border border-surface-800 overflow-auto max-h-96">
                  {#each diffLines as line}
                    <div class="
                      {line.type === 'added' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                      {line.type === 'removed' ? 'bg-red-500/10 text-red-400' : ''}
                      {line.type === 'same' ? 'text-zinc-500' : ''}
                      px-2 py-0.5 rounded
                    ">
                      <span class="mr-2 opacity-50">
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                      </span>{line.line}
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-zinc-600 text-sm">Select a version to compare</p>
              {/if}
            </div>

          {:else if activeTab === "deploy"}
            <div class="card space-y-4">
              <h3 class="font-medium text-white">Deploy <span class="text-brand-300 font-mono">{selectedVersion.versionTag}</span></h3>
              {#each [["development", "🔧", "For local dev & testing"], ["staging", "🧪", "Pre-production validation"], ["production", "🚀", "Live traffic"]] as [env, icon, desc]}
                {@const isActive = selectedVersion.deployments?.some(d => d.isActive && d.environment === env)}
                <div class="flex items-center justify-between p-4 bg-surface-850 rounded-xl border border-surface-800">
                  <div class="flex items-center gap-3">
                    <span class="text-xl">{icon}</span>
                    <div>
                      <p class="font-medium text-zinc-200 capitalize">{env}</p>
                      <p class="text-xs text-zinc-600">{desc}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    {#if isActive}
                      <span class="badge-live">Active</span>
                    {/if}
                    <button
                      on:click={() => deploy(env as any)}
                      disabled={deploying === env}
                      class="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                    >
                      {deploying === env ? "Deploying..." : isActive ? "Redeploy" : "Deploy"}
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <!-- New Version Modal -->
    {#if showNewVersion}
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-full max-w-2xl shadow-glow">
          <h3 class="font-semibold text-white mb-4 text-lg">New Version</h3>
          <form on:submit|preventDefault={createVersion} class="space-y-4">
            <div>
              <label class="label">Commit message</label>
              <input type="text" bind:value={newCommitMessage} class="input" placeholder="Improved tone and clarity..." />
            </div>
            <div>
              <label class="label">System prompt (optional)</label>
              <textarea bind:value={newSystemPrompt} class="input resize-none h-20" placeholder="You are a helpful assistant..."></textarea>
            </div>
            <div>
              <label class="label">Prompt content</label>
              <textarea bind:value={newContent} class="input resize-none h-40 font-mono text-sm" required></textarea>
            </div>
            <div class="flex gap-3">
              <button type="submit" class="btn-primary">Save Version</button>
              <button type="button" on:click={() => showNewVersion = false} class="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    {/if}
  </div>
{/if}
