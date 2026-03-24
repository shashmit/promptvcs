<script lang="ts">
  import { user } from "$lib/stores/auth";
  import { api } from "$lib/api";
  import type { Workspace } from "$lib/api";
  import { onMount } from "svelte";

  let workspaces: Workspace[] = [];
  let showCreateForm = false;
  let newName = "";
  let newSlug = "";
  let creating = false;

  onMount(async () => {
    try {
      workspaces = await api.get<Workspace[]>("/api/workspaces");
    } catch (e) {
      console.error(e);
    }
  });

  async function createWorkspace() {
    creating = true;
    try {
      const ws = await api.post<Workspace>("/api/workspaces", { name: newName, slug: newSlug });
      workspaces = [...workspaces, ws];
      showCreateForm = false;
      newName = "";
      newSlug = "";
    } catch (e: any) {
      alert(e.message);
    } finally {
      creating = false;
    }
  }

  $: if (newName) {
    newSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
</script>

<svelte:head><title>Dashboard — PromptVCS</title></svelte:head>

<div class="w-full max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="section-title">Welcome back, {$user?.name?.split(" ")[0]}</h1>
      <p class="section-subtitle">Manage your prompt workspaces</p>
    </div>
    <button on:click={() => showCreateForm = true} class="btn-primary">
      + New Workspace
    </button>
  </div>

  {#if showCreateForm}
    <div class="card mb-6 border-brand-300/20">
      <h3 class="font-semibold text-white mb-4">Create Workspace</h3>
      <form on:submit|preventDefault={createWorkspace} class="space-y-4">
        <div>
          <label class="label">Workspace name</label>
          <input type="text" bind:value={newName} class="input" placeholder="My AI Project" required />
        </div>
        <div>
          <label class="label">Slug</label>
          <input type="text" bind:value={newSlug} class="input" placeholder="my-ai-project" pattern="[a-z0-9-]+" required />
        </div>
        <div class="flex gap-3">
          <button type="submit" disabled={creating} class="btn-primary disabled:opacity-50">
            {creating ? "Creating..." : "Create"}
          </button>
          <button type="button" on:click={() => showCreateForm = false} class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  {#if workspaces.length === 0}
    <div class="card text-center py-20">
      <div class="w-16 h-16 bg-brand-300/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">🚀</div>
      <h3 class="text-white font-semibold mb-2 text-lg">No workspaces yet</h3>
      <p class="text-zinc-500 text-sm mb-6">Create your first workspace to start versioning prompts</p>
      <button on:click={() => showCreateForm = true} class="btn-primary">Create workspace</button>
    </div>
  {:else}
    <div class="grid md:grid-cols-2 gap-4">
      {#each workspaces as ws}
        <a href="/dashboard/prompts?workspace={ws.id}" class="card-hover group">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-11 h-11 bg-brand-300/15 rounded-xl flex items-center justify-center text-brand-300 font-bold text-base">
              {ws.name[0].toUpperCase()}
            </div>
            <div>
              <h3 class="font-semibold text-zinc-100 group-hover:text-brand-300 transition-colors duration-200">{ws.name}</h3>
              <p class="text-xs text-zinc-600 font-mono">{ws.slug}</p>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
