<script lang="ts">
  import { goto } from "$app/navigation";
</script>

<svelte:head>
  <title>PromptVCS — Version Control for AI Prompts</title>
</svelte:head>

<div class="min-h-screen bg-surface-950 flex flex-col overflow-hidden">
  <!-- Ambient glow -->
  <div class="fixed inset-0 bg-glow-yellow pointer-events-none"></div>
  <div class="fixed top-1/3 left-1/4 w-96 h-96 bg-brand-300/[0.03] rounded-full blur-3xl pointer-events-none"></div>
  <div class="fixed top-1/2 right-1/4 w-72 h-72 bg-brand-400/[0.02] rounded-full blur-3xl pointer-events-none"></div>

  <!-- Nav -->
  <nav class="relative z-10 border-b border-surface-800/50 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-brand-300 rounded-xl flex items-center justify-center text-surface-950 font-bold text-sm shadow-glow-sm">P</div>
      <span class="font-semibold text-white text-lg tracking-tight">PromptVCS</span>
    </div>
    <div class="flex items-center gap-4">
      <a href="/login" class="btn-ghost">Sign in</a>
      <a href="/register" class="btn-primary">Get started free</a>
    </div>
  </nav>

  <!-- Hero -->
  <main class="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-28">
    <div class="inline-flex items-center gap-2 bg-brand-300/10 border border-brand-300/20 text-brand-300 text-xs font-medium px-4 py-2 rounded-full mb-10 backdrop-blur-sm">
      <span class="w-1.5 h-1.5 bg-brand-300 rounded-full animate-pulse-slow"></span>
      Git for AI Prompts
    </div>

    <h1 class="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-8 leading-[1.05] tracking-tight">
      Stop losing your<br/>
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-brand-200 to-brand-400">best prompts</span>
    </h1>

    <p class="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed">
      Version control, team collaboration, A/B testing, and analytics for your LLM prompts.
      Deploy with confidence. Roll back instantly.
    </p>

    <div class="flex flex-col sm:flex-row gap-4">
      <a href="/register" class="btn-primary text-base px-8 py-3.5">Start for free &rarr;</a>
      <a href="/login" class="btn-secondary text-base px-8 py-3.5">Sign in</a>
    </div>

    <!-- Code snippet -->
    <div class="mt-20 relative group max-w-lg w-full">
      <div class="absolute -inset-0.5 bg-gradient-to-r from-brand-300/20 via-brand-400/10 to-brand-300/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div class="relative bg-surface-900 border border-surface-700 rounded-2xl p-6 text-left font-mono text-sm shadow-glow-sm">
        <div class="flex items-center gap-2 mb-4 pb-3 border-b border-surface-800">
          <div class="w-3 h-3 rounded-full bg-surface-700"></div>
          <div class="w-3 h-3 rounded-full bg-surface-700"></div>
          <div class="w-3 h-3 rounded-full bg-surface-700"></div>
          <span class="ml-auto text-xs text-zinc-600">sdk-example.ts</span>
        </div>
        <div class="text-zinc-500 mb-3 text-xs">// Fetch your prompt at runtime</div>
        <div><span class="text-brand-300">import</span> <span class="text-zinc-200">&#123; PromptClient &#125;</span> <span class="text-brand-300">from</span> <span class="text-emerald-400">'promptvcs'</span></div>
        <br/>
        <div><span class="text-brand-200">const</span> <span class="text-zinc-200">client</span> = <span class="text-brand-400">new</span> <span class="text-zinc-200">PromptClient(&#123; apiKey: </span><span class="text-emerald-400">'pvcs_...'</span><span class="text-zinc-200"> &#125;)</span></div>
        <br/>
        <div><span class="text-brand-200">const</span> <span class="text-zinc-200">prompt</span> = <span class="text-brand-300">await</span> <span class="text-zinc-200">client.get(</span><span class="text-emerald-400">'my-prompt'</span><span class="text-zinc-200">)</span></div>
        <div class="text-zinc-600 text-xs mt-2">// → Always gets the production version</div>
      </div>
    </div>
  </main>

  <!-- Features -->
  <section class="relative z-10 border-t border-surface-800/50 py-28 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need for prompt ops</h2>
        <p class="text-zinc-500 max-w-xl mx-auto">From version tracking to production deployments — manage your entire prompt lifecycle.</p>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        {#each [
          { icon: "🔀", title: "Version History", desc: "Full history of every prompt change with diffs, commit messages, and author tracking." },
          { icon: "🚀", title: "Environment Deployments", desc: "Promote prompts from dev → staging → production with one click. Rollback instantly." },
          { icon: "📊", title: "Analytics & A/B Testing", desc: "Track latency, token costs, and user ratings. Run experiments across prompt versions." },
        ] as feature}
          <div class="card-hover group cursor-default">
            <div class="w-12 h-12 bg-brand-300/10 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-brand-300/15 transition-colors">{feature.icon}</div>
            <h3 class="font-semibold text-white mb-2 text-lg">{feature.title}</h3>
            <p class="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="relative z-10 border-t border-surface-800/50 py-8 px-6">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-2 text-zinc-600 text-sm">
        <div class="w-5 h-5 bg-brand-300/20 rounded-md flex items-center justify-center text-brand-300 font-bold text-[10px]">P</div>
        PromptVCS
      </div>
      <p class="text-zinc-700 text-sm">Version control for the AI era.</p>
    </div>
  </footer>
</div>
