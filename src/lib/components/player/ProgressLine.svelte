<script lang="ts">
	import { player } from '#lib/state/player.svelte.ts';
	import { formatTime } from '#lib/time.ts';

	let { compact = false }: { compact?: boolean } = $props();

	let bar: HTMLDivElement;
	let dragging = $state(false);
	let dragTime = $state(0);

	const shown = $derived(dragging ? dragTime : player.time);
	const total = $derived(player.duration || player.current?.duration || 0);
	const pct = $derived(total ? Math.min(100, (shown / total) * 100) : 0);
	const markers = $derived(
		(player.detail?.comments ?? []).filter((c) => c.timestampSec != null).map((c) => c.timestampSec as number)
	);

	function timeAt(clientX: number) {
		const r = bar.getBoundingClientRect();
		return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * total;
	}
	function down(e: PointerEvent) {
		if (!total) return;
		bar.setPointerCapture(e.pointerId);
		dragging = true;
		dragTime = timeAt(e.clientX);
	}
	function move(e: PointerEvent) {
		if (dragging) dragTime = timeAt(e.clientX);
	}
	function up() {
		if (!dragging) return;
		dragging = false;
		player.seek(dragTime);
	}
	function key(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') player.seek(player.time + 5);
		else if (e.key === 'ArrowLeft') player.seek(player.time - 5);
		else return;
		e.preventDefault();
	}
</script>

<div class="w-full">
	<div
		bind:this={bar}
		class="group relative flex cursor-pointer touch-none items-center {compact ? 'h-4' : 'h-6'}"
		role="slider"
		tabindex="0"
		aria-label="Seek"
		aria-valuemin={0}
		aria-valuemax={Math.round(total)}
		aria-valuenow={Math.round(shown)}
		aria-valuetext={formatTime(shown)}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onkeydown={key}
	>
		<div class="relative h-[3px] w-full overflow-hidden rounded-full bg-line-strong">
			<div class="absolute inset-y-0 left-0 rounded-full bg-accent" style:width="{pct}%"></div>
		</div>
		{#each markers as m}
			<span
				class="pointer-events-none absolute top-1/2 h-[7px] w-[2px] -translate-y-1/2 rounded-full bg-fg-2"
				style:left="{total ? (m / total) * 100 : 0}%"
			></span>
		{/each}
		<span
			class="thumb pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent {dragging
				? 'scale-100'
				: 'scale-0 group-hover:scale-100'}"
			style:left="{pct}%"
		></span>
	</div>
	{#if !compact}
		<div class="tabular mt-1 flex items-center justify-between text-[11.5px] text-fg-3">
			<span>{formatTime(shown)}</span>
			<span>({formatTime(total)})</span>
			<span>-{formatTime(Math.max(0, total - shown))}</span>
		</div>
	{/if}
</div>

<style>
	.thumb {
		transition: transform var(--dur-fade) var(--ease);
	}
</style>
