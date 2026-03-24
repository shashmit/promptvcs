<script lang="ts">
  import { page } from "$app/stores";
  import { authApi } from "$lib/api";
  import { user } from "$lib/stores/auth";
  import { goto } from "$app/navigation";

  export let workspaceSlug: string = "";

  const navItems = [
    { href: "/dashboard", icon: "🏠", label: "Overview" },
    { href: "/dashboard/prompts", icon: "📝", label: "Prompts" },
    { href: "/dashboard/projects", icon: "📁", label: "Projects" },
    { href: "/dashboard/experiments", icon: "🧪", label: "Experiments" },
    { href: "/dashboard/analytics", icon: "📊", label: "Analytics" },
    { href: "/dashboard/docs", icon: "📖", label: "Docs" },
    { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
  ];

  async function handleSignOut() {
    await authApi.signOut();
    user.set(null);
    goto("/login");
  }
</script>

<nav class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-900/80 backdrop-blur-xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-3xl p-2 flex items-center max-w-[calc(100vw-2rem)] overflow-x-auto hide-scrollbar ring-1 ring-white/10">
  <!-- Logo -->
  <div class="flex items-center justify-center pl-2 pr-4 border-r border-white/10">
    <div class="w-10 h-10 bg-brand-300 rounded-2xl flex items-center justify-center text-surface-950 font-bold text-lg shadow-glow-sm">P</div>
  </div>

  <!-- Links -->
  <div class="flex items-center gap-1 px-3">
    {#each navItems as item}
      <a
        href={item.href}
        class="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 group
          {$page.url.pathname === item.href
            ? 'bg-white/10 text-brand-300'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}"
      >
        <span class="text-xl z-10 transition-transform duration-300 group-hover:-translate-y-2 {$page.url.pathname === item.href ? '-translate-y-2 text-brand-300' : ''}">
          {item.icon}
        </span>
        <span class="absolute bottom-[6px] text-[10px] font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100 {$page.url.pathname === item.href ? 'opacity-100 text-brand-300' : ''}">
          {item.label}
        </span>
      </a>
    {/each}
  </div>

  <div class="w-px h-8 bg-white/10 mx-2"></div>

  <!-- User / Signout -->
  <div class="pr-2 pl-1 group relative">
    <button on:click={handleSignOut} title="Sign Out ({$user?.email})" class="flex items-center justify-center w-10 h-10 rounded-full bg-surface-800 border border-white/5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all duration-300 flex-shrink-0 shadow-sm focus:outline-none">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-0.5 transition-transform duration-300">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    </button>
  </div>
</nav>

<style>
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
