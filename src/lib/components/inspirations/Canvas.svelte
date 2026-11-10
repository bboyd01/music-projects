<script lang="ts">
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import Scan from '@lucide/svelte/icons/scan';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import Check from '@lucide/svelte/icons/check';
	import type { ConnectionView, InspirationView } from '#lib/server/queries.ts';
	import type { ConnectionSide, ConnectionStyle } from '#lib/server/db/schema.ts';
	import { api } from '#lib/api.ts';
	import { slide } from '#lib/transitions.ts';
	import InspirationContent from './InspirationContent.svelte';
	import AddInspiration from './AddInspiration.svelte';

	let {
		items: initialItems,
		connections: initialConns,
		projectId,
		canEdit
	}: { items: InspirationView[]; connections: ConnectionView[]; projectId: string; canEdit: boolean } = $props();

	let items = $state<InspirationView[]>([]);
	let conns = $state<ConnectionView[]>([]);
	$effect(() => {
		items = initialItems.map((i) => ({ ...i }));
	});
	$effect(() => {
		conns = initialConns.map((c) => ({ ...c }));
	});

	let viewport: HTMLDivElement;
	let pan = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let selected = $state<string | null>(null);
	let editing = $state<string | null>(null);

	const MIN_Z = 0.35;
	const MAX_Z = 1.75;
	const SIDES: ConnectionSide[] = ['top', 'right', 'bottom', 'left'];

	// ── Geometry ─────────────────────────────────────────────
	type Pt = { x: number; y: number };
	const normals: Record<ConnectionSide, Pt> = {
		top: { x: 0, y: -1 },
		right: { x: 1, y: 0 },
		bottom: { x: 0, y: 1 },
		left: { x: -1, y: 0 }
	};

	function pole(it: InspirationView, side: ConnectionSide): Pt {
		if (side === 'top') return { x: it.x + it.w / 2, y: it.y };
		if (side === 'right') return { x: it.x + it.w, y: it.y + it.h / 2 };
		if (side === 'bottom') return { x: it.x + it.w / 2, y: it.y + it.h };
		return { x: it.x, y: it.y + it.h / 2 };
	}

	/** Smooth curve leaving each pole along its side's normal. */
	function curve(a: Pt, na: Pt, b: Pt, nb: Pt | null) {
		const d = Math.max(40, Math.hypot(b.x - a.x, b.y - a.y) * 0.4);
		const c1 = { x: a.x + na.x * d, y: a.y + na.y * d };
		const c2 = nb ? { x: b.x + nb.x * d, y: b.y + nb.y * d } : b;
		return `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
	}

	const byId = $derived(new Map(items.map((i) => [i.id, i])));
	const lines = $derived(
		conns
			.map((c) => {
				const a = byId.get(c.fromId);
				const b = byId.get(c.toId);
				if (!a || !b) return null;
				return { c, d: curve(pole(a, c.fromSide), normals[c.fromSide], pole(b, c.toSide), normals[c.toSide]) };
			})
			.filter((l): l is { c: ConnectionView; d: string } => l !== null)
	);

	function toWorld(clientX: number, clientY: number): Pt {
		const r = viewport.getBoundingClientRect();
		return { x: (clientX - r.left - pan.x) / zoom, y: (clientY - r.top - pan.y) / zoom };
	}

	// ── Gestures ─────────────────────────────────────────────
	type Gesture =
		| { kind: 'pan'; sx: number; sy: number; ox: number; oy: number }
		| { kind: 'move'; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
		| { kind: 'resize'; id: string; sx: number; sy: number; ow: number; oh: number; ratio: number | null }
		| { kind: 'connect'; fromId: string; fromSide: ConnectionSide; at: Pt; overId: string | null };
	let g = $state<Gesture | null>(null);

	function onBackgroundDown(e: PointerEvent) {
		if (e.button !== 0) return;
		selected = null;
		editing = null;
		lineMenu = null;
		g = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
		viewport.setPointerCapture(e.pointerId);
	}

	function onItemDown(e: PointerEvent, it: InspirationView) {
		e.stopPropagation();
		lineMenu = null;
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

	function onPoleDown(e: PointerEvent, it: InspirationView, side: ConnectionSide) {
		e.stopPropagation();
		e.preventDefault();
		lineMenu = null;
		g = { kind: 'connect', fromId: it.id, fromSide: side, at: toWorld(e.clientX, e.clientY), overId: null };
		viewport.setPointerCapture(e.pointerId);
	}

	function itemAt(p: Pt, exclude?: string) {
		return [...items]
			.sort((a, b) => b.z - a.z)
			.find((i) => i.id !== exclude && p.x >= i.x && p.x <= i.x + i.w && p.y >= i.y && p.y <= i.y + i.h);
	}

	function nearestSide(it: InspirationView, p: Pt): ConnectionSide {
		return SIDES.reduce((best, s) => {
			const a = pole(it, s);
			const b = pole(it, best);
			return Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? s : best;
		}, 'top' as ConnectionSide);
	}

	function onMove(e: PointerEvent) {
		if (!g) return;
		if (g.kind === 'connect') {
			g.at = toWorld(e.clientX, e.clientY);
			g.overId = itemAt(g.at, g.fromId)?.id ?? null;
			return;
		}
		const dx = (e.clientX - g.sx) / (g.kind === 'pan' ? 1 : zoom);
		const dy = (e.clientY - g.sy) / (g.kind === 'pan' ? 1 : zoom);
		if (g.kind === 'pan') {
			pan = { x: g.ox + dx, y: g.oy + dy };
		} else if (g.kind === 'move') {
			if (Math.abs(dx) + Math.abs(dy) > 3) g.moved = true;
			const it = byId.get(g.id);
			if (it) {
				it.x = Math.round(g.ox + dx);
				it.y = Math.round(g.oy + dy);
			}
		} else {
			const it = byId.get(g.id);
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
			const it = byId.get(done.id)!;
			save(it.id, { x: it.x, y: it.y });
		} else if (done.kind === 'resize') {
			const it = byId.get(done.id)!;
			save(it.id, { w: it.w, h: it.h });
		} else if (done.kind === 'connect') {
			const target = itemAt(done.at, done.fromId);
			if (target) connect(done.fromId, done.fromSide, target.id, nearestSide(target, done.at));
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
		const handler = () => (lastMoved = g?.kind === 'move' ? g.moved : false);
		window.addEventListener('pointerup', handler, true);
		return () => window.removeEventListener('pointerup', handler, true);
	});

	/** Plain scrolling scrolls the page; pinch / Ctrl+scroll zooms the canvas. */
	function onWheel(e: WheelEvent) {
		if (!(e.ctrlKey || e.metaKey)) return;
		e.preventDefault();
		zoomAt(zoom * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
	}

	function zoomAt(next: number, cx?: number, cy?: number) {
		const r = viewport.getBoundingClientRect();
		const px = (cx ?? r.left + r.width / 2) - r.left;
		const py = (cy ?? r.top + r.height / 2) - r.top;
		const z = Math.min(MAX_Z, Math.max(MIN_Z, next));
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
		const pad = 48;
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
		conns = conns.filter((c) => c.fromId !== it.id && c.toId !== it.id);
		selected = null;
		await api('DELETE', `/api/inspirations/${it.id}`);
	}

	function commitText(it: InspirationView, text: string) {
		editing = null;
		if (it.type === 'text' && text !== it.data.text) {
			it.data.text = text;
			save(it.id, { text });
		}
	}

	// ── Connections ─────────────────────────────────────────
	async function connect(fromId: string, fromSide: ConnectionSide, toId: string, toSide: ConnectionSide) {
		const dup = conns.find(
			(c) => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
		);
		if (dup) return;
		const c = await api<ConnectionView>('POST', `/api/projects/${projectId}/connections`, { fromId, fromSide, toId, toSide });
		conns = [...conns, c];
	}

	let lineMenu = $state<{ id: string; x: number; y: number } | null>(null);
	const menuConn = $derived(lineMenu ? conns.find((c) => c.id === lineMenu!.id) : undefined);

	function onLineClick(e: MouseEvent, c: ConnectionView) {
		e.stopPropagation();
		if (!canEdit) return;
		selected = null;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		lineMenu = { id: c.id, x: Math.min(e.clientX, vw - 216), y: Math.min(e.clientY + 8, vh - 260) };
	}

	async function setStyle(c: ConnectionView, style: ConnectionStyle) {
		c.style = style;
		await api('PATCH', `/api/connections/${c.id}`, { style });
	}

	async function reverse(c: ConnectionView) {
		[c.fromId, c.toId, c.fromSide, c.toSide] = [c.toId, c.fromId, c.toSide, c.fromSide];
		await api('PATCH', `/api/connections/${c.id}`, { reverse: true });
	}

	async function removeConn(c: ConnectionView) {
		conns = conns.filter((x) => x.id !== c.id);
		lineMenu = null;
		await api('DELETE', `/api/connections/${c.id}`);
	}

	const styles: { value: ConnectionStyle; label: string }[] = [
		{ value: 'line', label: 'Line' },
		{ value: 'dotted', label: 'Dotted line' },
		{ value: 'arrow', label: 'Arrow' },
		{ value: 'both', label: 'Two-way arrow' }
	];

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') lineMenu = null;
		if (!canEdit || editing) return;
		if ((e.target as HTMLElement).closest('input, textarea, select')) return;
		if (e.key !== 'Delete' && e.key !== 'Backspace') return;
		if (menuConn) {
			e.preventDefault();
			removeConn(menuConn);
		} else if (selected) {
			const it = byId.get(selected);
			if (it) {
				e.preventDefault();
				remove(it);
			}
		}
	}

	function onWindowPointer(e: PointerEvent) {
		if (lineMenu && !(e.target as HTMLElement).closest('[data-line-menu]')) lineMenu = null;
	}

	let fitted = false;
	$effect(() => {
		if (!fitted && viewport && items.length) {
			fitted = true;
			queueMicrotask(fit);
		}
	});
</script>

<svelte:window onkeydown={onKey} onpointerdown={onWindowPointer} />

{#snippet stylePreview(style: ConnectionStyle)}
	<svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true" class="shrink-0">
		<line x1="3" y1="5" x2="25" y2="5" stroke="currentColor" stroke-width="1.6" stroke-dasharray={style === 'dotted' ? '1.5 3' : undefined} stroke-linecap="round" />
		{#if style === 'arrow' || style === 'both'}<path d="M21 1.5 L26 5 L21 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />{/if}
		{#if style === 'both'}<path d="M7 1.5 L2 5 L7 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />{/if}
	</svg>
{/snippet}

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
	<div class="glass flex rounded-lg p-0.5">
		<button class="icon-btn size-7" aria-label="Zoom out" onclick={() => zoomAt(zoom / 1.2)}><ZoomOut size={15} /></button>
		<button class="tabular w-11 text-[12px] text-fg-2" onclick={() => zoomAt(1)} title="Reset zoom">{Math.round(zoom * 100)}%</button>
		<button class="icon-btn size-7" aria-label="Zoom in" onclick={() => zoomAt(zoom * 1.2)}><ZoomIn size={15} /></button>
		<button class="icon-btn size-7" aria-label="Fit to content" title="Fit" onclick={fit}><Scan size={15} /></button>
	</div>
</div>

<div
	bind:this={viewport}
	class="canvas card relative h-[min(72dvh,780px)] min-h-[440px] touch-none overflow-hidden select-none"
	class:connecting={g?.kind === 'connect'}
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
		<!-- Connections sit under the items. -->
		<svg class="lines absolute top-0 left-0 overflow-visible" width="1" height="1" aria-hidden="true">
			<defs>
				{#each [['n', 'var(--fg-2)'], ['a', 'var(--accent)']] as [k, color]}
					<marker id="end-{k}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto">
						<path d="M1 1 L9 5 L1 9" fill="none" style:stroke={color} stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
					</marker>
					<marker id="start-{k}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
						<path d="M1 1 L9 5 L1 9" fill="none" style:stroke={color} stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
					</marker>
				{/each}
			</defs>
			{#each lines as { c, d } (c.id)}
				{@const k = lineMenu?.id === c.id ? 'a' : 'n'}
				<path
					{d}
					class="line"
					class:active={k === 'a'}
					fill="none"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-dasharray={c.style === 'dotted' ? '2 6' : undefined}
					marker-end={c.style === 'arrow' || c.style === 'both' ? `url(#end-${k})` : undefined}
					marker-start={c.style === 'both' ? `url(#start-${k})` : undefined}
				/>
				<!-- Wide invisible stroke makes thin lines easy to click and tap. -->
				<path
					{d}
					class="hit"
					fill="none"
					stroke="transparent"
					stroke-width="16"
					role="button"
					tabindex="0"
					aria-label="Connection — press Enter to style"
					onpointerdown={(e) => e.stopPropagation()}
					onclick={(e) => onLineClick(e, c)}
					onkeydown={(e) => {
						if (e.key !== 'Enter' && e.key !== ' ') return;
						const r = (e.currentTarget as SVGPathElement).getBoundingClientRect();
						onLineClick(new MouseEvent('click', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }), c);
					}}
				/>
			{/each}
			{#if g?.kind === 'connect'}
				{@const from = byId.get(g.fromId)}
				{#if from}
					<path d={curve(pole(from, g.fromSide), normals[g.fromSide], g.at, null)} class="line active" fill="none" stroke-width="1.6" stroke-dasharray="4 5" />
				{/if}
			{/if}
		</svg>

		{#each items as it (it.id)}
			{@const sel = selected === it.id}
			<div
				class="item absolute"
				class:selected={sel}
				class:target={g?.kind === 'connect' && g.overId === it.id}
				class:lifted={g?.kind === 'move' && g.id === it.id && g.moved}
				style:left="{it.x}px"
				style:top="{it.y}px"
				style:width="{it.w}px"
				style:height="{it.h}px"
				style:z-index={it.z + 1}
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

				{#if canEdit && editing !== it.id}
					<!-- Drag from a pole to another item to connect them. -->
					{#each SIDES as side (side)}
						<button
							type="button"
							class="pole pole-{side}"
							style:--s={1 / zoom}
							aria-label="Connect from {side}"
							title="Drag to another item to connect"
							onpointerdown={(e) => onPoleDown(e, it, side)}
						></button>
					{/each}
				{/if}

				{#if sel && canEdit}
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
			<p class="text-fg-3">Add text, images and songs that inspire this project.<br />Drag to arrange; drag from an edge dot to connect items.</p>
		</div>
	{/if}
</div>
<p class="mt-2 hidden text-[12px] text-fg-3 md:block">
	Drag the background to pan · Ctrl/⌘ + scroll or pinch to zoom · drag an edge dot onto another item to connect · click a line to style it · double-click text to edit
</p>

{#if lineMenu && menuConn}
	<div
		class="menu fixed w-[208px]"
		style:left="{lineMenu.x}px"
		style:top="{lineMenu.y}px"
		role="menu"
		tabindex="-1"
		data-line-menu
		transition:slide={{ y: -4 }}
	>
		{#each styles as s (s.value)}
			<button class="menu-item" role="menuitemradio" aria-checked={menuConn.style === s.value} onclick={() => setStyle(menuConn, s.value)}>
				{@render stylePreview(s.value)}
				<span class="flex-1">{s.label}</span>
				{#if menuConn.style === s.value}<Check size={14} />{/if}
			</button>
		{/each}
		{#if menuConn.style === 'arrow'}
			<button class="menu-item" onclick={() => reverse(menuConn)}><ArrowLeftRight size={14} class="mx-[7px]" /> Reverse direction</button>
		{/if}
		<div class="my-1 h-px bg-line"></div>
		<button class="menu-item !text-danger" onclick={() => removeConn(menuConn)}><Trash2 size={14} class="mx-[7px]" /> Delete line</button>
	</div>
{/if}

<style>
	.canvas {
		background-image: radial-gradient(circle, var(--line-strong) 1px, transparent 1.2px);
		cursor: grab;
	}
	.canvas:active {
		cursor: grabbing;
	}
	.canvas.connecting {
		cursor: crosshair;
	}
	.lines {
		pointer-events: none;
		z-index: 0;
	}
	.line {
		stroke: var(--fg-2);
		transition: stroke var(--dur-fade) var(--ease);
	}
	.line.active {
		stroke: var(--accent);
	}
	.hit {
		pointer-events: stroke;
		cursor: pointer;
		outline: none;
	}
	.hit:focus-visible {
		stroke: var(--accent-soft);
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
	.item.selected .content,
	.item.target .content {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.item.lifted {
		transform: scale(1.015);
		filter: drop-shadow(0 18px 24px rgb(0 0 0 / 0.35));
		cursor: grabbing;
	}
	.resize {
		transform-origin: center;
	}

	/* Connection poles: shown on hover, on the selected item, and on every item while connecting. */
	.pole {
		position: absolute;
		width: 12px;
		height: 12px;
		margin: -6px 0 0 -6px;
		border-radius: 999px;
		background: var(--bg);
		border: 2px solid var(--accent);
		cursor: crosshair;
		opacity: 0;
		transform: scale(var(--s, 1));
		transition: opacity var(--dur-fade) var(--ease);
		touch-action: none;
	}
	.pole::after {
		/* Larger invisible touch target. */
		content: '';
		position: absolute;
		inset: -10px;
	}
	.pole-top {
		left: 50%;
		top: 0;
	}
	.pole-right {
		left: 100%;
		top: 50%;
	}
	.pole-bottom {
		left: 50%;
		top: 100%;
	}
	.pole-left {
		left: 0;
		top: 50%;
	}
	.item:hover .pole,
	.item.selected .pole,
	.canvas.connecting .pole {
		opacity: 1;
	}
	@media (hover: none) {
		.item.selected .pole {
			opacity: 1;
		}
	}
</style>
