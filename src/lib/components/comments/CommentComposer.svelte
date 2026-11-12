<script lang="ts">
	import Modal from '../Modal.svelte';
	import MentionInput from './MentionInput.svelte';
	import { composer } from '#lib/state/composer.svelte.ts';
	import { player } from '#lib/state/player.svelte.ts';
	import { api } from '#lib/api.ts';
	import { formatTime } from '#lib/time.ts';
	import { toast } from '#lib/state/ui.svelte.ts';
	import { invalidateAll } from '$app/navigation';

	let body = $state('');
	let busy = $state(false);

	$effect(() => {
		if (composer.open) body = '';
	});

	async function post() {
		if (!body.trim() || !composer.trackId || busy) return;
		busy = true;
		try {
			await api('POST', `/api/tracks/${composer.trackId}/comments`, {
				body,
				timestampSec: composer.timestampSec
			});
			composer.open = false;
			toast(composer.timestampSec != null ? `Comment added at ${formatTime(composer.timestampSec)}` : 'Comment added');
			composer.onPosted?.();
			if (player.current?.id === composer.trackId) void player.refreshDetail();
			void invalidateAll();
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open={composer.open} title="Comment" width={460}>
	<p class="-mt-1 mb-3 flex items-center gap-2 text-[14px] text-fg-2">
		<span class="truncate">{composer.trackTitle}</span>
		{#if composer.timestampSec != null}
			<span class="ts-chip">{formatTime(composer.timestampSec)}</span>
			<button type="button" class="text-[13px] text-fg-3 hover:text-fg" onclick={() => (composer.timestampSec = null)}>
				Remove timestamp
			</button>
		{/if}
	</p>
	<MentionInput bind:value={body} members={composer.members} autofocus rows={4} onsubmit={post} />
	<div class="mt-3 flex items-center justify-between gap-2">
		<span class="hidden text-[12.5px] text-fg-3 sm:block">⌘/Ctrl + Enter to post</span>
		<div class="ml-auto flex gap-2">
			<button type="button" class="btn btn-ghost" onclick={() => (composer.open = false)}>Cancel</button>
			<button type="button" class="btn btn-primary" disabled={!body.trim() || busy} onclick={post}>Post</button>
		</div>
	</div>
</Modal>
