<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import { api } from '#lib/api.ts';
	import { statusPalette } from '#lib/palette.ts';
	import type { Status } from '#lib/server/db/schema.ts';
	import Popover from '../Popover.svelte';

	let { scope, statuses }: { scope: 'project' | 'track'; statuses: Status[] } = $props();
	const list = $derived(statuses.filter((s) => s.scope === scope));
	let newName = $state('');

	async function patch(id: string, p: Record<string, unknown>) {
		await api('PATCH', `/api/statuses/${id}`, p);
		invalidateAll();
	}
	async function move(i: number, dir: -1 | 1) {
		const ids = list.map((s) => s.id);
		const j = i + dir;
		if (j < 0 || j >= ids.length) return;
		[ids[i], ids[j]] = [ids[j], ids[i]];
		await api('POST', '/api/statuses/reorder', { ids });
		invalidateAll();
	}
	async function remove(s: Status) {
		if (!confirm(`Delete “${s.name}”? Anything using it moves to the first remaining status.`)) return;
		await api('DELETE', `/api/statuses/${s.id}`);
		invalidateAll();
	}
	async function add() {
		const name = newName.trim();
		if (!name) return;
		newName = '';
		const used = new Set(list.map((s) => s.color));
		const color = statusPalette.find((c) => !used.has(c.value))?.value ?? statusPalette[0].value;
		await api('POST', '/api/statuses', { scope, name, color });
		invalidateAll();
	}
</script>

<ul class="space-y-1">
	{#each list as s, i (s.id)}
		<li class="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-hover">
			<Popover label="Color" width={196} triggerClass="flex size-7 items-center justify-center rounded-md hover:bg-hover">
				{#snippet trigger()}<span class="size-3 rounded-full" style:background={s.color}></span>{/snippet}
				{#snippet children({ close })}
					<div class="grid grid-cols-6 gap-1 p-1.5">
						{#each statusPalette as c (c.value)}
							<button
								class="flex size-7 items-center justify-center rounded-md hover:bg-hover"
								title={c.name}
								aria-label={c.name}
								onclick={() => {
									close();
									patch(s.id, { color: c.value });
								}}
							>
								<span class="flex size-4 items-center justify-center rounded-full text-black/70" style:background={c.value}>
									{#if c.value === s.color}<Check size={10} strokeWidth={3} />{/if}
								</span>
							</button>
						{/each}
					</div>
				{/snippet}
			</Popover>
			<input
				class="input-bare h-8 min-w-0 flex-1 px-2"
				value={s.name}
				aria-label="Status name"
				onblur={(e) => e.currentTarget.value.trim() && e.currentTarget.value.trim() !== s.name && patch(s.id, { name: e.currentTarget.value.trim() })}
				onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
			/>
			<label class="flex items-center gap-1.5 text-[12px] text-fg-3" title="Counts as finished">
				<input type="checkbox" checked={s.isDone} onchange={(e) => patch(s.id, { isDone: e.currentTarget.checked })} class="accent-[var(--accent)]" />
				Done
			</label>
			<button class="icon-btn size-7" aria-label="Move up" disabled={i === 0} onclick={() => move(i, -1)}><ArrowUp size={13} /></button>
			<button class="icon-btn size-7" aria-label="Move down" disabled={i === list.length - 1} onclick={() => move(i, 1)}><ArrowDown size={13} /></button>
			<button class="icon-btn size-7 hover:text-danger" aria-label="Delete status" disabled={list.length <= 1} onclick={() => remove(s)}><Trash2 size={13} /></button>
		</li>
	{/each}
</ul>
<form
	class="mt-2 flex gap-2"
	onsubmit={(e) => {
		e.preventDefault();
		add();
	}}
>
	<input class="input h-8" placeholder="New status" bind:value={newName} maxlength="40" />
	<button class="btn btn-outline h-8" disabled={!newName.trim()}><Plus size={14} /> Add</button>
</form>
