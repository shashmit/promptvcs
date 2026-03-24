<script lang="ts">
  export let title: string = "";
</script>

<header class="border-b border-surface-800 px-8 py-4 flex items-center justify-between">
  <h1 class="text-xl font-semibold text-white tracking-tight">{title}</h1>
  <slot />
</header>
