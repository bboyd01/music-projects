<script lang="ts">
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import { player } from '#lib/state/player.svelte.ts';

	let { projectId, trackId, disabled = false }: { projectId: string; trackId: string; disabled?: boolean } = $props();
	const isCurrent = $derived(player.current?.id === trackId);

	function click(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (isCurrent) player.toggle();
		else player.open(projectId, trackId);
	}
</script>

<button
	type="button"
	class="icon-btn size-8 {isCurrent ? 'text-accent' : ''} disabled:opacity-25"
	aria-label={isCurrent && player.playing ? 'Pause' : 'Play'}
	{disabled}
	onclick={click}
>
	{#if isCurrent && player.playing}
		<Pause size={15} fill="currentColor" strokeWidth={0} />
	{:else}
		<Play size={15} fill="currentColor" strokeWidth={0} />
	{/if}
</button>
