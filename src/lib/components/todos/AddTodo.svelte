<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Clock from '@lucide/svelte/icons/clock';
	import { player } from '#lib/state/player.svelte.ts';
	import { commentTimestamp } from '#lib/time.ts';

	let { trackId, onadd }: { trackId: string; onadd: (text: string, timestampSec: number | null) => Promise<void> } = $props();

	let text = $state('');
	let stamp = $state(false);
	const isPlaying = $derived(player.current?.id === trackId);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const v = text.trim();
		if (!v) return;
		text = '';
		await onadd(v, stamp && isPlaying ? commentTimestamp(player.time) : null);
	}
</script>

<form class="mt-1 flex items-center gap-1.5" onsubmit={submit}>
	<Plus size={14} class="ml-1.5 shrink-0 text-fg-3" />
	<input class="input-bare h-8 min-w-0 flex-1 px-1.5 text-[13.5px]" placeholder="Add an item" bind:value={text} />
	{#if isPlaying}
		<button
			type="button"
			class="icon-btn size-8 {stamp ? 'text-accent' : ''}"
			title={stamp ? 'Timestamp at playhead: on' : 'Timestamp at playhead'}
			aria-pressed={stamp}
			onclick={() => (stamp = !stamp)}><Clock size={14} /></button
		>
	{/if}
</form>
