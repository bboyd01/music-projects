<script lang="ts">
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import Scan from '@lucide/svelte/icons/scan';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Link2 from '@lucide/svelte/icons/link-2';
	import Check from '@lucide/svelte/icons/check';
	import type { InspirationView } from '#lib/server/queries.ts';
	import { api } from '#lib/api.ts';
	import Popover from '../Popover.svelte';
	import TrackIcon from '../TrackIcon.svelte';
	import InspirationContent from './InspirationContent.svelte';
	import AddInspiration from './AddInspiration.svelte';

	type Track = { id: string; title: string; icon: string | null };
	let {
		items: initial,
		tracks,
		projectId,
		canEdit
	}: { items: InspirationView[]; tracks: Track[]; projectId: string; canEdit: boolean } = $props();

	let items = $state<InspirationView[]>([]);
	$effect(() => {
		items = initial.map((i) => ({ ...i }));
	});

	let viewport: HTMLDivElement;
	let pan = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let selected = $state<string | null>(null);
	let editing = $state<string | null>(null);
	let filter = $state<string>('all'); // 'all' | 'none' | trackId

	const MIN_Z = 0.35;
	const MAX_Z = 1.75;

	// ── Gestures ─────────────────────────────────────────────
	type Gesture =
		| { kind: 'pan'; sx: number; sy: number; ox: number; oy: number }
		| { kind: 'move'; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
		| { kind: 'resize'; id: string; sx: number; sy: number; ow: number; oh: number; ratio: number | null };
	let g = $state<Gesture | null>(null);

	function onBackgroundDown(e: PointerEvent) {
		if (e.button !== 0) return;
		selected = null;
		editing = null;
		g = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
		viewport.setPointerCapture(e.pointerId);
	}

	function onItemDown(e: PointerEvent, it: InspirationView) {
		e.stopPropagation();
		if (e.button !== 0 || editing === it.id) return;
		selected = it.id;
		if (!canEdit) return;
		bringToFront(it);
		g = { kind: 'move', id: it.id, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y, moved: false };
		viewport.setPointerCapture(e.pointerId);
	}

	function onResizeDown(e: PointerEvent, it: InspirationView) {
		e.stopPropagation();
		e.preventDefault();
		const ratio = it.type === 'image' ? it.data.width / it.data.height : null;
		g = { kind: 'resize', id: it.id, sx: e.clientX, sy: e.clientY, ow: it.w, oh: it.h, ratio };
		viewport.setPointerCapture(e.pointerId);
	}

	function onMove(e: PointerEvent) {
		if (!g) return;
		const dx = (e.clientX - g.sx) / (g.kind === 'pan' ? 1 : zoom);
		const dy = (e.clientY - g.sy) / (g.kind === 'pan' ? 1 : zoom);
		if (g.kind === 'pan') {
			pan = { x: g.ox + dx, y: g.oy + dy };
		} else if (g.kind === 'move') {
			if (Math.abs(dx) + Math.abs(dy) > 3) g.moved = true;
			const it = items.find((i) => i.id === (g as { id: string }).id);
			if (it) {
				it.x = Math.round(g.ox + dx);
				it.y = Math.round(g.oy + dy);
			}
		} else {
			const it = items.find((i) => i.id === (g as { id: string }).id);
			if (!it) return;
			const w = Math.max(80, Math.round(g.ow + dx));
			it.w = w;
			it.h = g.ratio ? Math.round(w / g.ratio) : Math.max(56, Math.round(g.oh + dy));
		}
	}

	function onUp() {
		if (!g) return;
		const done = g;
		g = null;
		if (done.kind === 'move' && done.moved) {
			const it = items.find((i) => i.id === done.id)!;
			save(it.id, { x: it.x, y: it.y });
		} else if (done.kind === 'resize') {
			const it = items.find((i) => i.id === done.id)!;
			save(it.id, { w: it.w, h: it.h });
		}
	}

	/** Swallow the click that ends a drag so links (audio items) don't open. */
	let lastMoved = false;
	function onItemClickCapture(e: MouseEvent) {
		if (lastMoved) {
			e.preventDefault();
			e.stopPropagation();
		}
	}
	$effect(() => {
		// Track whether the most recent gesture moved, for the click that follows pointerup.
		const handler = () => (lastMoved = g?.kind === 'move' ? g.moved : false);
		window.addEventListener('pointerup', handler, true);
		return () => window.removeEventListener('pointerup', handler, true);
	});

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		if (e.ctrlKey || e.metaKey) {
			zoomAt(zoom * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
		} else {
			pan = { x: pan.x - e.deltaX, y: pan.y - e.deltaY };
		}
	}

	function zoomAt(next: number, cx?: number, cy?: number) {
		const r = viewport.getBoundingClientRect();
		const px = (cx ?? r.left + r.width / 2) - r.left;
		const py = (cy ?? r.top + r.height / 2) - r.top;
		const z = Math.min(MAX_Z, Math.max(MIN_Z, next));
		// Keep the point under the cursor fixed.
		pan = { x: px - ((px - pan.x) / zoom) * z, y: py - ((py - pan.y) / zoom) * z };
		zoom = z;
	}

	function fit() {
		if (!items.length) {
			pan = { x: 0, y: 0 };
			zoom = 1;
			return;
		}
		const r = viewport.getBoundingClientRect();
		const minX = Math.min(...items.map((i) => i.x));
		const minY = Math.min(...items.map((i) => i.y));
		const maxX = Math.max(...items.map((i) => i.x + i.w));
		const maxY = Math.max(...items.map((i) => i.y + i.h));
		const pad = 40;
		const z = Math.min(MAX_Z, Math.max(MIN_Z, Math.min((r.width - pad * 2) / (maxX - minX), (r.height - pad * 2) / (maxY - minY))));
		zoom = Math.min(1, z);
		pan = {
			x: (r.width - (maxX - minX) * zoom) / 2 - minX * zoom,
			y: (r.height - (maxY - minY) * zoom) / 2 - minY * zoom
		};
	}

	/** Near the visible center — where new items appear, cascading so they don't stack exactly. */
	let cascade = 0;
	function center() {
		const r = viewport.getBoundingClientRect();
		const step = (cascade++ % 8) * 40;
		return {
			x: Math.round((r.width / 2 - pan.x) / zoom - 140 + step),
			y: Math.round((r.height / 2 - pan.y) / zoom - 100 + step)
		};
	}

	// ── Persistence ─────────────────────────────────────────
	function save(id: string, patch: Record<string, unknown>) {
		api('PATCH', `/api/inspirations/${id}`, patch);
	}

	function bringToFront(it: InspirationView) {
		const top = Math.max(0, ...items.map((i) => i.z));
		if (it.z < top) {
			it.z = top + 1;
			save(it.id, { z: it.z });
		}
	}

	async function remove(it: InspirationView) {
		items = items.filter((i) => i.id !== it.id);
		selected = null;
		await api('DELETE', `/api/inspirations/${it.id}`);
	}

	function assign(it: InspirationView, trackId: string | null) {
		it.trackId = trackId;
		save(it.id, { trackId });
	}

	function commitText(it: InspirationView, text: string) {
		editing = null;
		if (it.type === 'text' && text !== it.data.text) {
			it.data.text = text;
			save(it.id, { text });
		}
	}

	function onKey(e: KeyboardEvent) {
		if (!selected || editing || !canEdit) return;
		if ((e.target as HTMLElement).closest('input, textarea, select')) return;
		const it = items.find((i) => i.id === selected);
		if (it && (e.key === 'Delete' || e.key === 'Backspace')) {
			e.preventDefault();
			remove(it);
		}
	}

	const dimmed = (it: InspirationView) =>
		filter !== 'all' && (filter === 'none' ? it.trackId !== null : it.trackId !== filter);
	const trackOf = (id: string | null) => tracks.find((t) => t.id === id);

	let fitted = false;
	$effect(() => {
		if (!fitted && viewport && items.length) {
			fitted = true;
			queueMicrotask(fit);
		}
	});
</script>

<svelte:window onkeydown={onKey} />

<div class="mb-3 flex flex-wrap items-center gap-2">
	{#if canEdit}
		<AddInspiration
			{projectId}
			compact
			place={center}
			onadded={(i) => {
				items = [...items, i];
				selected = i.id;
			}}
		/>
	{/if}
	<div class="flex-1"></div>
	<select class="input h-8 w-auto max-w-48" bind:value={filter} aria-label="Highlight inspirations for a track">
		<option value="all">All inspirations</option>
		<option value="none">Not linked to a track</option>
		{#each tracks as t (t.id)}<option value={t.id}>{t.title}</option>{/each}
	</select>
	<div class="glass flex rounded-lg p-0.5">
		<button class="icon-btn size-7" aria-label="Zoom out" onclick={() => zoomAt(zoom / 1.2)}><ZoomOut size={15} /></button>
		<button class="tabular w-11 text-[12px] text-fg-2" onclick={() => zoomAt(1)} title="Reset zoom">{Math.round(zoom * 100)}%</button>
		<button class="icon-btn size-7" aria-label="Zoom in" onclick={() => zoomAt(zoom * 1.2)}><ZoomIn size={15} /></button>
		<button class="icon-btn size-7" aria-label="Fit to content" title="Fit" onclick={fit}><Scan size={15} /></button>
	</div>
</div>

<div
	bind:this={viewport}
	class="canvas card relative h-[calc(100dvh-19rem-var(--mini-h,0px))] min-h-[420px] touch-none overflow-hidden select-none md:h-[calc(100dvh-17rem-var(--mini-h,0px))]"
	style:background-position="{pan.x}px {pan.y}px"
	style:background-size="{24 * zoom}px {24 * zoom}px"
	role="application"
	aria-label="Inspiration canvas"
	onpointerdown={onBackgroundDown}
	onpointermove={onMove}
	onpointerup={onUp}
	onpointercancel={onUp}
	onwheel={onWheel}
>
	<div class="absolute top-0 left-0 origin-top-left" style:transform="translate({pan.x}px, {pan.y}px) scale({zoom})">
		{#each items as it (it.id)}
			{@const sel = selected === it.id}
			<div
				class="item absolute"
				class:selected={sel}
				class:dim={dimmed(it)}
				class:lifted={g?.kind === 'move' && g.id === it.id && g.moved}
				style:left="{it.x}px"
				style:top="{it.y}px"
				style:width="{it.w}px"
				style:height="{it.h}px"
				style:z-index={it.z}
				role="group"
				aria-label="{it.type} inspiration"
				onpointerdown={(e) => onItemDown(e, it)}
				onclickcapture={onItemClickCapture}
				ondblclick={() => canEdit && it.type === 'text' && (editing = it.id)}
			>
				<div class="content h-full w-full overflow-hidden rounded-xl {it.type === 'image' ? '' : 'glass-blur'}">
					{#if editing === it.id && it.type === 'text'}
						<!-- svelte-ignore a11y_autofocus -->
						<textarea
							class="h-full w-full resize-none bg-transparent px-3.5 py-3 text-[13.5px] leading-relaxed outline-none"
							value={it.data.text}
							autofocus
							onpointerdown={(e) => e.stopPropagation()}
							onblur={(e) => commitText(it, e.currentTarget.value)}
							onkeydown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
						></textarea>
					{:else}
						<InspirationContent item={it} fill />
					{/if}
				</div>

				{#if it.trackId && trackOf(it.trackId)}
					{@const t = trackOf(it.trackId)!}
					<span class="track-tag chip absolute -top-3 left-2 h-[22px] max-w-[90%] px-2 text-[11px]">
						{#if t.icon}<TrackIcon icon={t.icon} size={11} />{/if}<span class="truncate">{t.title}</span>
					</span>
				{/if}

				{#if sel && canEdit}
					<!-- Toolbar sits above the item; counter-scaled so it stays readable at any zoom. -->
					<div
						class="menu absolute -top-11 right-0 flex !min-w-0 items-center gap-0.5 !p-0.5"
						style:transform="scale({1 / zoom})"
						style:transform-origin="bottom right"
						onpointerdown={(e) => e.stopPropagation()}
						role="toolbar"
						tabindex="-1"
					>
						{#if it.type === 'text'}
							<button class="icon-btn size-8" aria-label="Edit text" title="Edit (or double-click)" onclick={() => (editing = it.id)}><Pencil size={14} /></button>
						{/if}
						<Popover label="Link to a track" width={220} align="end" triggerClass="icon-btn size-8">
							{#snippet trigger()}<Link2 size={14} />{/snippet}
							{#snippet children({ close })}
								<p class="eyebrow px-2.5 pt-1.5 pb-1">Link to track</p>
								<button class="menu-item" onclick={() => { close(); assign(it, null); }}>
									<span class="flex-1">No track</span>{#if !it.trackId}<Check size={14} />{/if}
								</button>
								{#each tracks as t (t.id)}
									<button class="menu-item" onclick={() => { close(); assign(it, t.id); }}>
										{#if t.icon}<TrackIcon icon={t.icon} size={14} />{/if}<span class="flex-1 truncate">{t.title}</span>{#if it.trackId === t.id}<Check size={14} />{/if}
									</button>
								{/each}
							{/snippet}
						</Popover>
						<button class="icon-btn size-8 hover:text-danger" aria-label="Delete" onclick={() => remove(it)}><Trash2 size={14} /></button>
					</div>
					<button
						class="resize absolute -right-2 -bottom-2 size-5 cursor-nwse-resize rounded-full border-2 border-accent bg-[var(--bg)]"
						style:transform="scale({1 / zoom})"
						aria-label="Resize"
						onpointerdown={(e) => onResizeDown(e, it)}
					></button>
				{/if}
			</div>
		{/each}
	</div>

	{#if !items.length}
		<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
			<p class="serif mb-1 text-2xl">An empty canvas</p>
			<p class="text-fg-3">Add text, images and songs that inspire this project.<br />Drag to arrange, link them to tracks.</p>
		</div>
	{/if}
</div>
<p class="mt-2 hidden text-[12px] text-fg-3 md:block">Drag the background to pan · scroll to move · Ctrl/⌘ + scroll to zoom · double-click text to edit · Delete removes the selected item</p>

<style>
	.canvas {
		background-image: radial-gradient(circle, var(--line-strong) 1px, transparent 1.2px);
		cursor: grab;
	}
	.canvas:active {
		cursor: grabbing;
	}
	.item {
		cursor: default;
		transition:
			opacity var(--dur-fade) var(--ease),
			transform var(--dur-panel) var(--ease),
			filter var(--dur-panel) var(--ease);
	}
	.item .content {
		box-shadow: var(--shadow);
		border: 1px solid var(--line);
	}
	.item.selected .content {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.item.lifted {
		transform: scale(1.015);
		filter: drop-shadow(0 18px 24px rgb(0 0 0 / 0.35));
		cursor: grabbing;
	}
	.item.dim {
		opacity: 0.25;
	}
	.track-tag {
		background: var(--glass-strong);
		border: 1px solid var(--line);
		color: var(--fg-2);
	}
	.resize {
		transform-origin: center;
	}
</style>
