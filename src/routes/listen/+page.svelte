<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import { player } from '#lib/state/player.svelte.ts';
	import { ui } from '#lib/state/ui.svelte.ts';
	import FullPlayer from '#lib/components/player/FullPlayer.svelte';
	import CommentsPanel from '#lib/components/comments/CommentsPanel.svelte';
	import TodosPanel from '#lib/components/todos/TodosPanel.svelte';
	import TrackIcon from '#lib/components/TrackIcon.svelte';

	$effect(() => {
		if (player.project) ui.backdrop = player.project.backdrop.backdrop;
	});

	const d = $derived(player.detail);

	function refresh() {
		void player.refreshDetail();
		void invalidateAll();
	}
</script>

<svelte:head><title>Listen · Music Projects</title></svelte:head>

{#if player.current && player.mode === 'full'}
	<FullPlayer />
{/if}

<div class="mx-auto max-w-6xl px-4 pt-8 sm:px-8 md:pt-12">
	{#if !player.current}
		<div class="enter flex flex-col items-center px-6 py-24 text-center">
			<Headphones size={30} class="mb-4 text-fg-3" strokeWidth={1.4} />
			<h1 class="serif mb-2 text-3xl">Nothing playing</h1>
			<p class="mb-6 text-fg-2">Press play on any track, or use Listen on a track page.</p>
			<a href="/projects" class="btn btn-outline">Browse projects</a>
		</div>
	{:else}
		<header class="enter mb-6 flex items-center gap-4">
			<span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-hover text-fg-2">
				<TrackIcon icon={player.current.icon ?? 'note'} size={22} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="eyebrow mb-1 truncate">{player.project?.name}</p>
				<h1 class="serif truncate text-3xl sm:text-4xl">
					<a href="/projects/{player.project?.id}/tracks/{player.current.id}" class="hover:text-fg-2">{player.current.title}</a>
				</h1>
			</div>
			<button class="btn btn-outline shrink-0 px-2.5 sm:px-3.5" aria-label="Fullscreen" onclick={() => (player.mode = 'full')}>
				<Maximize2 size={15} /><span class="hidden sm:inline">Fullscreen</span>
			</button>
		</header>

		{#if d && d.track.id === player.current.id}
			<div class="grid gap-6 lg:grid-cols-2">
				<section class="card enter flex max-h-[min(70dvh,720px)] min-h-64 flex-col p-4">
					<h2 class="eyebrow mb-3">Comments <span class="tabular ml-1">{d.comments.length || ''}</span></h2>
					<div class="scroll-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
						<CommentsPanel comments={d.comments} trackId={d.track.id} projectId={d.track.projectId} members={d.members} role={d.role} onchange={refresh} />
					</div>
				</section>
				<section class="card enter flex max-h-[min(70dvh,720px)] min-h-64 flex-col p-4">
					<h2 class="eyebrow mb-3">Todo</h2>
					<div class="scroll-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
						<TodosPanel checklists={d.checklists} trackId={d.track.id} projectId={d.track.projectId} canEdit={d.role !== 'viewer'} onchange={refresh} />
					</div>
				</section>
			</div>
		{:else}
			<p class="text-fg-3">Loading…</p>
		{/if}
	{/if}
</div>
