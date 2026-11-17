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
	<!-- Two soft layers of shade and light circling slowly on different loops, so the overlay's
	     texture shifts and breathes while the photo stays put. -->
	<div class="flow flow-a"></div>
	<div class="flow flow-b"></div>
	<div class="grain absolute inset-0"></div>
</div>

<style>
	/* Oversized so the edges never show while the layers circle around. */
	.flow {
		position: absolute;
		inset: -30%;
		background-repeat: no-repeat;
		will-change: transform;
		animation: var(--dur) ease-in-out infinite;
	}
	.flow-a {
		--dur: 80s;
		animation-name: orbit-a;
		background-image:
			radial-gradient(22% 18% at 30% 32%, var(--flow-shade), transparent),
			radial-gradient(18% 24% at 70% 64%, var(--flow-shade), transparent),
			radial-gradient(16% 14% at 56% 38%, var(--flow-light), transparent);
	}
	.flow-b {
		--dur: 115s;
		animation-name: orbit-b;
		background-image:
			radial-gradient(20% 16% at 64% 30%, var(--flow-shade), transparent),
			radial-gradient(16% 20% at 34% 68%, var(--flow-light), transparent),
			radial-gradient(18% 18% at 44% 52%, var(--flow-shade), transparent);
	}
	/* Slow closed loops: the shading shifts and breathes in place rather than sweeping past. */
	@keyframes orbit-a {
		0%,
		100% {
			transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
		}
		25% {
			transform: translate3d(6vw, -4vh, 0) rotate(4deg) scale(1.05);
		}
		50% {
			transform: translate3d(2vw, 6vh, 0) rotate(-2deg) scale(0.97);
		}
		75% {
			transform: translate3d(-6vw, 2vh, 0) rotate(3deg) scale(1.03);
		}
	}
	@keyframes orbit-b {
		0%,
		100% {
			transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
		}
		30% {
			transform: translate3d(-5vw, 5vh, 0) rotate(-4deg) scale(1.04);
		}
		60% {
			transform: translate3d(4vw, 3vh, 0) rotate(3deg) scale(0.96);
		}
		80% {
			transform: translate3d(3vw, -5vh, 0) rotate(-2deg) scale(1.02);
		}
	}
	/* Respect the app's motion setting and the OS reduced-motion preference. */
	:global(:root[data-motion='off']) .flow {
		animation: none;
	}
	@media (max-width: 767px), (pointer: coarse) {
		:global(:root[data-motion='mobile-off']) .flow {
			animation: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.flow {
			animation: none;
		}
	}
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
