<script lang="ts">
	import { goto } from '$app/navigation';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import { player } from '#lib/state/player.svelte.ts';
	import { composer } from '#lib/state/composer.svelte.ts';
	import { slide } from '#lib/transitions.ts';
	import ProgressLine from './ProgressLine.svelte';
	import Transport from './Transport.svelte';
	import CommentButtons from './CommentButtons.svelte';
	import Collage from './Collage.svelte';

	const inspirations = $derived(player.detail?.inspirations ?? []);
	const fullImage = $derived(player.project?.backdrop.full ?? null);
	// Only feature a real cover as the visual; generic default backgrounds stay ambient.
	const featured = $derived(player.project?.backdrop.source === 'default' ? null : fullImage);
	const trackHref = $derived(`/projects/${player.project?.id}/tracks/${player.current?.id}`);

	let root: HTMLDivElement;

	function minimize() {
		player.mode = 'mini';
	}
	function openTrack() {
		player.mode = 'mini';
		goto(trackHref);
	}

	// ── Lock page scroll while fullscreen ────────────────────
	$effect(() => {
		const html = document.documentElement;
		const prev = { html: html.style.overflow, body: document.body.style.overflow };
		html.style.overflow = 'hidden';
		document.body.style.overflow = 'hidden';
		// iOS ignores overflow:hidden for touch scrolling, so also stop touchmove from reaching the page.
		const stop = (e: TouchEvent) => {
			if (e.cancelable) e.preventDefault();
		};
		root.addEventListener('touchmove', stop, { passive: false });
		return () => {
			html.style.overflow = prev.html;
			document.body.style.overflow = prev.body;
			root.removeEventListener('touchmove', stop);
		};
	});

	// ── Swipe down: left half = minimize, right half = open track page ──
	let start = $state<{ x: number; y: number; left: boolean } | null>(null);
	let dragY = $state(0);
	let dragging = $state(false);
	const THRESHOLD = 90;

	function onTouchStart(e: TouchEvent) {
		const target = e.target as HTMLElement;
		// Don't hijack the seek bar or buttons.
		if (e.touches.length !== 1 || target.closest('[role=slider], button, a, input, textarea')) return;
		const t = e.touches[0];
		start = { x: t.clientX, y: t.clientY, left: t.clientX < window.innerWidth / 2 };
	}
	function onTouchMove(e: TouchEvent) {
		if (!start) return;
		const t = e.touches[0];
		const dy = t.clientY - start.y;
		const dx = Math.abs(t.clientX - start.x);
		if (!dragging && (dy < 8 || dx > dy)) {
			if (dx > 24) start = null; // horizontal gesture — ignore
			return;
		}
		dragging = true;
		dragY = Math.max(0, dy) * 0.6;
	}
	function onTouchEnd() {
		if (start && dragging && dragY >= THRESHOLD * 0.6) {
			if (start.left) minimize();
			else openTrack();
		}
		start = null;
		dragging = false;
		dragY = 0;
	}
	const hint = $derived(dragging && start ? (start.left ? 'Minimize' : 'Open track') : null);
</script>

<!-- Escape minimizes, unless a dialog (e.g. the comment box) is open on top — that closes first. -->
<svelte:window onkeydown={(e) => e.key === 'Escape' && !e.defaultPrevented && !composer.open && minimize()} />

<div
	bind:this={root}
	class="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-none"
	style:background="var(--bg)"
	style:transform={dragY ? `translateY(${dragY}px)` : undefined}
	style:transition={dragging ? 'none' : 'transform var(--dur-panel) var(--ease)'}
	ontouchstart={onTouchStart}
	ontouchmove={onTouchMove}
	ontouchend={onTouchEnd}
	ontouchcancel={onTouchEnd}
	transition:slide={{ y: 24 }}
	role="dialog"
	aria-modal="true"
	aria-label="Player"
	tabindex="-1"
>
	{#if fullImage}
		<div class="ambient absolute inset-0" style:background-image="url('{fullImage}')" aria-hidden="true"></div>
	{/if}
	<div class="absolute inset-0" style:background="var(--overlay)" aria-hidden="true"></div>

	<header class="relative flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
		<button class="icon-btn" aria-label="Minimize player" title="Minimize (Esc)" onclick={minimize}>
			<ChevronDown size={22} />
		</button>
		<p class="eyebrow truncate px-4">{hint ?? player.project?.name}</p>
		<a class="icon-btn" href={trackHref} aria-label="Open track page" title="Open track page" onclick={() => (player.mode = 'mini')}
			><ArrowUpRight size={20} /></a
		>
	</header>

	<div class="relative flex min-h-0 flex-1 items-center justify-center px-4 py-4 sm:px-10 sm:py-6">
		<Collage items={inspirations} fallback={featured} />
	</div>

	<div class="relative mx-auto w-full max-w-3xl px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-8">
		<div class="glass-blur rounded-3xl px-5 pt-4 pb-5 sm:px-7">
			<div class="grid grid-cols-4 items-start gap-3">
				<div class="col-span-3 min-w-0">
					<h2 class="truncate text-xl font-bold sm:text-2xl">{player.current?.title}</h2>
					<p class="truncate text-[14px] text-fg-2">{player.current?.filename}</p>
				</div>
				<div class="col-span-1 flex justify-end"><CommentButtons size={20} /></div>
			</div>
			<div class="mt-4"><ProgressLine waveHeight={72} /></div>
			<div class="mt-3"><Transport size="lg" /></div>
		</div>
	</div>
</div>

<style>
	.ambient {
		background-size: cover;
		background-position: center;
		filter: var(--photo-filter);
		transform: scale(1.2);
		opacity: 0.9;
	}
</style>
