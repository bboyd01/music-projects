<script lang="ts">
	import Ban from '@lucide/svelte/icons/ban';
	import Popover from './Popover.svelte';
	import TrackIcon from './TrackIcon.svelte';
	import { iconGroups } from '#lib/icons.ts';

	let {
		value,
		onchange,
		disabled = false,
		size = 22
	}: { value: string | null; onchange: (icon: string | null) => void; disabled?: boolean; size?: number } = $props();

	let query = $state('');
	const groups = $derived(
		iconGroups
			.map((g) => ({
				...g,
				icons: g.icons.filter(
					(i) => !query || i.label.toLowerCase().includes(query.toLowerCase()) || i.key.includes(query.toLowerCase())
				)
			}))
			.filter((g) => g.icons.length)
	);
</script>

{#snippet face()}
	<span
		class="flex items-center justify-center rounded-xl text-fg-2"
		style:width="{size + 18}px"
		style:height="{size + 18}px"
		style:background="var(--hover)"
	>
		{#if value}<TrackIcon icon={value} {size} />{:else}<span class="text-fg-3"><TrackIcon icon="note" size={size - 4} /></span>{/if}
	</span>
{/snippet}

{#if disabled}
	{@render face()}
{:else}
	<Popover label="Choose icon" width={316} triggerClass="rounded-xl">
		{#snippet trigger()}{@render face()}{/snippet}
		{#snippet children({ close })}
			<div class="p-1.5">
				<input class="input mb-2 h-8" placeholder="Search icons" bind:value={query} />
				<button
					type="button"
					class="menu-item mb-1"
					onclick={() => {
						onchange(null);
						close();
					}}><Ban size={14} /> No icon</button
				>
				{#each groups as g (g.name)}
					<p class="eyebrow px-1 pt-2 pb-1">{g.name}</p>
					<div class="grid grid-cols-8 gap-0.5">
						{#each g.icons as i (i.key)}
							<button
								type="button"
								title={i.label}
								aria-label={i.label}
								class="icon-btn size-8 {value === i.key ? 'bg-accent-soft text-accent' : ''}"
								onclick={() => {
									onchange(i.key);
									close();
								}}
							>
								<TrackIcon icon={i.key} size={17} />
							</button>
						{/each}
					</div>
				{/each}
			</div>
		{/snippet}
	</Popover>
{/if}
