<script lang="ts">
	import { bars } from '#lib/waveform.ts';

	let {
		peaks,
		progress,
		hover = null,
		height
	}: { peaks: number[]; progress: number; hover?: number | null; height: number } = $props();

	const BAR = 3;
	const GAP = 1;
	const RADIUS = 1.5;
	const MIN_BAR = 2; // silence still shows a hairline

	let canvas: HTMLCanvasElement;
	let width = $state(0);
	const heights = $derived(bars(peaks, Math.max(1, Math.floor((width + GAP) / (BAR + GAP)))));

	let frame = 0;
	$effect(() => {
		// Track everything that affects the drawing, then draw on the next frame.
		const h = heights;
		const p = progress;
		const hv = hover;
		const w = width;
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => draw(h, p, hv, w));
		return () => cancelAnimationFrame(frame);
	});

	function draw(h: number[], p: number, hv: number | null, w: number) {
		if (!canvas || !w) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(height * dpr);
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, height);
		const css = getComputedStyle(canvas);
		const played = css.getPropertyValue('--accent').trim() || '#c9a35c';
		const rest = css.getPropertyValue('--fg-3').trim() || 'rgba(255,255,255,0.4)';
		const hovered = css.getPropertyValue('--fg-2').trim() || 'rgba(255,255,255,0.66)';
		const playedX = p * w;
		const hoverX = hv === null ? -1 : hv * w;
		for (let i = 0; i < h.length; i++) {
			const x = i * (BAR + GAP);
			const bh = Math.max(MIN_BAR, h[i] * height);
			const y = (height - bh) / 2;
			const mid = x + BAR / 2;
			ctx.fillStyle = mid <= playedX ? played : mid <= hoverX ? hovered : rest;
			ctx.beginPath();
			ctx.roundRect(x, y, BAR, bh, Math.min(RADIUS, bh / 2));
			ctx.fill();
		}
	}
</script>

<div class="relative w-full" style:height="{height}px" bind:clientWidth={width}>
	<canvas bind:this={canvas} class="absolute inset-0 h-full w-full" aria-hidden="true"></canvas>
</div>
