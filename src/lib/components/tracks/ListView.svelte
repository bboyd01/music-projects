<script lang="ts">
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import SquareCheck from '@lucide/svelte/icons/square-check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import type { TrackRow } from '#lib/server/queries.ts';
	import type { TrackFieldId } from '#lib/track-fields.ts';
	import { formatDate, formatTime } from '#lib/time.ts';
	import TrackIcon from '../TrackIcon.svelte';
	import StatusSelect from '../StatusSelect.svelte';
	import PlayButton from './PlayButton.svelte';

	let {
		tracks,
		projectId,
		fields,
		canEdit,
		onpatch
	}: {
		tracks: TrackRow[];
		projectId: string;
		fields: TrackFieldId[];
		canEdit: boolean;
		onpatch: (id: string, patch: Record<string, unknown>) => void;
	} = $props();

	const has = (f: TrackFieldId) => fields.includes(f);
</script>

<ul class="space-y-2">
	{#each tracks as t, i (t.id)}
		<li class="enter" style:animation-delay="{Math.min(i, 12) * 12}ms">
			<a href="/projects/{projectId}/tracks/{t.id}" class="item card flex items-center gap-3 px-3 py-3 sm:px-4">
				<PlayButton {projectId} trackId={t.id} disabled={!t.audio} />
				<span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-2">
					<TrackIcon icon={t.icon ?? 'note'} size={17} />
				</span>
				<div class="min-w-0 flex-1">
					<p class="truncate font-medium">{t.title}</p>
					<div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-fg-3">
						{#if has('audio') && t.audio}<span class="tabular truncate">{t.audio.filename} · {formatTime(t.audio.duration)}</span>{/if}
						{#if has('startDate') && t.startDate}<span>Start {formatDate(t.startDate)}</span>{/if}
						{#if has('dueDate') && t.dueDate}<span class="inline-flex items-center gap-1"><CalendarClock size={12} />{formatDate(t.dueDate)}</span>{/if}
						{#if has('comments') && t.commentCount}<span class="inline-flex items-center gap-1"><MessageSquare size={12} />{t.commentCount}</span>{/if}
						{#if has('todos') && t.todoTotal}<span class="inline-flex items-center gap-1"><SquareCheck size={12} />{t.todoDone}/{t.todoTotal}</span>{/if}
						{#if has('inspirations') && t.inspirationCount}<span class="inline-flex items-center gap-1"><Sparkles size={12} />{t.inspirationCount}</span>{/if}
					</div>
					{#if has('description') && t.description}<p class="mt-1 line-clamp-2 text-[12.5px] text-fg-2">{t.description}</p>{/if}
				</div>
				{#if has('status')}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
					<div onclick={(e) => e.preventDefault()}>
						<StatusSelect scope="track" value={t.statusId} size="sm" disabled={!canEdit} onchange={(s) => onpatch(t.id, { statusId: s })} />
					</div>
				{/if}
			</a>
		</li>
	{/each}
</ul>

<style>
	.item {
		transition:
			background-color var(--dur-fade) var(--ease),
			transform var(--dur-fade) var(--ease);
	}
	.item:hover {
		background: var(--hover);
	}
</style>
