<script lang="ts">
	import { autogrow } from '#lib/actions.ts';
	import Plus from '@lucide/svelte/icons/plus';
	import AddTodo from './AddTodo.svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArrowDownUp from '@lucide/svelte/icons/arrow-down-up';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import { api } from '#lib/api.ts';
	import { formatTime } from '#lib/time.ts';
	import { player } from '#lib/state/player.svelte.ts';
	import type { ChecklistView } from '#lib/server/queries.ts';

	let {
		checklists,
		trackId,
		projectId,
		canEdit,
		onchange
	}: {
		checklists: ChecklistView[];
		trackId: string;
		projectId: string;
		canEdit: boolean;
		onchange: () => void;
	} = $props();

	type Sort = 'added' | 'timestamp';
	const SORT_KEY = 'mp.todoSort';
	let sort = $state<Sort>('added');
	$effect(() => {
		try {
			sort = (localStorage.getItem(SORT_KEY) as Sort) ?? 'added';
		} catch {
			/* storage unavailable */
		}
	});
	function setSort(s: Sort) {
		sort = s;
		try {
			localStorage.setItem(SORT_KEY, s);
		} catch {
			/* ignore */
		}
	}

	// Optimistic local copy.
	let lists = $state<ChecklistView[]>([]);
	$effect(() => {
		lists = checklists;
	});

	function sorted(todos: ChecklistView['todos']) {
		if (sort === 'added') return todos;
		// Timestamped first (by time), then the rest in added order.
		return [...todos].sort((a, b) => {
			if (a.timestampSec == null && b.timestampSec == null) return a.createdAt - b.createdAt;
			if (a.timestampSec == null) return 1;
			if (b.timestampSec == null) return -1;
			return a.timestampSec - b.timestampSec;
		});
	}

	async function add(listId: string, text: string, timestampSec: number | null) {
		await api('POST', `/api/checklists/${listId}/todos`, { text, timestampSec });
		onchange();
	}

	async function toggle(listId: string, id: string, done: boolean) {
		lists = lists.map((l) => (l.id === listId ? { ...l, todos: l.todos.map((t) => (t.id === id ? { ...t, done } : t)) } : l));
		await api('PATCH', `/api/todos/${id}`, { done });
		onchange();
	}

	async function editText(id: string, text: string, prev: string) {
		const v = text.trim();
		if (!v || v === prev) return;
		await api('PATCH', `/api/todos/${id}`, { text: v });
		onchange();
	}

	async function remove(id: string) {
		await api('DELETE', `/api/todos/${id}`);
		onchange();
	}

	async function addList() {
		await api('POST', `/api/tracks/${trackId}/checklists`, { title: 'Checklist' });
		onchange();
	}

	async function renameList(id: string, title: string, prev: string) {
		const v = title.trim();
		if (!v || v === prev) return;
		await api('PATCH', `/api/checklists/${id}`, { title: v });
		onchange();
	}

	async function removeList(l: ChecklistView) {
		if (l.todos.length && !confirm(`Delete “${l.title}” and its ${l.todos.length} items?`)) return;
		await api('DELETE', `/api/checklists/${l.id}`);
		onchange();
	}
</script>

<div class="space-y-5">
	<div class="flex items-center gap-1 text-[13px] text-fg-3">
		<ArrowDownUp size={13} class="mr-1" />
		<button type="button" class="rounded px-1.5 py-0.5 {sort === 'added' ? 'bg-hover text-fg' : 'hover:text-fg-2'}" onclick={() => setSort('added')}>Added order</button>
		<button type="button" class="rounded px-1.5 py-0.5 {sort === 'timestamp' ? 'bg-hover text-fg' : 'hover:text-fg-2'}" onclick={() => setSort('timestamp')}>Timestamp</button>
	</div>

	{#each lists as l (l.id)}
		{@const done = l.todos.filter((t) => t.done).length}
		<section class="group/list">
			<header class="mb-1.5 flex items-center gap-2">
				{#if canEdit}
					<input
						class="input-bare -ml-1.5 min-w-0 flex-1 px-1.5 py-0.5 text-[14.5px] font-semibold"
						value={l.title}
						aria-label="Checklist title"
						onblur={(e) => renameList(l.id, e.currentTarget.value, l.title)}
						onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
					/>
				{:else}
					<h4 class="flex-1 text-[14.5px] font-semibold">{l.title}</h4>
				{/if}
				<span class="tabular text-[13px] text-fg-3">{done}/{l.todos.length}</span>
				{#if canEdit && lists.length > 1}
					<button class="icon-btn size-7 opacity-0 group-hover/list:opacity-100 hover:text-danger focus:opacity-100" aria-label="Delete checklist" onclick={() => removeList(l)}>
						<Trash2 size={13} />
					</button>
				{/if}
			</header>
			{#if l.todos.length}
				<div class="mb-2 h-[2px] overflow-hidden rounded-full bg-line">
					<div class="h-full bg-accent" style:width="{(done / l.todos.length) * 100}%" style:transition="width var(--dur-panel) var(--ease)"></div>
				</div>
			{/if}
			<ul>
				{#each sorted(l.todos) as t (t.id)}
					<li class="group flex items-start gap-2.5 rounded-lg px-1 py-1 hover:bg-hover">
						<button
							type="button"
							class="check mt-[3px] flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border {t.done
								? 'border-accent bg-accent text-on-accent'
								: 'border-line-strong'}"
							role="checkbox"
							aria-checked={t.done}
							aria-label={t.text}
							disabled={!canEdit}
							onclick={() => toggle(l.id, t.id, !t.done)}
						>
							{#if t.done}<Check size={12} strokeWidth={3} />{/if}
						</button>
						<div class="min-w-0 flex-1">
							{#if canEdit}
								<textarea
									class="input-bare block w-full resize-none px-1 text-[14.5px] leading-snug {t.done ? 'text-fg-3 line-through' : ''}"
									rows="1"
									value={t.text}
									use:autogrow={t.text}
									aria-label="Todo text"
									onblur={(e) => editText(t.id, e.currentTarget.value, t.text)}
									onkeydown={(e) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault();
											e.currentTarget.blur();
										}
									}}
								></textarea>
							{:else}
								<p class="px-1 text-[14.5px] leading-snug {t.done ? 'text-fg-3 line-through' : ''}">{t.text}</p>
							{/if}
						</div>
						{#if t.sourceCommentId}<span title="From a comment" class="mt-1 text-fg-3"><MessageSquare size={12} /></span>{/if}
						{#if t.timestampSec != null}
							<button type="button" class="ts-chip mt-0.5" title="Play from here" onclick={() => player.seekTrack(projectId, trackId, t.timestampSec!)}>
								{formatTime(t.timestampSec)}
							</button>
						{/if}
						{#if canEdit}
							<button class="icon-btn -my-1 size-7 opacity-100 hover:text-danger md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100" aria-label="Delete todo" onclick={() => remove(t.id)}>
								<X size={13} />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
			{#if canEdit}
				<AddTodo {trackId} onadd={(text, ts) => add(l.id, text, ts)} />
			{/if}
		</section>
	{/each}

	{#if canEdit}
		<button class="btn btn-ghost -ml-2 h-8" onclick={addList}><Plus size={14} /> Checklist</button>
	{/if}
</div>

<style>
	.check {
		transition:
			background-color var(--dur-fade) var(--ease),
			border-color var(--dur-fade) var(--ease);
	}
</style>
