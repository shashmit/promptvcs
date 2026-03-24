<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, CategoryScale, Filler, Tooltip, Legend } from "chart.js";

  Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, CategoryScale, Filler, Tooltip, Legend);

  export let labels: string[] = [];
  export let datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }> = [];
  export let yLabel = "";

  let canvas: HTMLCanvasElement;
  let chart: Chart;

  $: if (chart && labels && datasets) {
    chart.data.labels = labels;
    chart.data.datasets = datasets.map((d, i) => ({
      label: d.label,
      data: d.data,
      borderColor: d.color || COLORS[i % COLORS.length],
      backgroundColor: (d.color || COLORS[i % COLORS.length]) + "15",
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
      borderWidth: 2,
    }));
    chart.update();
  }

  const COLORS = ["#FDE68A", "#FBBF24", "#34d399", "#F59E0B", "#ef4444"];

  onMount(() => {
    chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: datasets.map((d, i) => ({
          label: d.label,
          data: d.data,
          borderColor: d.color || COLORS[i % COLORS.length],
          backgroundColor: (d.color || COLORS[i % COLORS.length]) + "15",
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#71717a", font: { size: 12 } } },
          tooltip: {
            mode: "index",
            intersect: false,
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
            ticks: { color: "#52525b", maxTicksLimit: 7, font: { size: 11 } },
            grid: { color: "#1E1E22" },
          },
          y: {
            title: { display: !!yLabel, text: yLabel, color: "#52525b" },
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
