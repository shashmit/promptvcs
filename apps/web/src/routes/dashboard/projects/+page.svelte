<script lang="ts">
  import { api } from "$lib/api";
  import type { Project, Workspace } from "$lib/api";
  import { onMount } from "svelte";

  type WorkspaceWithProjects = Workspace & {
    projects: Array<Project & { prompts?: Array<{ id: string }> }>;
  };

  let workspaces: WorkspaceWithProjects[] = [];
  let loading = true;
  let loadError = "";

  let showCreateForm = false;
  let creating = false;
  let newProjectName = "";
  let newProjectDesc = "";
  let selectedWorkspaceId = "";

  onMount(async () => {
    await loadProjects();
  });

  async function loadProjects() {
    loading = true;
    loadError = "";

    try {
      const workspaceList = await api.get<Workspace[]>("/api/workspaces");
      const projectGroups = await Promise.all(
        workspaceList.map(async (workspace) => {
          const projects = await api.get<Array<Project & { prompts?: Array<{ id: string }> }>>(
            `/api/projects/workspace/${workspace.id}`
          );

          return { ...workspace, projects };
        })
      );

      workspaces = projectGroups;
      if (!selectedWorkspaceId && projectGroups.length > 0) {
        selectedWorkspaceId = projectGroups[0].id;
      }
    } catch (error) {
      console.error(error);
      loadError = error instanceof Error ? error.message : "Failed to load projects";
    } finally {
      loading = false;
    }
  }

  async function createProject() {
    if (!selectedWorkspaceId) return;

    creating = true;
    try {
      const project = await api.post<Project>("/api/projects", {
        name: newProjectName,
        description: newProjectDesc || undefined,
        workspaceId: selectedWorkspaceId,
      });

      workspaces = workspaces.map((workspace) =>
        workspace.id === selectedWorkspaceId
          ? {
              ...workspace,
              projects: [...workspace.projects, { ...project, prompts: [] }],
            }
          : workspace
      );

      showCreateForm = false;
      newProjectName = "";
      newProjectDesc = "";
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      creating = false;
    }
  }

  $: totalProjects = workspaces.reduce((count, workspace) => count + workspace.projects.length, 0);
  $: totalPrompts = workspaces.reduce(
    (count, workspace) =>
      count + workspace.projects.reduce((projectCount, project) => projectCount + (project.prompts?.length ?? 0), 0),
    0
  );
</script>

<svelte:head>
  <title>Projects — PromptVCS</title>
</svelte:head>

<div class="w-full max-w-7xl mx-auto">
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div>
      <h1 class="section-title">Projects</h1>
      <p class="section-subtitle">Browse all your projects organized by workspace.</p>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex gap-4 text-sm mr-2 text-zinc-500 font-medium">
        <span>{workspaces.length} Workspace{workspaces.length === 1 ? "" : "s"}</span>
        <span class="w-1 h-1 rounded-full bg-zinc-700 self-center"></span>
        <span>{totalProjects} Project{totalProjects === 1 ? "" : "s"}</span>
      </div>
      <button on:click={() => showCreateForm = true} class="btn-primary whitespace-nowrap">+ New Project</button>
    </div>
  </div>

  {#if showCreateForm}
    <div class="card mb-8 border-brand-300/20">
      <h3 class="font-semibold text-white mb-4">Create Project</h3>
      <form on:submit|preventDefault={createProject} class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label" for="workspace">Workspace</label>
            <select id="workspace" bind:value={selectedWorkspaceId} class="input" required>
              <option value="" disabled>Select a workspace</option>
              {#each workspaces as workspace}
                <option value={workspace.id}>{workspace.name}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="label" for="project-name">Project Name</label>
            <input id="project-name" type="text" bind:value={newProjectName} class="input" placeholder="Website Relaunch" required />
          </div>
        </div>
        <div>
          <label class="label" for="project-description">Description (optional)</label>
          <input id="project-description" type="text" bind:value={newProjectDesc} class="input" placeholder="Briefly describe the purpose of the project..." />
        </div>
        <div class="flex gap-3">
          <button type="submit" disabled={creating || !selectedWorkspaceId} class="btn-primary disabled:opacity-50">
            {creating ? "Creating..." : "Create Project"}
          </button>
          <button type="button" on:click={() => showCreateForm = false} class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center gap-3 py-16 text-zinc-600">
      <div class="h-4 w-4 animate-spin rounded-full border-2 border-brand-300/30 border-t-brand-300"></div>
      Loading projects...
    </div>
  {:else if loadError}
    <div class="card border-red-500/20 text-center py-10">
      <h2 class="text-lg font-semibold text-white">Couldn't load projects</h2>
      <p class="mt-2 text-sm text-zinc-400">{loadError}</p>
      <button on:click={loadProjects} class="btn-secondary mt-5">Try Again</button>
    </div>
  {:else if workspaces.length === 0}
    <div class="card py-20 text-center">
      <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-300/10 text-3xl">📁</div>
      <h2 class="text-lg font-semibold text-white">No workspaces yet</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
        You need a workspace to create projects. Setup your workspace first to start organizing prompts.
      </p>
      <a href="/dashboard" class="btn-primary mt-6 inline-flex">Go to setup</a>
    </div>
  {:else}
    <div class="space-y-10">
      {#each workspaces as workspace}
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-lg bg-brand-300/15 flex items-center justify-center font-bold text-brand-300 text-sm">
              {workspace.name[0]?.toUpperCase()}
            </div>
            <h2 class="text-xl font-semibold text-white">{workspace.name} <span class="text-xs font-normal text-zinc-500 font-mono ml-2">{workspace.slug}</span></h2>
          </div>

          {#if workspace.projects.length === 0}
            <div class="card text-center py-12 bg-surface-900 border-dashed border-surface-700">
              <p class="text-sm text-zinc-500 mb-4">No projects in this workspace yet.</p>
              <button
                on:click={() => {
                  selectedWorkspaceId = workspace.id;
                  showCreateForm = true;
                }}
                class="btn-secondary"
              >
                Create the first project
              </button>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each workspace.projects as project}
                <a href="/dashboard/prompts?workspace={workspace.id}" class="card-hover group flex flex-col h-full">
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h3 class="font-semibold text-zinc-100 group-hover:text-brand-300 transition-colors duration-200">{project.name}</h3>
                    </div>
                    <span class="rounded-full bg-brand-300/10 px-2 py-0.5 text-[10px] font-medium text-brand-300">
                      {project.prompts?.length ?? 0} prompt{(project.prompts?.length ?? 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                  
                  {#if project.description}
                    <p class="text-sm text-zinc-500 mb-4 line-clamp-2 flex-grow">{project.description}</p>
                  {:else}
                    <div class="flex-grow"></div>
                  {/if}

                  <div class="flex items-center justify-between mt-4">
                    <span class="text-xs text-zinc-600 font-medium hover:text-white transition-colors">
                      View prompts &rarr;
                    </span>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
