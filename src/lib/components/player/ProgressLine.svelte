<script lang="ts">
	import { player } from '#lib/state/player.svelte.ts';
	import { formatTime } from '#lib/time.ts';
	import { page } from '$app/state';
	import Waveform from './Waveform.svelte';

	let { compact = false, waveHeight = compact ? 24 : 64 }: { compact?: boolean; waveHeight?: number } = $props();

	// On by default; users can pick the plain line in Settings → Appearance. Falls back to the line without peaks.
	const peaks = $derived(player.current?.peaks ?? null);
	const useWave = $derived((page.data.user?.settings?.timeline ?? 'waveform') === 'waveform' && !!peaks?.length);

	let bar: HTMLDivElement;
	let dragging = $state(false);
	let dragTime = $state(0);
	/** Mouse hover position (0–1) for the time tooltip; null when not hovering. */
	let hover = $state<number | null>(null);

	const shown = $derived(dragging ? dragTime : player.time);
	const total = $derived(player.duration || player.current?.duration || 0);
	const pct = $derived(total ? Math.min(100, (shown / total) * 100) : 0);
	// Only use comment details that belong to the track that's playing.
	const timed = $derived(
		player.detail && player.detail.track.id === player.current?.id
			? player.detail.comments.filter((c) => c.timestampSec != null)
			: []
	);
	const markers = $derived(timed.map((c) => c.timestampSec as number));

	/** Pixels from a marker within which hovering previews its comment(s). */
	const NEAR_PX = 8;
	let barWidth = $state(0);
	const near = $derived.by(() => {
		if (hover === null || dragging || !total || !barWidth) return [];
		const x = hover * barWidth;
		const hits = timed
			.map((c) => ({ c, d: Math.abs(((c.timestampSec as number) / total) * barWidth - x) }))
			.filter((h) => h.d <= NEAR_PX)
			.sort((a, b) => a.d - b.d || a.c.createdAt - b.c.createdAt);
		return hits.map((h) => h.c);
	});
	const nearPct = $derived(near.length && total ? ((near[0].timestampSec as number) / total) * 100 : 0);

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
		if (e.pointerType === 'mouse' && total) {
			const r = bar.getBoundingClientRect();
			barWidth = r.width;
			hover = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
		}
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
		class="group relative flex cursor-pointer touch-none items-center {useWave ? '' : compact ? 'h-4' : 'h-6'}"
		style:height={useWave ? `${waveHeight}px` : undefined}
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
		onpointerleave={() => (hover = null)}
		onkeydown={key}
	>
		{#if near.length}
			{@const c = near[0]}
			<!-- Comment preview, above the time tooltip, anchored to the comment's marker. -->
			<div
				class="tip comment-tip pointer-events-none absolute bottom-full mb-9 w-max max-w-[min(280px,90%)] -translate-x-1/2 rounded-lg px-2.5 py-1.5 text-left text-[13px] leading-snug"
				style:left="clamp(min(140px, 45%), {nearPct}%, calc(100% - min(140px, 45%)))"
			>
				<p class="mb-0.5 flex items-center gap-1.5 text-[12px] text-fg-3">
					<span class="font-semibold text-fg-2">{c.author.name}</span>
					<span class="ts-chip !h-4 !px-1 !text-[11px]">{formatTime(c.timestampSec)}</span>
					{#if c.resolvedAt}<span class="text-accent">✓ Resolved</span>{/if}
				</p>
				<p class="line-clamp-3 whitespace-pre-wrap text-fg">{c.body}</p>
				{#if near.length > 1}<p class="mt-0.5 text-[12px] text-fg-3">+{near.length - 1} more here</p>{/if}
			</div>
		{/if}
		{#if hover !== null}
			<span
				class="tip tabular pointer-events-none absolute bottom-full mb-1.5 -translate-x-1/2 rounded-md px-2 py-0.5 text-[12.5px] font-medium"
				style:left="clamp(1.25rem, {hover * 100}%, calc(100% - 1.25rem))"
			>
				{formatTime(dragging ? dragTime : hover * total)}
			</span>
		{/if}
		{#if useWave && peaks}
			<Waveform {peaks} progress={pct / 100} hover={dragging && total ? dragTime / total : hover} height={waveHeight} />
			{#each markers as m}
				<!-- Comment markers: small dots along the top edge of the waveform. -->
				<span
					class="pointer-events-none absolute top-0 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg ring-2 ring-[var(--bg)]"
					style:left="{total ? (m / total) * 100 : 0}%"
				></span>
			{/each}
		{:else}
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
		{/if}
	</div>
	{#if !compact}
		<div class="tabular mt-1 flex items-center justify-between text-[12.5px] text-fg-3">
			<span>{formatTime(shown)}</span>
			<span>({formatTime(total)})</span>
			<span>-{formatTime(Math.max(0, total - shown))}</span>
		</div>
	{/if}
</div>

<style>
	.tip.comment-tip {
		white-space: normal;
	}
	.tip {
		background: var(--glass-popup);
		border: 1px solid var(--line);
		box-shadow: var(--shadow);
		color: var(--fg);
		white-space: nowrap;
	}
	.thumb {
		transition: transform var(--dur-fade) var(--ease);
	}
</style>
