<script lang="ts">
	import { ui } from '#lib/state/ui.svelte.ts';

	/** Two stacked layers so a new photo can crossfade over the old one. */
	let layers = $state<{ id: number; url: string; shown: boolean }[]>([]);
	let n = 0;

	$effect(() => {
		const url = ui.backdrop;
		if (layers.at(-1)?.url === url) return;
		const id = ++n;
		const img = new Image();
		img.onload = img.onerror = () => {
			if (id !== n) return;
			layers = [...layers.slice(-1), { id, url, shown: false }];
			requestAnimationFrame(() => {
				layers = layers.map((l) => (l.id === id ? { ...l, shown: true } : l));
				setTimeout(() => (layers = layers.filter((l) => l.id === id || l.id > id)), 400);
			});
		};
		img.src = url;
	});
</script>

<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
	{#each layers as l (l.id)}
		<div
			class="photo absolute inset-0 bg-cover bg-center"
			style:background-image="url('{l.url}')"
			style:opacity={l.shown ? 1 : 0}
		></div>
	{/each}
	<div class="absolute inset-0" style:background="var(--overlay)"></div>
	<div class="grain absolute inset-0"></div>
</div>

<style>
	.photo {
		filter: var(--photo-filter);
		transform: scale(1.15);
		transition: opacity var(--dur-panel) var(--ease);
		will-change: opacity;
	}
	/* Very faint film grain keeps flat areas from banding and adds texture. */
	.grain {
		opacity: 0.05;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
		mix-blend-mode: overlay;
	}
</style>
