<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import Table from '@lucide/svelte/icons/table-2';
	import List from '@lucide/svelte/icons/list';
	import Kanban from '@lucide/svelte/icons/square-kanban';
	import Music from '@lucide/svelte/icons/music';
	import { api } from '#lib/api.ts';
	import { formatTime } from '#lib/time.ts';
	import { defaultFields, type TrackFieldId } from '#lib/track-fields.ts';
	import TableView from '#lib/components/tracks/TableView.svelte';
	import ListView from '#lib/components/tracks/ListView.svelte';
	import BoardView from '#lib/components/tracks/BoardView.svelte';
	import FieldsMenu from '#lib/components/tracks/FieldsMenu.svelte';
	import Canvas from '#lib/components/inspirations/Canvas.svelte';
	import type { TrackRow } from '#lib/server/queries.ts';

	let { data } = $props();

	// Local copies so changes feel instant; server data re-syncs after each save.
	let view = $state<'table' | 'list' | 'board'>('table');
	let fields = $state<TrackFieldId[]>([]);
	let tracks = $state<TrackRow[]>([]);
	$effect(() => {
		view = data.view;
		fields = (data.visibleFields as TrackFieldId[] | null) ?? [...defaultFields];
	});
	$effect(() => {
		tracks = data.tracks;
	});

	const canEdit = $derived(data.role !== 'viewer');
	// Combined length of every track with audio.
	const totalSeconds = $derived(tracks.reduce((sum, t) => sum + (t.audio?.duration ?? 0), 0));
	let newTitle = $state('');
	let adding = $state(false);

	const views = [
		{ id: 'table', label: 'Table', icon: Table },
		{ id: 'list', label: 'List', icon: List },
		{ id: 'board', label: 'Board', icon: Kanban }
	] as const;

	function savePrefs(patch: { view?: string; visibleFields?: string[] }) {
		api('PUT', `/api/projects/${data.project.id}/prefs`, patch, { quiet: true });
	}

	async function addTrack() {
		const title = newTitle.trim();
		if (!title) return;
		newTitle = '';
		await api('POST', `/api/projects/${data.project.id}/tracks`, { title });
		await invalidateAll();
	}

	async function patch(id: string, p: Record<string, unknown>) {
		tracks = tracks.map((t) => (t.id === id ? { ...t, ...p } : t));
		await api('PATCH', `/api/tracks/${id}`, p);
		invalidateAll();
	}

	async function reorder(ids: string[]) {
		tracks = ids.map((id) => tracks.find((t) => t.id === id)!).filter(Boolean);
		await api('POST', `/api/projects/${data.project.id}/reorder`, { ids });
		invalidateAll();
	}
</script>

<section aria-labelledby="tracks-heading" class="mb-12">
<div class="mb-3 flex items-baseline gap-3">
	<h2 id="tracks-heading" class="serif text-2xl">Tracks</h2>
	<!-- Same style as the Length column, de-emphasized next to the heading. -->
	{#if totalSeconds > 0}<span class="tabular text-[14px] text-fg-2">{formatTime(totalSeconds)} total</span>{/if}
</div>
<div class="mb-4 flex flex-wrap items-center gap-2">
	<div class="glass flex rounded-lg p-0.5" role="tablist" aria-label="View">
		{#each views as v (v.id)}
			<button
				type="button"
				role="tab"
				aria-label={v.label}
				aria-selected={view === v.id}
				class="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13.5px] font-medium {view === v.id
					? 'bg-hover text-fg'
					: 'text-fg-3 hover:text-fg-2'}"
				onclick={() => {
					view = v.id;
					savePrefs({ view: v.id });
				}}
			>
				<v.icon size={14} />
				<span class="hidden sm:inline">{v.label}</span>
			</button>
		{/each}
	</div>
	{#if view !== 'board'}
		<FieldsMenu
			{fields}
			onchange={(f) => {
				fields = f;
				savePrefs({ visibleFields: f });
			}}
		/>
	{/if}
	<div class="flex-1"></div>
	{#if canEdit}
		{#if adding}
			<form
				class="flex w-full gap-2 sm:w-auto"
				onsubmit={(e) => {
					e.preventDefault();
					addTrack();
				}}
			>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					class="input h-8 sm:w-64"
					placeholder="Track title"
					bind:value={newTitle}
					autofocus
					onblur={() => !newTitle && (adding = false)}
					onkeydown={(e) => e.key === 'Escape' && (adding = false)}
				/>
				<button class="btn btn-primary h-8">Add</button>
			</form>
		{:else}
			<button class="btn btn-primary h-8" onclick={() => (adding = true)}><Plus size={15} /> Track</button>
		{/if}
	{/if}
</div>

{#if tracks.length === 0}
	<div class="card flex flex-col items-center px-6 py-14 text-center">
		<Music size={26} class="mb-3 text-fg-3" strokeWidth={1.5} />
		<p class="serif mb-1 text-xl">No tracks yet</p>
		<p class="text-fg-3">Add a track to start sketching.</p>
	</div>
{:else if view === 'table'}
	<TableView {tracks} projectId={data.project.id} {fields} {canEdit} onpatch={patch} onreorder={reorder} />
{:else if view === 'list'}
	<ListView {tracks} projectId={data.project.id} {fields} {canEdit} onpatch={patch} />
{:else}
	<BoardView {tracks} projectId={data.project.id} {canEdit} onpatch={patch} />
{/if}
</section>

<section id="inspirations" aria-labelledby="inspirations-heading" class="scroll-mt-6">
	<h2 id="inspirations-heading" class="serif mb-3 text-2xl">Inspirations</h2>
	<div class="breakout-wide">
	<Canvas items={data.inspirations} connections={data.connections} projectId={data.project.id} {canEdit} />
	</div>
</section>
