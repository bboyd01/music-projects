<script lang="ts">
	import { tick } from 'svelte';
	import ListPlus from '@lucide/svelte/icons/list-plus';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Check from '@lucide/svelte/icons/check';
	import MessageSquareDot from '@lucide/svelte/icons/message-square-dot';
	import { page } from '$app/state';
	import { api } from '#lib/api.ts';
	import { formatTime, relativeTime, commentTimestamp } from '#lib/time.ts';
	import { player } from '#lib/state/player.svelte.ts';
	import { toast } from '#lib/state/ui.svelte.ts';
	import type { CommentView } from '#lib/server/queries.ts';
	import type { Member } from '#lib/state/composer.svelte.ts';
	import MentionInput from './MentionInput.svelte';
	import CommentBody from './CommentBody.svelte';

	let {
		comments,
		trackId,
		projectId,
		members,
		role,
		onchange,
		listClass = 'max-h-[28rem]'
	}: {
		comments: CommentView[];
		trackId: string;
		projectId: string;
		members: Member[];
		role: 'owner' | 'editor' | 'viewer';
		onchange: () => void;
		/** Height of the scrolling list; older comments scroll up. */
		listClass?: string;
	} = $props();

	let body = $state('');
	let busy = $state(false);
	let atPlayhead = $state(false);
	let list: HTMLDivElement;

	const isPlaying = $derived(player.current?.id === trackId);
	const me = $derived(page.data.user);
	const readOnly = $derived(!!me?.readOnly);
	const canEdit = $derived(role !== 'viewer' && !readOnly);
	// Oldest first, newest at the bottom next to the input (like a chat).
	// Server sends newest first; reversing keeps a stable order even for same-millisecond ties.
	const ordered = $derived([...comments].reverse());

	// Start scrolled to the newest; follow new comments as they arrive.
	let seen = -1;
	$effect(() => {
		const n = ordered.length;
		if (n !== seen) {
			const first = seen === -1;
			seen = n;
			tick().then(() => list?.scrollTo({ top: list.scrollHeight, behavior: first ? 'instant' : 'smooth' }));
		}
	});

	async function post() {
		if (!body.trim() || busy) return;
		busy = true;
		try {
			await api('POST', `/api/tracks/${trackId}/comments`, {
				body,
				timestampSec: atPlayhead && isPlaying ? commentTimestamp(player.time) : null
			});
			body = '';
			atPlayhead = false;
			onchange();
		} finally {
			busy = false;
		}
	}

	/** Toggle: make a todo from the comment, or remove the todo it made. */
	async function toggleTodo(c: CommentView) {
		if (c.hasTodo) {
			await api('DELETE', `/api/comments/${c.id}/todo`);
			toast('Removed from todos');
		} else {
			await api('POST', `/api/comments/${c.id}/todo`);
			toast('Added to todos');
		}
		onchange();
	}

	async function toggleResolved(c: CommentView) {
		await api('PATCH', `/api/comments/${c.id}`, { resolved: !c.resolvedAt });
		onchange();
	}

	// Two-tap delete: the first tap arms (red icon), a second tap within 5s deletes.
	let armed = $state<string | null>(null);
	let disarm: ReturnType<typeof setTimeout> | undefined;
	async function remove(c: CommentView) {
		clearTimeout(disarm);
		if (armed !== c.id) {
			armed = c.id;
			disarm = setTimeout(() => (armed = null), 5000);
			return;
		}
		armed = null;
		await api('DELETE', `/api/comments/${c.id}`);
		onchange();
	}
	$effect(() => () => clearTimeout(disarm));

	const canResolve = (c: CommentView) => !readOnly && (role !== 'viewer' || c.author.id === me?.id);
</script>

