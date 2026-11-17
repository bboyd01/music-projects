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
	<!-- Soft pools of shade and light that wander slowly across the screen. -->
	<div class="shade shade-a"></div>
	<div class="shade shade-b"></div>
	<div class="grain absolute inset-0"></div>
</div>

<style>
	.photo {
		filter: var(--photo-filter);
		transform: scale(1.15);
		transition: opacity var(--dur-panel) var(--ease);
		will-change: opacity, transform;
		animation: photo-drift 90s ease-in-out infinite alternate;
	}
	@keyframes photo-drift {
		0% {
			transform: scale(1.15) translate3d(-1.5%, -1%, 0);
		}
		50% {
			transform: scale(1.19) translate3d(1%, 1.5%, 0);
		}
		100% {
			transform: scale(1.16) translate3d(1.5%, -1.2%, 0);
		}
	}

	/* Oversized so their edges never show while they move. */
	.shade {
		position: absolute;
		width: 140vmax;
		height: 140vmax;
		left: 50%;
		top: 50%;
		margin: -70vmax 0 0 -70vmax;
		will-change: transform;
	}
	.shade-a {
		background: radial-gradient(closest-side, var(--shade-dark), transparent);
		animation: wander-a 70s ease-in-out infinite alternate;
	}
	.shade-b {
		background: radial-gradient(closest-side, var(--shade-light), transparent);
		animation: wander-b 95s ease-in-out infinite alternate;
	}
	@keyframes wander-a {
		0% {
			transform: translate3d(-38vw, -30vh, 0) scale(0.9);
		}
		50% {
			transform: translate3d(20vw, 10vh, 0) scale(1.05);
		}
		100% {
			transform: translate3d(36vw, -22vh, 0) scale(0.95);
		}
	}
	@keyframes wander-b {
		0% {
			transform: translate3d(34vw, 32vh, 0) scale(0.75);
		}
		50% {
			transform: translate3d(-12vw, -6vh, 0) scale(0.9);
		}
		100% {
			transform: translate3d(-36vw, 26vh, 0) scale(0.8);
		}
	}

	/* Respect the app's motion setting and the OS reduced-motion preference. */
	:global(:root[data-motion='off']) .photo,
	:global(:root[data-motion='off']) .shade {
		animation: none;
	}
	@media (max-width: 767px), (pointer: coarse) {
		:global(:root[data-motion='mobile-off']) .photo,
		:global(:root[data-motion='mobile-off']) .shade {
			animation: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.photo,
		.shade {
			animation: none;
		}
	}
	/* Very faint film grain keeps flat areas from banding and adds texture. */
	.grain {
		opacity: 0.05;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
		mix-blend-mode: overlay;
	}
</style>
