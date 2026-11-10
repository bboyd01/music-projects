<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { api } from '#lib/api.ts';
	import { player } from '#lib/state/player.svelte.ts';
	import IconPicker from '#lib/components/IconPicker.svelte';
	import StatusSelect from '#lib/components/StatusSelect.svelte';
	import TrackAudio from '#lib/components/tracks/TrackAudio.svelte';
	import CommentsPanel from '#lib/components/comments/CommentsPanel.svelte';
	import TodosPanel from '#lib/components/todos/TodosPanel.svelte';
	import InspirationList from '#lib/components/inspirations/InspirationList.svelte';

	let { data } = $props();
	const d = $derived(data.detail);
	const t = $derived(d.track);
	const canEdit = $derived(d.role !== 'viewer');
	const base = $derived(`/projects/${t.projectId}`);

	let title = $state('');
	let description = $state('');
	$effect(() => {
		title = t.title;
		description = t.description;
	});

	async function refresh() {
		await invalidateAll();
		if (player.current?.id === t.id) void player.refreshDetail();
	}

	async function patch(p: Record<string, unknown>) {
		await api('PATCH', `/api/tracks/${t.id}`, p);
		refresh();
		if (player.project?.id === t.projectId && ('title' in p || 'icon' in p)) void player.refreshQueue();
	}

	async function listen() {
		if (!d.audio) return;
		const ok = player.current?.id === t.id || (await player.open(t.projectId, t.id, { mode: 'full' }));
		if (ok) {
			player.mode = 'full';
			goto('/listen');
		}
	}

	async function del() {
		if (!confirm(`Delete “${t.title}”? Its audio, comments and todos will be removed.`)) return;
		await api('DELETE', `/api/tracks/${t.id}`);
		if (player.current?.id === t.id) player.stop();
		await goto(base);
		invalidateAll();
	}
</script>

<svelte:head><title>{t.title} · Music Projects</title></svelte:head>

<header class="mb-6 flex flex-wrap items-start gap-4">
	<IconPicker value={t.icon} disabled={!canEdit} onchange={(icon) => patch({ icon })} />
	<div class="min-w-0 flex-1">
		{#if canEdit}
			<input
				class="serif input-bare -ml-1.5 w-full px-1.5 text-3xl leading-tight sm:text-4xl"
				bind:value={title}
				aria-label="Track title"
				onblur={() => (title.trim() && title.trim() !== t.title ? patch({ title: title.trim() }) : (title = t.title))}
				onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
			/>
		{:else}
			<h2 class="serif text-3xl leading-tight sm:text-4xl">{t.title}</h2>
		{/if}
		<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
			<StatusSelect scope="track" value={t.statusId} disabled={!canEdit} onchange={(statusId) => patch({ statusId })} />
			<label class="flex items-center gap-2 text-fg-3">
				Start
				<input type="date" class="input h-7 w-auto px-2 text-[12.5px]" value={t.startDate ?? ''} disabled={!canEdit} onchange={(e) => patch({ startDate: e.currentTarget.value || null })} />
			</label>
			<label class="flex items-center gap-2 text-fg-3">
				Due
				<input type="date" class="input h-7 w-auto px-2 text-[12.5px]" value={t.dueDate ?? ''} disabled={!canEdit} onchange={(e) => patch({ dueDate: e.currentTarget.value || null })} />
			</label>
		</div>
	</div>
	<div class="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto">
		<button class="btn btn-accent flex-1 sm:flex-none" disabled={!d.audio} title={d.audio ? 'Open in the Listen tab' : 'Upload audio first'} onclick={listen}>
			<Headphones size={16} /> Listen
		</button>
		{#if canEdit}
			<button class="icon-btn hover:text-danger" title="Delete track" aria-label="Delete track" onclick={del}><Trash2 size={16} /></button>
		{/if}
	</div>
</header>

<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
	<div class="space-y-6">
		<section class="enter">
			<h3 class="eyebrow mb-2">Audio</h3>
			<TrackAudio audio={d.audio} trackId={t.id} projectId={t.projectId} {canEdit} onchange={refresh} />
		</section>

		<section class="enter">
			<h3 class="eyebrow mb-2">Description</h3>
			{#if canEdit}
				<textarea
					class="input min-h-24 [field-sizing:content]"
					placeholder="Ideas, structure, key, tempo, references…"
					bind:value={description}
					onblur={() => description !== t.description && patch({ description })}
				></textarea>
			{:else}
				<p class="whitespace-pre-wrap text-fg-2">{t.description || '—'}</p>
			{/if}
		</section>

		<section class="enter">
			<h3 class="eyebrow mb-2">Comments <span class="tabular ml-1 text-fg-3">{d.comments.length || ''}</span></h3>
			<CommentsPanel comments={d.comments} trackId={t.id} projectId={t.projectId} members={d.members} role={d.role} onchange={refresh} />
		</section>
	</div>

	<div class="space-y-6">
		<section class="card enter p-4">
			<h3 class="eyebrow mb-3">Todo</h3>
			<TodosPanel checklists={d.checklists} trackId={t.id} projectId={t.projectId} {canEdit} onchange={refresh} />
		</section>
		<section class="enter">
			<h3 class="eyebrow mb-2">Inspirations</h3>
			<InspirationList items={d.inspirations} projectId={t.projectId} trackId={t.id} {canEdit} onchange={refresh} />
		</section>
	</div>
</div>
