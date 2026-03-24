<script lang="ts">
  import type { Prompt } from "$lib/api";
  export let prompt: Prompt;

  $: latestVersion = prompt.versions?.[0];
  $: isDeployed = latestVersion?.deployments?.some((d) => d.isActive && d.environment === "production");
  $: workspaceName = prompt.project?.workspace?.name;
</script>

<a href="/dashboard/prompts/{prompt.id}" class="card-hover block group h-full flex flex-col">
  <div class="flex items-start justify-between mb-3">
    <div>
      <h3 class="font-semibold text-zinc-100 group-hover:text-brand-300 transition-colors duration-200">
        {prompt.name}
      </h3>
      <p class="text-xs text-zinc-600 font-mono mt-0.5">{prompt.slug}</p>
    </div>
    {#if isDeployed}
      <span class="badge-live">Live</span>
    {:else}
      <span class="badge-draft">Draft</span>
    {/if}
  </div>

  {#if prompt.description}
    <p class="text-sm text-zinc-500 mb-4 line-clamp-2 flex-grow">{prompt.description}</p>
  {:else}
    <div class="flex-grow"></div>
  {/if}

  <div class="flex items-center justify-between mt-4">
    <div class="flex items-center gap-4 text-xs text-zinc-600">
      <span>📦 {prompt.versions?.length ?? 0} versions</span>
      {#if latestVersion}
        <span>🏷️ {latestVersion.versionTag}</span>
      {/if}
    </div>
    {#if workspaceName}
      <span class="text-xs font-medium text-brand-400/80 bg-brand-400/10 px-2.5 py-1 rounded-md">
        {workspaceName}
      </span>
    {/if}
  </div>
</a>
