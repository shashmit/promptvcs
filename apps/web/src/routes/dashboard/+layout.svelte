<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { authApi } from "$lib/api";
  import { user, loading } from "$lib/stores/auth";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(async () => {
    try {
      const session = await authApi.getSession() as any;
      if (session?.user) {
        user.set(session.user);
      } else {
        goto("/login");
      }
    } catch {
      goto("/login");
    } finally {
      loading.set(false);
    }
  });
</script>

{#if $loading}
  <div class="min-h-screen flex items-center justify-center bg-surface-950">
    <div class="flex items-center gap-3 text-zinc-600">
      <div class="w-5 h-5 border-2 border-brand-300/30 border-t-brand-300 rounded-full animate-spin"></div>
      Loading...
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-surface-950 pb-32">
    <Sidebar />
    <main class="max-w-7xl mx-auto p-4 md:p-8">
      <slot />
    </main>
  </div>
{/if}