<div class="flex min-h-0 flex-col">
	<div bind:this={list} class="scroll-thin -mx-1 min-h-0 overflow-y-auto px-1 {listClass}">
		{#each ordered as c (c.id)}
			<article class="group rounded-xl px-1 py-2 {c.resolvedAt ? 'resolved' : ''}">
				<header class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
					<span class="flex size-6 items-center justify-center rounded-full bg-hover text-[12px] font-semibold">{c.author.name[0]?.toUpperCase()}</span>
					<span class="text-[14px] font-medium">{c.author.name}</span>
					<span class="text-[13px] text-fg-3">{relativeTime(c.createdAt)}</span>
					{#if c.timestampSec != null}
						<button
							type="button"
							class="ts-chip hover:brightness-110"
							title="Play from here"
							onclick={() => player.seekTrack(projectId, trackId, c.timestampSec!)}
						>
							{formatTime(c.timestampSec)}
						</button>
					{/if}
					<div class="-my-1 flex items-center">
						<!-- Resolve stays visible once checked. -->
						{#if canResolve(c) || c.resolvedAt}
							<button
								type="button"
								class="icon-btn size-7 {c.resolvedAt ? 'text-accent hover:text-accent' : 'opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100'}"
								title={c.resolvedAt ? `Resolved by ${c.resolvedBy}${canResolve(c) ? ' — click to reopen' : ''}` : 'Resolve'}
								aria-label={c.resolvedAt ? 'Reopen comment' : 'Resolve comment'}
								aria-pressed={!!c.resolvedAt}
								disabled={!canResolve(c)}
								onclick={() => toggleResolved(c)}
							>
								<Check size={15} strokeWidth={c.resolvedAt ? 2.6 : 1.8} />
							</button>
						{/if}
						<div class="flex opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
							{#if canEdit}
								<button
									type="button"
									class="icon-btn size-7 {c.hasTodo ? 'text-accent hover:text-accent' : ''}"
									title={c.hasTodo ? 'In todos — click to remove' : 'Make todo'}
									aria-label={c.hasTodo ? 'Remove from todos' : 'Make todo'}
									aria-pressed={c.hasTodo}
									onclick={() => toggleTodo(c)}
								>
									{#if c.hasTodo}<ListChecks size={14} />{:else}<ListPlus size={14} />{/if}
								</button>
							{/if}
						</div>
						{#if !readOnly && (c.author.id === me?.id || role === 'owner')}
							{@const isArmed = armed === c.id}
							<button
								type="button"
								class="delete icon-btn size-7 {isArmed
									? 'armed !text-danger'
									: 'hover:text-danger md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100'}"
								aria-label={isArmed ? 'Tap again to delete' : 'Delete comment'}
								title={isArmed ? 'Tap again to delete' : 'Delete'}
								onclick={() => remove(c)}
							>
								<Trash2 size={13} />
							</button>
							{#if isArmed}<span class="text-[12.5px] text-danger" aria-live="polite">Tap again to delete</span>{/if}
						{/if}
					</div>
				</header>
				<div class="body pl-8"><CommentBody body={c.body} /></div>
			</article>
		{:else}
			<p class="py-2 text-[14px] text-fg-3">No comments yet.</p>
		{/each}
	</div>

	{#if !readOnly}
		<div class="mt-3 border-t border-line pt-3">
			<MentionInput bind:value={body} {members} rows={2} onsubmit={post} />
			<div class="mt-2 flex items-center gap-2">
				{#if isPlaying}
					<button
						type="button"
						class="chip {atPlayhead ? '!bg-accent-soft !text-accent' : ''}"
						aria-pressed={atPlayhead}
						onclick={() => (atPlayhead = !atPlayhead)}
					>
						<MessageSquareDot size={13} />
						{atPlayhead ? `At ${formatTime(commentTimestamp(player.time))}` : 'At playhead'}
					</button>
				{/if}
				<button class="btn btn-primary ml-auto h-8" disabled={!body.trim() || busy} onclick={post}>Comment</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.delete {
		transition:
			background-color var(--dur-fade) var(--ease),
			color var(--dur-fade) var(--ease),
			opacity var(--dur-fade) var(--ease);
	}
	.delete.armed {
		background: color-mix(in srgb, var(--danger) 16%, transparent);
	}
	.resolved .body {
		opacity: 0.6;
	}
</style>
