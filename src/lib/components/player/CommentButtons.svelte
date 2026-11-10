<script lang="ts">
	import MessageSquarePlus from '@lucide/svelte/icons/message-square-plus';
	import MessageSquareDot from '@lucide/svelte/icons/message-square-dot';
	import { composer } from '#lib/state/composer.svelte.ts';
	import { page } from '$app/state';

	let { size = 18 }: { size?: number } = $props();
</script>

{#if !page.data.user?.readOnly}
<div class="flex items-center gap-0.5">
	<button
		type="button"
		class="icon-btn"
		title="Add comment"
		aria-label="Add a general comment"
		onclick={() => composer.general()}
	>
		<MessageSquarePlus {size} strokeWidth={1.7} />
	</button>
	<button
		type="button"
		class="icon-btn text-accent hover:text-accent"
		title="Add comment at playhead (−3s)"
		aria-label="Add a timestamped comment at the playhead"
		onclick={() => composer.timestamped()}
	>
		<MessageSquareDot {size} strokeWidth={1.7} />
	</button>
</div>
{/if}
