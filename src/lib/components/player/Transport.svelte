<script lang="ts">
	import SkipBack from '@lucide/svelte/icons/skip-back';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import { player } from '#lib/state/player.svelte.ts';

	let { size = 'md' }: { size?: 'sm' | 'md' | 'lg' } = $props();
	const s = $derived({ sm: 16, md: 20, lg: 24 }[size]);
	const main = $derived({ sm: 'size-9', md: 'size-11', lg: 'size-14' }[size]);
</script>

<div class="flex items-center justify-center {size === 'lg' ? 'gap-6' : 'gap-1.5'}">
	<button type="button" class="icon-btn" aria-label="Previous track" onclick={() => player.prev()}>
		<SkipBack size={s} fill="currentColor" />
	</button>
	<button
		type="button"
		class="play {main} flex items-center justify-center rounded-full bg-fg text-bg"
		aria-label={player.playing ? 'Pause' : 'Play'}
		onclick={() => player.toggle()}
	>
		{#if player.playing}
			<Pause size={s} fill="currentColor" strokeWidth={0} />
		{:else}
			<Play size={s} fill="currentColor" strokeWidth={0} class="translate-x-[1px]" />
		{/if}
	</button>
	<button type="button" class="icon-btn" aria-label="Next track" disabled={!player.hasNext} onclick={() => player.next()}>
		<SkipForward size={s} fill="currentColor" class={player.hasNext ? '' : 'opacity-30'} />
	</button>
</div>

<style>
	.play {
		transition: transform var(--dur-fade) var(--ease);
	}
	.play:active {
		transform: scale(0.94);
	}
</style>
