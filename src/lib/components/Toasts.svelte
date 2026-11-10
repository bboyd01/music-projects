<script lang="ts">
	import { ui } from '#lib/state/ui.svelte.ts';
	import { slide } from '#lib/transitions.ts';
</script>

<div
	class="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[80] flex flex-col items-center gap-2 px-4"
	aria-live="polite"
>
	{#each ui.toasts as t (t.id)}
		<div
			class="glass-popup pointer-events-auto max-w-sm rounded-xl px-4 py-2.5 text-[13px] {t.kind === 'error'
				? 'text-danger'
				: 'text-fg'}"
			transition:slide={{ y: -6 }}
		>
			{t.message}
		</div>
	{/each}
</div>
