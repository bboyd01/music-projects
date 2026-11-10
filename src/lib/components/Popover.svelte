<script lang="ts">
	import type { Snippet } from 'svelte';
	import { slide } from '#lib/transitions.ts';

	let {
		trigger,
		children,
		align = 'start',
		width,
		open = $bindable(false),
		label = 'Open menu',
		triggerClass = ''
	}: {
		trigger: Snippet<[{ open: boolean }]>;
		children: Snippet<[{ close: () => void }]>;
		align?: 'start' | 'end';
		width?: number;
		open?: boolean;
		label?: string;
		triggerClass?: string;
	} = $props();

	let btn: HTMLButtonElement;
	let panel = $state<HTMLDivElement>();
	let pos = $state({ top: 0, left: 0, maxH: 400, up: false });

	function place() {
		const r = btn.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const w = Math.min(width ?? 220, vw - 16);
		const below = vh - r.bottom - 12;
		const above = r.top - 12;
		const up = below < 220 && above > below;
		let left = align === 'end' ? r.right - w : r.left;
		left = Math.max(8, Math.min(left, vw - w - 8));
		pos = { top: up ? r.top - 6 : r.bottom + 6, left, maxH: Math.max(160, up ? above : below), up };
	}

	function toggle(e: MouseEvent) {
		e.stopPropagation();
		if (!open) place();
		open = !open;
	}
	const close = () => (open = false);

	function onWindowPointer(e: PointerEvent) {
		if (!open) return;
		const t = e.target as Node;
		if (panel?.contains(t) || btn.contains(t)) return;
		open = false;
	}
</script>

<svelte:window
	onpointerdown={onWindowPointer}
	onkeydown={(e) => open && e.key === 'Escape' && close()}
	onresize={() => open && place()}
	onscrollcapture={(e) => open && !panel?.contains(e.target as Node) && close()}
/>

<button
	bind:this={btn}
	type="button"
	class={triggerClass}
	aria-haspopup="menu"
	aria-expanded={open}
	aria-label={label}
	onclick={toggle}
>
	{@render trigger({ open })}
</button>

{#if open}
	<div
		bind:this={panel}
		class="menu scroll-thin fixed overflow-y-auto"
		role="menu"
		tabindex="-1"
		style:top={pos.up ? undefined : `${pos.top}px`}
		style:bottom={pos.up ? `${window.innerHeight - pos.top}px` : undefined}
		style:left="{pos.left}px"
		style:width={width ? `${Math.min(width, window.innerWidth - 16)}px` : undefined}
		style:max-height="{pos.maxH}px"
		transition:slide={{ y: pos.up ? 4 : -4 }}
	>
		{@render children({ close })}
	</div>
{/if}
