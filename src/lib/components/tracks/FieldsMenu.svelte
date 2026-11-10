<script lang="ts">
	import Columns3 from '@lucide/svelte/icons/columns-3';
	import Check from '@lucide/svelte/icons/check';
	import Popover from '../Popover.svelte';
	import { trackFields, type TrackFieldId } from '#lib/track-fields.ts';

	let { fields, onchange }: { fields: TrackFieldId[]; onchange: (f: TrackFieldId[]) => void } = $props();

	function toggle(id: TrackFieldId) {
		onchange(fields.includes(id) ? fields.filter((f) => f !== id) : trackFields.map((f) => f.id).filter((f) => f === id || fields.includes(f)));
	}
</script>

<Popover label="Show or hide fields" width={200} align="end" triggerClass="btn btn-ghost h-8 px-2.5">
	{#snippet trigger()}<Columns3 size={15} /> <span class="hidden sm:inline">Fields</span>{/snippet}
	{#snippet children()}
		<p class="eyebrow px-2.5 pt-1.5 pb-1">Show fields</p>
		{#each trackFields as f (f.id)}
			<button type="button" class="menu-item" role="menuitemcheckbox" aria-checked={fields.includes(f.id)} onclick={() => toggle(f.id)}>
				<span class="flex size-4 items-center justify-center rounded border border-line-strong {fields.includes(f.id) ? 'border-accent bg-accent text-on-accent' : ''}">
					{#if fields.includes(f.id)}<Check size={11} strokeWidth={3} />{/if}
				</span>
				{f.label}
			</button>
		{/each}
	{/snippet}
</Popover>
