<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import Table from '@lucide/svelte/icons/table-2';
	import List from '@lucide/svelte/icons/list';
	import Kanban from '@lucide/svelte/icons/square-kanban';
	import Music from '@lucide/svelte/icons/music';
	import { api } from '#lib/api.ts';
	import { defaultFields, type TrackFieldId } from '#lib/track-fields.ts';
	import TableView from '#lib/components/tracks/TableView.svelte';
	import ListView from '#lib/components/tracks/ListView.svelte';
	import BoardView from '#lib/components/tracks/BoardView.svelte';
	import FieldsMenu from '#lib/components/tracks/FieldsMenu.svelte';
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

<div class="mb-4 flex flex-wrap items-center gap-2">
	<div class="glass flex rounded-lg p-0.5" role="tablist" aria-label="View">
		{#each views as v (v.id)}
			<button
				type="button"
				role="tab"
				aria-label={v.label}
				aria-selected={view === v.id}
				class="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium {view === v.id
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
