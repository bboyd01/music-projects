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

	// ── Overlay flow ──────────────────────────────────────────
	// Soft pools of shade and light circling slowly over the overlay. Drawn on a tiny canvas
	// (1/8 of the screen) that the browser stretches to full size: smooth gradients look the same,
	// it costs almost no GPU memory, and it never has to be re-drawn when the photo changes.
	const SCALE = 1 / 8;
	type Blob = { x: number; y: number; rx: number; ry: number; light: boolean };
	type Layer = { period: number; phase: number; dx: number; dy: number; rot: number; zoom: number; blobs: Blob[] };
	// Positions and radii are fractions of the screen (blobs may extend past the edges).
	const flow: Layer[] = [
		{
			period: 25,
			phase: 0,
			dx: 0.06,
			dy: 0.05,
			rot: 4,
			zoom: 0.05,
			blobs: [
				{ x: 0.18, y: 0.21, rx: 0.35, ry: 0.29, light: false },
				{ x: 0.82, y: 0.72, rx: 0.29, ry: 0.38, light: false },
				{ x: 0.6, y: 0.31, rx: 0.26, ry: 0.22, light: true }
			]
		},
		{
			period: 38,
			phase: 2.1,
			dx: 0.05,
			dy: 0.05,
			rot: -4,
			zoom: 0.04,
			blobs: [
				{ x: 0.72, y: 0.18, rx: 0.32, ry: 0.26, light: false },
				{ x: 0.24, y: 0.79, rx: 0.26, ry: 0.32, light: true },
				{ x: 0.4, y: 0.53, rx: 0.29, ry: 0.29, light: false }
			]
		}
	];

	let canvas: HTMLCanvasElement;

	/** Any CSS color → [r, g, b, a]. The canvas normalizes it to "#rrggbb" or "rgba(r, g, b, a)". */
	function parse(ctx: CanvasRenderingContext2D, c: string): [number, number, number, number] {
		ctx.fillStyle = '#000';
		ctx.fillStyle = c.trim() || 'transparent';
		const v = String(ctx.fillStyle);
		if (v.startsWith('#')) return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1];
		const n = v.match(/[\d.]+/g)?.map(Number) ?? [];
		return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, n[3] ?? 1];
	}

	$effect(() => {
		const c2d = canvas.getContext('2d');
		if (!c2d) return;
		const ctx: CanvasRenderingContext2D = c2d;
		const root = document.documentElement;
		const reduced = matchMedia('(prefers-reduced-motion: reduce)');
		const small = matchMedia('(max-width: 767px), (pointer: coarse)');
		let shade = parse(ctx, 'transparent');
		let light = shade;
		let still = false;
		let w = 0;
		let h = 0;

		function refresh() {
			const cs = getComputedStyle(root);
			shade = parse(ctx, cs.getPropertyValue('--flow-shade'));
			light = parse(ctx, cs.getPropertyValue('--flow-light'));
			const m = root.dataset.motion;
			still = reduced.matches || m === 'off' || (m === 'mobile-off' && small.matches);
			w = innerWidth;
			h = innerHeight;
			const cw = Math.max(1, Math.ceil(w * SCALE));
			const ch = Math.max(1, Math.ceil(h * SCALE));
			if (canvas.width !== cw || canvas.height !== ch) {
				canvas.width = cw;
				canvas.height = ch;
			}
		}

		function draw(t: number) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			for (const l of flow) {
				const a = (t / l.period) * Math.PI * 2 + l.phase;
				ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
				ctx.translate(w / 2 + Math.sin(a) * l.dx * w, h / 2 + Math.sin(a * 2 + 1) * l.dy * h);
				ctx.rotate(((Math.sin(a + 0.7) * l.rot) / 180) * Math.PI);
				const z = 1 + Math.sin(a * 2 + 2.3) * l.zoom;
				ctx.scale(z, z);
				ctx.translate(-w / 2, -h / 2);
				for (const b of l.blobs) {
					const [r, g, bl, al] = b.light ? light : shade;
					ctx.save();
					ctx.translate(b.x * w, b.y * h);
					ctx.scale(b.rx * w, b.ry * h);
					const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
					grad.addColorStop(0, `rgba(${r},${g},${bl},${al})`);
					grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
					ctx.fillStyle = grad;
					ctx.fillRect(-1, -1, 2, 2);
					ctx.restore();
				}
			}
		}

		refresh();
		const start = performance.now();
		let raf = 0;
		let timer = 0;
		let last = -Infinity;
		let lastRefresh = 0;
		const tick = (now: number) => {
			// Pick up theme / setting / size changes once a second.
			if (now - lastRefresh > 1000) {
				lastRefresh = now;
				refresh();
				if (still) draw(0); // keeps a static frame current with theme changes
			}
			if (still) {
				// Motion off: no frame loop, just check the settings again in a second.
				timer = window.setTimeout(() => tick(performance.now()), 1000);
				return;
			}
			raf = requestAnimationFrame(tick);
			// The motion is slow, so ~30 fps is plenty.
			if (now - last < 33) return;
			last = now;
			draw((now - start) / 1000);
		};
		draw(0);
		tick(performance.now());
		const onResize = () => {
			refresh();
			draw(still ? 0 : (performance.now() - start) / 1000);
		};
		addEventListener('resize', onResize);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(timer);
			removeEventListener('resize', onResize);
		};
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
	<canvas bind:this={canvas} class="flow absolute inset-0 h-full w-full"></canvas>
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
