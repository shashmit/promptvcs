<script lang="ts">
  import { page } from "$app/stores";
  import { api } from "$lib/api";
  import type { Project, Prompt } from "$lib/api";
  import PromptCard from "$lib/components/PromptCard.svelte";
  import { onMount } from "svelte";

  let projects: Project[] = [];
  let selectedProject: Project | null = null;
  let prompts: Prompt[] = [];
  let loading = false;
  let showCreatePrompt = false;

  let newPromptName = "";
  let newPromptSlug = "";
  let newPromptDesc = "";

  let showCreateProject = false;
  let newProjectName = "";
  let newProjectDesc = "";

  const workspaceId = $page.url.searchParams.get("workspace");

  onMount(async () => {
    if (workspaceId) {
      projects = await api.get<Project[]>(`/api/projects/workspace/${workspaceId}`);
      if (projects.length > 0) {
        selectProject(projects[0]);
      }
    } else {
      loading = true;
      prompts = await api.get<Prompt[]>("/api/prompts");
      loading = false;
    }
  });

  async function selectProject(p: Project) {
    selectedProject = p;
    loading = true;
    prompts = await api.get<Prompt[]>(`/api/prompts/project/${p.id}`);
    loading = false;
  }

  async function createPrompt() {
    if (!selectedProject) return;
    const prompt = await api.post<Prompt>("/api/prompts", {
      name: newPromptName,
      slug: newPromptSlug,
      description: newPromptDesc || undefined,
      projectId: selectedProject.id,
    });
    prompts = [prompt, ...prompts];
    showCreatePrompt = false;
    newPromptName = "";
    newPromptSlug = "";
    newPromptDesc = "";
  }

  async function createProject() {
    if (!workspaceId) return;
    const project = await api.post<Project>("/api/projects", {
      name: newProjectName,
      description: newProjectDesc || undefined,
      workspaceId,
    });
    projects = [...projects, project];
    if (projects.length === 1) selectProject(project);
    showCreateProject = false;
    newProjectName = "";
    newProjectDesc = "";
  }

  $: if (newPromptName) {
    newPromptSlug = newPromptName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
</script>

<svelte:head><title>Prompts — PromptVCS</title></svelte:head>

<div class="w-full max-w-7xl mx-auto">
  <div class="flex items-center justify-between mb-8">
    <h1 class="section-title">Prompts</h1>
    {#if workspaceId}
      <button on:click={() => showCreateProject = true} class="btn-secondary">+ New Project</button>
    {/if}
  </div>

  {#if showCreateProject}
    <div class="card mb-6 border-brand-300/20">
      <h3 class="font-semibold text-white mb-4">New Project</h3>
      <form on:submit|preventDefault={createProject} class="space-y-4">
        <div>
          <label class="label">Name</label>
          <input type="text" bind:value={newProjectName} class="input" placeholder="Website Relaunch" required />
        </div>
        <div>
          <label class="label">Description (optional)</label>
          <input type="text" bind:value={newProjectDesc} class="input" placeholder="Prompts for the new website..." />
        </div>
        <div class="flex gap-3">
          <button type="submit" class="btn-primary">Create</button>
          <button type="button" on:click={() => showCreateProject = false} class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Projects selector -->
  {#if projects.length > 0}
    <div class="flex items-center justify-between mb-6">
      <div class="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {#each projects as p}
          <button
            on:click={() => selectProject(p)}
            class="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200
              {selectedProject?.id === p.id ? 'bg-brand-300 text-surface-950 shadow-glow-sm' : 'bg-surface-800 text-zinc-500 hover:text-zinc-200 border border-surface-700'}"
          >
            {p.name}
          </button>
        {/each}
      </div>
      {#if selectedProject}
        <button on:click={() => showCreatePrompt = true} class="btn-primary whitespace-nowrap ml-4">+ New Prompt</button>
      {/if}
    </div>
  {/if}

  {#if showCreatePrompt}
    <div class="card mb-6 border-brand-300/20">
      <h3 class="font-semibold text-white mb-4">New Prompt</h3>
      <form on:submit|preventDefault={createPrompt} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Name</label>
            <input type="text" bind:value={newPromptName} class="input" placeholder="Customer Support" required />
          </div>
          <div>
            <label class="label">Slug</label>
            <input type="text" bind:value={newPromptSlug} class="input" placeholder="customer-support" pattern="[a-z0-9-]+" required />
          </div>
        </div>
        <div>
          <label class="label">Description (optional)</label>
          <input type="text" bind:value={newPromptDesc} class="input" placeholder="Handles customer inquiries..." />
        </div>
        <div class="flex gap-3">
          <button type="submit" class="btn-primary">Create</button>
          <button type="button" on:click={() => showCreatePrompt = false} class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-16 text-zinc-600 flex items-center justify-center gap-3">
      <div class="w-4 h-4 border-2 border-brand-300/30 border-t-brand-300 rounded-full animate-spin"></div>
      Loading prompts...
    </div>
  {:else if prompts.length === 0}
    <div class="card text-center py-20">
      <div class="w-16 h-16 bg-brand-300/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">📝</div>
      <h3 class="text-white font-semibold mb-2 text-lg">No prompts yet</h3>
      {#if selectedProject}
        <p class="text-zinc-500 text-sm mb-6">Create your first prompt to start versioning</p>
        <button on:click={() => showCreatePrompt = true} class="btn-primary">Create prompt</button>
      {:else if workspaceId}
        <p class="text-zinc-500 text-sm mb-6">Create a project first to add your prompts.</p>
        <button on:click={() => showCreateProject = true} class="btn-primary">Create Project</button>
      {:else}
        <p class="text-zinc-500 text-sm mb-6">Select a project to create your first prompt or wait until someone invites you.</p>
      {/if}
    </div>
  {:else}
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each prompts as prompt}
        <PromptCard {prompt} />
      {/each}
    </div>
  {/if}
</div>
