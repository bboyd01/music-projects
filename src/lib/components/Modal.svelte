<script lang="ts">
	import type { Snippet } from 'svelte';
	import X from '@lucide/svelte/icons/x';
	import { fade, slide } from '#lib/transitions.ts';

	let {
		open = $bindable(false),
		title,
		children,
		footer,
		width = 480,
		onclose
	}: {
		open?: boolean;
		title?: string;
		children: Snippet;
		footer?: Snippet;
		width?: number;
		onclose?: () => void;
	} = $props();

	function close() {
		open = false;
		onclose?.();
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && close()} />

{#if open}
	<div class="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
		<button
			type="button"
			class="absolute inset-0 bg-black/50"
			aria-label="Close"
			onclick={close}
			transition:fade
		></button>
		<div
			class="glass-popup relative flex max-h-[88dvh] w-full flex-col rounded-t-2xl sm:rounded-2xl"
			style:max-width="{width}px"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:slide={{ y: 12 }}
		>
			{#if title}
				<header class="flex items-center justify-between gap-4 px-5 pt-4 pb-2">
					<h2 class="serif text-xl">{title}</h2>
					<button type="button" class="icon-btn -mr-2" aria-label="Close" onclick={close}><X size={18} /></button>
				</header>
			{/if}
			<div class="scroll-thin overflow-y-auto px-5 pb-5 {title ? '' : 'pt-5'}">
				{@render children()}
			</div>
			{#if footer}
				<footer class="flex justify-end gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
