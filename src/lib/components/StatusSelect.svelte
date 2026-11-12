<script lang="ts">
	import { page } from '$app/state';
	import Check from '@lucide/svelte/icons/check';
	import Popover from './Popover.svelte';
	import type { Status } from '#lib/server/db/schema.ts';

	let {
		scope,
		value,
		onchange,
		disabled = false,
		size = 'md'
	}: {
		scope: 'project' | 'track';
		value: string | null;
		onchange: (id: string) => void;
		disabled?: boolean;
		size?: 'sm' | 'md';
	} = $props();

	const statuses = $derived(((page.data.statuses ?? []) as Status[]).filter((s) => s.scope === scope));
	const current = $derived(statuses.find((s) => s.id === value));
</script>

{#snippet pill()}
	<span
		class="chip {size === 'sm' ? 'h-[22px] px-2 text-[12.5px]' : ''}"
		style:background="color-mix(in srgb, {current?.color ?? 'var(--fg-3)'} 16%, transparent)"
		style:color="color-mix(in srgb, {current?.color ?? 'var(--fg-3)'} 85%, var(--fg))"
	>
		<span class="size-1.5 rounded-full" style:background={current?.color ?? 'var(--fg-3)'}></span>
		{current?.name ?? 'No status'}
	</span>
{/snippet}

{#if disabled}
	{@render pill()}
{:else}
	<Popover label="Change status" width={200} triggerClass="rounded-full">
		{#snippet trigger()}{@render pill()}{/snippet}
		{#snippet children({ close })}
			{#each statuses as s (s.id)}
				<button
					type="button"
					class="menu-item"
					data-active={s.id === value}
					onclick={() => {
						close();
						if (s.id !== value) onchange(s.id);
					}}
				>
					<span class="size-2 rounded-full" style:background={s.color}></span>
					<span class="flex-1">{s.name}</span>
					{#if s.id === value}<Check size={14} />{/if}
				</button>
			{/each}
		{/snippet}
	</Popover>
{/if}
