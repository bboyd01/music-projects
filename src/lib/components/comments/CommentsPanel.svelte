<script lang="ts">
	import ListPlus from '@lucide/svelte/icons/list-plus';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Trash2 from '@lucide/svelte/icons/trash-2';
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
		onchange
	}: {
		comments: CommentView[];
		trackId: string;
		projectId: string;
		members: Member[];
		role: 'owner' | 'editor' | 'viewer';
		onchange: () => void;
	} = $props();

	let body = $state('');
	let busy = $state(false);
	let atPlayhead = $state(false);
	const isPlaying = $derived(player.current?.id === trackId);
	const me = $derived(page.data.user?.id);

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

	async function toTodo(c: CommentView) {
		await api('POST', `/api/comments/${c.id}/todo`);
		toast('Added to todos');
		onchange();
	}

	async function remove(c: CommentView) {
		if (!confirm('Delete this comment?')) return;
		await api('DELETE', `/api/comments/${c.id}`);
		onchange();
	}
</script>

<div class="space-y-3">
	<div>
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

	{#each comments as c (c.id)}
		<article class="group rounded-xl px-1 py-2">
			<header class="mb-1 flex items-center gap-2">
				<span class="flex size-6 items-center justify-center rounded-full bg-hover text-[11px] font-semibold">{c.author.name[0]?.toUpperCase()}</span>
				<span class="text-[13px] font-medium">{c.author.name}</span>
				<span class="text-[12px] text-fg-3">{relativeTime(c.createdAt)}</span>
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
				<div class="-my-1 flex opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
					{#if role !== 'viewer'}
						<button
							type="button"
							class="icon-btn size-7 {c.hasTodo ? 'text-accent' : ''}"
							title={c.hasTodo ? 'Already a todo' : 'Make todo'}
							aria-label="Make todo"
							disabled={c.hasTodo}
							onclick={() => toTodo(c)}
						>
							{#if c.hasTodo}<ListChecks size={14} />{:else}<ListPlus size={14} />{/if}
						</button>
					{/if}
					{#if c.author.id === me || role === 'owner'}
						<button type="button" class="icon-btn size-7 hover:text-danger" aria-label="Delete comment" onclick={() => remove(c)}>
							<Trash2 size={13} />
						</button>
					{/if}
				</div>
			</header>
			<div class="pl-8"><CommentBody body={c.body} /></div>
		</article>
	{:else}
		<p class="py-2 text-[13px] text-fg-3">No comments yet.</p>
	{/each}
</div>
