<script lang="ts">
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  const workspaceId = $page.url.searchParams.get("workspace") ?? "";

  let apiKeys: any[] = [];
  let newKeyName = "";
  let createdKey: string | null = null;
  let creating = false;

  onMount(async () => {
    if (workspaceId) {
      apiKeys = await api.get<any[]>(`/api/apikeys/workspace/${workspaceId}`);
    }
  });

  async function createKey() {
    if (!newKeyName || !workspaceId) return;
    creating = true;
    try {
      const result = await api.post<any>("/api/apikeys", { name: newKeyName, workspaceId });
      createdKey = result.rawKey;
      apiKeys = [...apiKeys, result];
      newKeyName = "";
    } finally {
      creating = false;
    }
  }

  async function deleteKey(id: string) {
    await api.delete(`/api/apikeys/${id}`);
    apiKeys = apiKeys.filter(k => k.id !== id);
  }
</script>

<svelte:head><title>Settings — PromptVCS</title></svelte:head>

<div class="w-full max-w-5xl mx-auto">
  <h1 class="section-title mb-8">Settings</h1>

  <div class="card">
    <h2 class="font-semibold text-white mb-1">API Keys</h2>
    <p class="text-sm text-zinc-500 mb-6">Use API keys to access prompts from your application using the SDK.</p>

    {#if createdKey}
      <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
        <p class="text-emerald-400 text-sm font-medium mb-2">API Key created — copy it now, it won't be shown again!</p>
        <code class="text-emerald-300 font-mono text-sm bg-emerald-500/5 px-3 py-2 rounded-lg block break-all">{createdKey}</code>
        <button on:click={() => { navigator.clipboard.writeText(createdKey!); }} class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors mt-2">Copy to clipboard</button>
      </div>
    {/if}

    <!-- Create key form -->
    <form on:submit|preventDefault={createKey} class="flex gap-3 mb-6">
      <input type="text" bind:value={newKeyName} class="input" placeholder="Key name (e.g. Production App)" />
      <button type="submit" disabled={creating || !workspaceId} class="btn-primary whitespace-nowrap disabled:opacity-50">
        {creating ? "Creating..." : "Create Key"}
      </button>
    </form>

    <!-- Keys list -->
    {#if apiKeys.length === 0}
      <p class="text-zinc-600 text-sm">No API keys yet.</p>
    {:else}
      <div class="space-y-3">
        {#each apiKeys as key}
          <div class="flex items-center justify-between p-4 bg-surface-850 rounded-xl border border-surface-800">
            <div>
              <p class="font-medium text-zinc-200 text-sm">{key.name}</p>
              <p class="font-mono text-xs text-zinc-600">{key.keyPrefix}••••••••</p>
            </div>
            <div class="flex items-center gap-3">
              {#if key.lastUsedAt}
                <span class="text-xs text-zinc-600">Used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
              {:else}
                <span class="text-xs text-zinc-700">Never used</span>
              {/if}
              <button on:click={() => deleteKey(key.id)} class="text-red-400 hover:text-red-300 text-xs transition-colors">Revoke</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
