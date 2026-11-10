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
		<!-- Phones: one row. Desktop: title left, all controls centered in the bar. -->
		<div class="flex items-center gap-1.5 sm:gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
			<div class="flex min-w-0 flex-1 items-center gap-3">
				<span class="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-2 sm:flex">
					<TrackIcon icon={player.current?.icon ?? 'note'} size={17} />
				</span>
				<!-- Tapping the title goes to the track page; the player stays minimized. -->
				<a
					href="/projects/{player.project?.id}/tracks/{player.current?.id}"
					class="ml-1 min-w-0 flex-1 leading-tight sm:ml-0"
					title="Open track"
				>
					<p class="truncate text-[13.5px] font-semibold">{player.current?.title}</p>
					<p class="truncate text-[12px] text-fg-3">{player.current?.filename}</p>
				</a>
			</div>
			<div class="flex shrink-0 items-center gap-1.5 sm:gap-3 md:justify-center">
				<div class="hidden md:block"><CommentButtons size={17} /></div>
				<Transport size="sm" />
				<button type="button" class="icon-btn" aria-label="Expand player" title="Expand" onclick={expand}>
					<ChevronUp size={18} />
				</button>
				<button type="button" class="icon-btn -mr-1 sm:mr-0" aria-label="Close player" title="Close" onclick={() => player.stop()}>
					<X size={16} />
				</button>
			</div>
			<!-- Desktop spacer balancing the title so the controls sit at the true center. -->
			<div class="hidden md:block"></div>
		</div>
	</div>
</div>
