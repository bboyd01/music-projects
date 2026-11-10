<script lang="ts">
	import { goto } from '$app/navigation';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import SquareCheck from '@lucide/svelte/icons/square-check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import type { TrackRow } from '#lib/server/queries.ts';
	import type { TrackFieldId } from '#lib/track-fields.ts';
	import { formatDate, formatTime } from '#lib/time.ts';
	import TrackIconButton from './TrackIconButton.svelte';
	import StatusSelect from '../StatusSelect.svelte';
	import PlayButton from './PlayButton.svelte';

	let {
		tracks,
		projectId,
		fields,
		canEdit,
		onpatch,
		onreorder
	}: {
		tracks: TrackRow[];
		projectId: string;
		fields: TrackFieldId[];
		canEdit: boolean;
		onpatch: (id: string, patch: Record<string, unknown>) => void;
		onreorder: (ids: string[]) => void;
	} = $props();

	const has = (f: TrackFieldId) => fields.includes(f);
	const open = (id: string) => goto(`/projects/${projectId}/tracks/${id}`);

	let dragId = $state<string | null>(null);
	let overId = $state<string | null>(null);

	function drop(targetId: string) {
		if (!dragId || dragId === targetId) return;
		const ids = tracks.map((t) => t.id).filter((id) => id !== dragId);
		ids.splice(ids.indexOf(targetId) + (tracks.findIndex((t) => t.id === dragId) < tracks.findIndex((t) => t.id === targetId) ? 1 : 0), 0, dragId);
		onreorder(ids);
	}
</script>

<div class="card overflow-x-auto">
	<table class="w-full min-w-[560px] text-left">
		<thead>
			<tr class="eyebrow border-b border-line [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
				<th class="w-8"></th>
				<th class="w-8 !px-1 text-right">#</th>
				<th>Track</th>
				{#if has('status')}<th class="w-40">Status</th>{/if}
				{#if has('startDate')}<th class="w-24">Start</th>{/if}
				{#if has('dueDate')}<th class="w-24">Due</th>{/if}
				{#if has('audio')}<th class="w-20">Length</th>{/if}
				{#if has('comments')}<th class="w-14 text-center" title="Comments"><MessageSquare size={13} class="inline" /></th>{/if}
				{#if has('todos')}<th class="w-16 text-center" title="Todos"><SquareCheck size={13} class="inline" /></th>{/if}
				{#if has('inspirations')}<th class="w-14 text-center" title="Inspirations"><Sparkles size={13} class="inline" /></th>{/if}
				{#if has('description')}<th>Description</th>{/if}
			</tr>
		</thead>
		<tbody>
			{#each tracks as t, i (t.id)}
				<tr
					class="row enter group cursor-pointer border-b border-line last:border-0 [&>td]:px-3 [&>td]:py-2"
					class:drop-target={overId === t.id && dragId !== t.id}
					style:animation-delay="{Math.min(i, 12) * 12}ms"
					onclick={() => open(t.id)}
					draggable={canEdit}
					ondragstart={(e) => {
						dragId = t.id;
						e.dataTransfer?.setData('text/plain', t.id);
					}}
					ondragover={(e) => {
						if (!dragId) return;
						e.preventDefault();
						overId = t.id;
					}}
					ondragleave={() => overId === t.id && (overId = null)}
					ondrop={(e) => {
						e.preventDefault();
						drop(t.id);
						dragId = overId = null;
					}}
					ondragend={() => (dragId = overId = null)}
				>
					<td class="!pr-0 !pl-1">
						<div class="flex items-center">
							{#if canEdit}<GripVertical size={14} class="-mr-1 hidden cursor-grab text-fg-3 opacity-0 group-hover:opacity-100 md:block" />{/if}
							<PlayButton {projectId} trackId={t.id} disabled={!t.audio} />
						</div>
					</td>
					<td class="tabular !px-1 text-right text-[13px] text-fg-3">{i + 1}</td>
					<td>
						<div class="flex min-w-0 items-center gap-2.5">
							<TrackIconButton title={t.title} icon={t.icon} size={16} class="-m-1 p-1" />
							<span class="truncate font-medium">{t.title}</span>
						</div>
					</td>
					{#if has('status')}
						<td onclick={(e) => e.stopPropagation()}>
							<StatusSelect scope="track" value={t.statusId} size="sm" disabled={!canEdit} onchange={(s) => onpatch(t.id, { statusId: s })} />
						</td>
					{/if}
					{#if has('startDate')}<td class="tabular text-[13px] text-fg-2">{formatDate(t.startDate)}</td>{/if}
					{#if has('dueDate')}<td class="tabular text-[13px] text-fg-2">{formatDate(t.dueDate)}</td>{/if}
					{#if has('audio')}<td class="tabular text-[13px] text-fg-2">{t.audio ? formatTime(t.audio.duration) : '—'}</td>{/if}
					{#if has('comments')}<td class="tabular text-center text-[13px] text-fg-2">{t.commentCount || ''}</td>{/if}
					{#if has('todos')}
						<td class="tabular text-center text-[13px] text-fg-2">{t.todoTotal ? `${t.todoDone}/${t.todoTotal}` : ''}</td>
					{/if}
					{#if has('inspirations')}<td class="tabular text-center text-[13px] text-fg-2">{t.inspirationCount || ''}</td>{/if}
					{#if has('description')}<td class="max-w-64 truncate text-[13px] text-fg-3">{t.description}</td>{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.row {
		transition: background-color var(--dur-fade) var(--ease);
	}
	.row:hover {
		background: var(--hover);
	}
	.drop-target {
		box-shadow: inset 0 2px 0 var(--accent);
	}
</style>
