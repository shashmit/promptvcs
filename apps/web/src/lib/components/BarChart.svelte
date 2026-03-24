<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend } from "chart.js";

  Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

  export let labels: string[] = [];
  export let datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }> = [];

  let canvas: HTMLCanvasElement;
  let chart: Chart;

  const COLORS = ["#FDE68A", "#FBBF24", "#34d399", "#F59E0B"];

  $: if (chart && labels && datasets) {
    chart.data.labels = labels;
    chart.data.datasets = datasets.map((d, i) => ({
      label: d.label,
      data: d.data,
      backgroundColor: (d.color || COLORS[i % COLORS.length]) + "88",
      borderColor: d.color || COLORS[i % COLORS.length],
      borderWidth: 1,
      borderRadius: 6,
    }));
    chart.update();
  }

  onMount(() => {
    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: datasets.map((d, i) => ({
          label: d.label,
          data: d.data,
          backgroundColor: (d.color || COLORS[i % COLORS.length]) + "88",
          borderColor: d.color || COLORS[i % COLORS.length],
          borderWidth: 1,
          borderRadius: 6,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#71717a", font: { size: 12 } } },
          tooltip: {
            backgroundColor: "#18181B",
            borderColor: "#27272A",
            borderWidth: 1,
            titleColor: "#fafafa",
            bodyColor: "#a1a1aa",
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            ticks: { color: "#52525b", font: { size: 11 } },
            grid: { color: "#1E1E22" },
          },
          y: {
            ticks: { color: "#52525b", font: { size: 11 } },
            grid: { color: "#1E1E22" },
            beginAtZero: true,
          },
        },
      },
    });
  });

  onDestroy(() => chart?.destroy());
</script>

<canvas bind:this={canvas}></canvas>
