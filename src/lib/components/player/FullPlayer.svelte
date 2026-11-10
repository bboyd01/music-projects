<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import { player } from '#lib/state/player.svelte.ts';
	import { slide } from '#lib/transitions.ts';
	import ProgressLine from './ProgressLine.svelte';
	import Transport from './Transport.svelte';
	import CommentButtons from './CommentButtons.svelte';
	import Collage from './Collage.svelte';

	const inspirations = $derived(player.detail?.inspirations ?? []);
	const fullImage = $derived(player.project?.backdrop.full ?? null);
	// Only feature a real cover as the visual; generic default backgrounds stay ambient.
	const featured = $derived(player.project?.backdrop.source === 'default' ? null : fullImage);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (player.mode = 'mini')} />

<div class="fixed inset-0 z-50 flex flex-col overflow-hidden" style:background="var(--bg)" transition:slide={{ y: 24 }}>
	<!-- Ambient layer: the project's image, heavily blurred. -->
	{#if fullImage}
		<div class="ambient absolute inset-0" style:background-image="url('{fullImage}')" aria-hidden="true"></div>
	{/if}
	<div class="absolute inset-0" style:background="var(--overlay)" aria-hidden="true"></div>

	<header class="relative flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
		<button class="icon-btn" aria-label="Minimize player" title="Minimize (Esc)" onclick={() => (player.mode = 'mini')}>
			<ChevronDown size={22} />
		</button>
		<p class="eyebrow truncate px-4">{player.project?.name}</p>
		<a
			class="icon-btn"
			href="/projects/{player.project?.id}/tracks/{player.current?.id}"
			aria-label="Open track page"
			title="Open track page"
			onclick={() => (player.mode = 'mini')}><ArrowUpRight size={20} /></a
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
					<p class="truncate text-[13px] text-fg-2">{player.current?.filename}</p>
				</div>
				<div class="col-span-1 flex justify-end"><CommentButtons size={20} /></div>
			</div>
			<div class="mt-4"><ProgressLine /></div>
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
