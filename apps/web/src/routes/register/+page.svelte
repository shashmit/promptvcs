<script lang="ts">
  import { authApi } from "$lib/api";
  import { user } from "$lib/stores/auth";
  import { goto } from "$app/navigation";

  let name = "";
  let email = "";
  let password = "";
  let error = "";
  let loading = false;

  async function handleSubmit() {
    error = "";
    loading = true;
    try {
      const result = await authApi.signUp(name, email, password) as any;
      if (result?.user) {
        user.set(result.user);
        goto("/dashboard");
      }
    } catch (e: any) {
      error = e.message || "Registration failed";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Sign up — PromptVCS</title></svelte:head>

<div class="min-h-screen flex items-center justify-center bg-surface-950 px-4 relative">
  <div class="fixed inset-0 bg-glow-yellow pointer-events-none"></div>

  <div class="w-full max-w-md relative z-10">
    <div class="text-center mb-8">
      <div class="w-14 h-14 bg-brand-300 rounded-2xl flex items-center justify-center text-surface-950 font-bold text-2xl mx-auto mb-5 shadow-glow">P</div>
      <h1 class="text-2xl font-bold text-white">Create your account</h1>
      <p class="text-zinc-500 mt-2">Start versioning your prompts today</p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="card space-y-5">
      {#if error}
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
      {/if}

      <div>
        <label class="label" for="name">Full name</label>
        <input id="name" type="text" bind:value={name} class="input" placeholder="Jane Doe" required />
      </div>

      <div>
        <label class="label" for="email">Email</label>
        <input id="email" type="email" bind:value={email} class="input" placeholder="you@example.com" required />
      </div>

      <div>
        <label class="label" for="password">Password</label>
        <input id="password" type="password" bind:value={password} class="input" placeholder="Min. 8 characters" minlength="8" required />
      </div>

      <button type="submit" disabled={loading} class="btn-primary w-full py-3 disabled:opacity-50">
        {loading ? "Creating account..." : "Create account →"}
      </button>
    </form>

    <p class="text-center text-zinc-600 text-sm mt-6">
      Already have an account? <a href="/login" class="text-brand-300 hover:text-brand-200 transition-colors">Sign in</a>
    </p>
  </div>
</div>
