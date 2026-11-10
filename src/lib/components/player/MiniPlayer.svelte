<script lang="ts">
	import { goto } from '$app/navigation';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import X from '@lucide/svelte/icons/x';
	import { player } from '#lib/state/player.svelte.ts';
	import { slide } from '#lib/transitions.ts';
	import TrackIcon from '../TrackIcon.svelte';
	import ProgressLine from './ProgressLine.svelte';
	import Transport from './Transport.svelte';
	import CommentButtons from './CommentButtons.svelte';

	function expand() {
		player.mode = 'full';
		goto('/listen');
	}
</script>

<div
	class="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+3.9rem)] z-40 md:right-4 md:bottom-4 md:left-[248px]"
	transition:slide={{ y: 10 }}
>
	<div class="glass-blur rounded-2xl px-3 pt-1 pb-2 md:px-4">
		<ProgressLine compact />
		<div class="flex items-center gap-3">
			<span class="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-2 sm:flex">
				<TrackIcon icon={player.current?.icon ?? 'note'} size={17} />
			</span>
			<!-- Tapping the title goes to the track page; the player stays minimized. -->
			<a
				href="/projects/{player.project?.id}/tracks/{player.current?.id}"
				class="min-w-0 flex-1 leading-tight"
				title="Open track"
			>
				<p class="truncate text-[13.5px] font-semibold">{player.current?.title}</p>
				<p class="truncate text-[12px] text-fg-3">{player.current?.filename}</p>
			</a>
			<div class="hidden md:block"><CommentButtons size={17} /></div>
			<Transport size="sm" />
			<button type="button" class="icon-btn" aria-label="Expand player" title="Expand" onclick={expand}>
				<ChevronUp size={18} />
			</button>
			<button type="button" class="icon-btn hidden md:inline-flex" aria-label="Close player" title="Close" onclick={() => player.stop()}>
				<X size={16} />
			</button>
		</div>
	</div>
</div>
