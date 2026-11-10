<script lang="ts">
	import MoreHorizontal from '@lucide/svelte/icons/ellipsis';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { InspirationView } from '#lib/server/queries.ts';
	import { api } from '#lib/api.ts';
	import Popover from '../Popover.svelte';
	import InspirationContent from './InspirationContent.svelte';
	import AddInspiration from './AddInspiration.svelte';
	import TextDialog from './TextDialog.svelte';

	let {
		items,
		projectId,
		trackId,
		canEdit,
		onchange
	}: { items: InspirationView[]; projectId: string; trackId: string; canEdit: boolean; onchange: () => void } = $props();

	let editing = $state<InspirationView | null>(null);
	let editOpen = $state(false);

	async function remove(i: InspirationView) {
		if (!confirm('Delete this inspiration?')) return;
		await api('DELETE', `/api/inspirations/${i.id}`);
		onchange();
	}
	async function saveText(text: string) {
		if (!editing) return;
		await api('PATCH', `/api/inspirations/${editing.id}`, { text });
		onchange();
	}

	const images = $derived(items.filter((i) => i.type === 'image'));
	const others = $derived(items.filter((i) => i.type !== 'image'));
</script>

{#snippet menu(i: InspirationView)}
	{#if canEdit}
		<div class="absolute top-1.5 right-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
			<Popover label="Inspiration options" width={190} align="end" triggerClass="icon-btn size-7 bg-[var(--glass-strong)]">
				{#snippet trigger()}<MoreHorizontal size={14} />{/snippet}
				{#snippet children({ close })}
					{#if i.type === 'text'}
						<button class="menu-item" onclick={() => { close(); editing = i; editOpen = true; }}><Pencil size={14} /> Edit text</button>
					{/if}
					<button class="menu-item !text-danger" onclick={() => { close(); remove(i); }}><Trash2 size={14} /> Delete</button>
				{/snippet}
			</Popover>
		</div>
	{/if}
{/snippet}

<div class="space-y-3">
	{#if canEdit}<AddInspiration {projectId} {trackId} compact onadded={onchange} />{/if}
	{#if others.length}
		<ul class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
			{#each others as i (i.id)}
				<li class="card group relative overflow-hidden {i.type === 'text' ? 'max-h-48' : ''}">
					<InspirationContent item={i} />
					{@render menu(i)}
				</li>
			{/each}
		</ul>
	{/if}
	{#if images.length}
		<div class="columns-2 gap-2 sm:columns-3 lg:columns-4">
			{#each images as i (i.id)}
				<div class="group relative mb-2 break-inside-avoid overflow-hidden rounded-lg border border-line">
					<InspirationContent item={i} />
					{@render menu(i)}
				</div>
			{/each}
		</div>
	{/if}
	{#if !items.length}
		<p class="text-[13px] text-fg-3">No inspirations for this track yet. These are separate from the project’s canvas.</p>
	{/if}
</div>

<TextDialog bind:open={editOpen} title="Edit text" initial={editing?.type === 'text' ? editing.data.text : ''} onsave={saveText} />
