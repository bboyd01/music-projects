<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { api } from '#lib/api.ts';
	import { player } from '#lib/state/player.svelte.ts';
	import IconPicker from '#lib/components/IconPicker.svelte';
	import StatusSelect from '#lib/components/StatusSelect.svelte';
	import DateChip from '#lib/components/DateChip.svelte';
	import { autogrow } from '#lib/actions.ts';
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

{#snippet meta()}
	<StatusSelect scope="track" value={t.statusId} disabled={!canEdit} onchange={(statusId) => patch({ statusId })} />
	<DateChip label="Start" value={t.startDate} disabled={!canEdit} onchange={(startDate) => patch({ startDate })} />
	<DateChip label="Due" value={t.dueDate} disabled={!canEdit} onchange={(dueDate) => patch({ dueDate })} />
{/snippet}

<header class="mb-8">
	<div class="flex items-start gap-3 sm:gap-4">
		<IconPicker value={t.icon} disabled={!canEdit} onchange={(icon) => patch({ icon })} />
		<div class="min-w-0 flex-1">
			{#if canEdit}
				<textarea
					class="serif input-bare -ml-1.5 block w-full resize-none px-1.5 text-3xl leading-tight sm:text-4xl"
					rows="1"
					bind:value={title}
					use:autogrow={title}
					aria-label="Track title"
					onblur={() => (title.trim() && title.trim() !== t.title ? patch({ title: title.trim() }) : (title = t.title))}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							e.currentTarget.blur();
						}
					}}
				></textarea>
			{:else}
				<h2 class="serif text-3xl leading-tight sm:text-4xl">{t.title}</h2>
			{/if}
			<div class="mt-2.5 hidden flex-wrap items-center gap-2 sm:flex">{@render meta()}</div>
		</div>
		<!-- Desktop actions sit beside the title… -->
		<div class="hidden items-center gap-1 sm:flex">
			<button class="btn btn-accent" disabled={!d.audio} title={d.audio ? 'Open in the Listen tab' : 'Upload audio first'} onclick={listen}>
				<Headphones size={16} /> Listen
			</button>
			{#if canEdit}
				<button class="icon-btn hover:text-danger" title="Delete track" aria-label="Delete track" onclick={del}><Trash2 size={16} /></button>
			{/if}
		</div>
	</div>
	<!-- …on phones, details and actions get full-width rows. -->
	<div class="mt-3 flex flex-wrap items-center gap-2 sm:hidden">{@render meta()}</div>
	<div class="mt-4 flex items-center gap-2 sm:hidden">
		<button class="btn btn-accent h-10 flex-1" disabled={!d.audio} onclick={listen}><Headphones size={16} /> Listen</button>
		{#if canEdit}
			<button class="icon-btn size-10 hover:text-danger" aria-label="Delete track" onclick={del}><Trash2 size={17} /></button>
		{/if}
	</div>
</header>

<!-- Row 1: audio, description, todo | comments -->
<div class="grid gap-8 lg:grid-cols-2">
	<div class="min-w-0 space-y-8">
		<section class="enter">
			<h3 class="section-title mb-3">Audio</h3>
			<TrackAudio audio={d.audio} trackId={t.id} projectId={t.projectId} {canEdit} onchange={refresh} />
		</section>

		<section class="enter">
			<h3 class="section-title mb-3">Description</h3>
			{#if canEdit}
				<textarea
					class="input min-h-24"
					use:autogrow={description}
					placeholder="Ideas, structure, key, tempo, references…"
					bind:value={description}
					onblur={() => description !== t.description && patch({ description })}
				></textarea>
			{:else}
				<p class="whitespace-pre-wrap text-fg-2">{t.description || '—'}</p>
			{/if}
		</section>

		<section class="enter">
			<h3 class="section-title mb-3">Todo</h3>
			<div class="card p-4">
				<TodosPanel checklists={d.checklists} trackId={t.id} projectId={t.projectId} {canEdit} onchange={refresh} />
			</div>
		</section>
	</div>

	<section class="enter min-w-0">
		<h3 class="section-title mb-3">Comments <span class="tabular ml-1 font-normal text-fg-3">{d.comments.length || ''}</span></h3>
		<div class="card p-4">
			<CommentsPanel
				comments={d.comments}
				trackId={t.id}
				projectId={t.projectId}
				members={d.members}
				role={d.role}
				onchange={refresh}
				listClass="max-h-[min(70dvh,760px)]"
			/>
		</div>
	</section>
</div>

<!-- Row 2: inspirations, full width -->
<section class="enter mt-10">
	<h3 class="section-title mb-3">Inspirations</h3>
	<InspirationList items={d.inspirations} projectId={t.projectId} trackId={t.id} {canEdit} onchange={refresh} />
</section>
