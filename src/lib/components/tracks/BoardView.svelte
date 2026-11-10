<script lang="ts">
	import { page } from '$app/state';
	import { flip } from 'svelte/animate';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import SquareCheck from '@lucide/svelte/icons/square-check';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import type { TrackRow } from '#lib/server/queries.ts';
	import type { Status } from '#lib/server/db/schema.ts';
	import { formatDate, formatTime } from '#lib/time.ts';
	import { dur } from '#lib/state/ui.svelte.ts';
	import TrackIcon from '../TrackIcon.svelte';
	import StatusSelect from '../StatusSelect.svelte';
	import PlayButton from './PlayButton.svelte';

	let {
		tracks,
		projectId,
		canEdit,
		onpatch
	}: {
		tracks: TrackRow[];
		projectId: string;
		canEdit: boolean;
		onpatch: (id: string, patch: Record<string, unknown>) => void;
	} = $props();

	const statuses = $derived(((page.data.statuses ?? []) as Status[]).filter((s) => s.scope === 'track'));
	const columns = $derived([
		...statuses.map((s) => ({ status: s, tracks: tracks.filter((t) => t.statusId === s.id) })),
		...(tracks.some((t) => !statuses.some((s) => s.id === t.statusId))
			? [{ status: null, tracks: tracks.filter((t) => !statuses.some((s) => s.id === t.statusId)) }]
			: [])
	]);

	let dragId = $state<string | null>(null);
	let overCol = $state<string | null>(null);
</script>

<div class="scroll-thin -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
	{#each columns as col (col.status?.id ?? 'none')}
		{@const id = col.status?.id ?? 'none'}
		<section
			class="column glass flex w-[272px] shrink-0 snap-start flex-col rounded-2xl"
			class:over={overCol === id && dragId}
			aria-label={col.status?.name ?? 'No status'}
			ondragover={(e) => {
				if (!dragId || !col.status) return;
				e.preventDefault();
				overCol = id;
			}}
			ondragleave={(e) => {
				if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) overCol = null;
			}}
			ondrop={(e) => {
				e.preventDefault();
				const t = tracks.find((x) => x.id === dragId);
				if (t && col.status && t.statusId !== col.status.id) onpatch(t.id, { statusId: col.status.id });
				dragId = overCol = null;
			}}
		>
			<header class="flex items-center gap-2 px-3.5 pt-3 pb-2">
				<span class="size-2 rounded-full" style:background={col.status?.color ?? 'var(--fg-3)'}></span>
				<h3 class="text-[13px] font-semibold">{col.status?.name ?? 'No status'}</h3>
				<span class="tabular text-[12px] text-fg-3">{col.tracks.length}</span>
			</header>
			<div class="flex min-h-16 flex-col gap-2 px-2 pb-2">
				{#each col.tracks as t (t.id)}
					<a
						href="/projects/{projectId}/tracks/{t.id}"
						class="board-card block rounded-xl p-3"
						class:dragging={dragId === t.id}
						draggable={canEdit}
						ondragstart={(e) => {
							dragId = t.id;
							e.dataTransfer?.setData('text/plain', t.id);
						}}
						ondragend={() => (dragId = overCol = null)}
						animate:flip={{ duration: dur('panel') }}
					>
						<div class="flex items-start gap-2">
							{#if t.icon}<span class="mt-0.5 text-fg-2"><TrackIcon icon={t.icon} size={15} /></span>{/if}
							<p class="min-w-0 flex-1 text-[13.5px] leading-snug font-medium">{t.title}</p>
							<span class="-mt-1 -mr-1"><PlayButton {projectId} trackId={t.id} disabled={!t.audio} /></span>
						</div>
						<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-fg-3">
							{#if t.audio}<span class="tabular">{formatTime(t.audio.duration)}</span>{/if}
							{#if t.dueDate}<span class="inline-flex items-center gap-1"><CalendarClock size={11} />{formatDate(t.dueDate)}</span>{/if}
							{#if t.commentCount}<span class="inline-flex items-center gap-1"><MessageSquare size={11} />{t.commentCount}</span>{/if}
							{#if t.todoTotal}<span class="inline-flex items-center gap-1"><SquareCheck size={11} />{t.todoDone}/{t.todoTotal}</span>{/if}
						</div>
						<!-- Touch screens can't drag between columns, so cards also get a status menu. -->
						{#if canEdit}
							<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
							<div class="mt-2 md:hidden" onclick={(e) => e.preventDefault()}>
								<StatusSelect scope="track" value={t.statusId} size="sm" onchange={(s) => onpatch(t.id, { statusId: s })} />
							</div>
						{/if}
					</a>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.column {
		transition: background-color var(--dur-fade) var(--ease);
	}
	.column.over {
		background: var(--accent-soft);
	}
	.board-card {
		background: var(--glass);
		border: 1px solid var(--line);
		transition:
			transform var(--dur-panel) var(--ease),
			box-shadow var(--dur-panel) var(--ease),
			opacity var(--dur-fade) var(--ease);
	}
	.board-card:hover {
		background: var(--hover);
	}
	.board-card.dragging {
		opacity: 0.5;
		transform: scale(0.98);
	}
</style>
