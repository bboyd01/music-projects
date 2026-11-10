<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Shuffle from '@lucide/svelte/icons/shuffle';
	import Upload from '@lucide/svelte/icons/upload';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { api, uploadWithProgress } from '#lib/api.ts';
	import { toast } from '#lib/state/ui.svelte.ts';

	type Bg = { id: string; backdrop: string; full: string; builtIn: boolean };
	const bg = $derived(page.data.background as { setting: { mode: 'random' } | { mode: 'fixed'; id: string }; pool: Bg[] });
	const selectedId = $derived(bg.setting.mode === 'fixed' ? bg.setting.id : null);

	let input = $state<HTMLInputElement>()!;
	let uploading = $state(false);

	async function choose(body: { mode: 'random' } | { mode: 'fixed'; id: string }) {
		await api('PUT', '/api/backgrounds/selected', body);
		try {
			sessionStorage.removeItem('mp.bg'); // let Random re-roll
		} catch {
			/* ignore */
		}
		await invalidateAll();
	}

	async function upload(file: File | undefined) {
		if (!file) return;
		uploading = true;
		const form = new FormData();
		form.append('file', file);
		try {
			await uploadWithProgress('POST', '/api/backgrounds', form, {}, () => {});
			toast('Background uploaded and selected');
			await invalidateAll();
		} catch {
			/* toast shown */
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	async function remove(b: Bg) {
		if (!confirm('Delete this background?')) return;
		await api('DELETE', `/api/backgrounds/${b.id}`);
		await invalidateAll();
	}
</script>

<input bind:this={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="hidden" onchange={(e) => upload(e.currentTarget.files?.[0])} />

<div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
	<button
		type="button"
		class="tile flex flex-col items-center justify-center gap-1 text-[12px] {selectedId === null ? 'active' : ''}"
		aria-pressed={selectedId === null}
		onclick={() => choose({ mode: 'random' })}
	>
		<Shuffle size={18} />
		Random
	</button>
	{#each bg.pool as b (b.id)}
		<div class="relative">
			<button
				type="button"
				class="tile w-full overflow-hidden {selectedId === b.id ? 'active' : ''}"
				aria-label={b.builtIn ? 'Built-in background' : 'Uploaded background'}
				aria-pressed={selectedId === b.id}
				onclick={() => choose({ mode: 'fixed', id: b.id })}
			>
				<img src={b.backdrop} alt="" class="h-full w-full object-cover" loading="lazy" />
				{#if selectedId === b.id}
					<span class="absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent"><Check size={12} strokeWidth={3} /></span>
				{/if}
			</button>
			{#if !b.builtIn}
				<button
					type="button"
					class="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border border-line bg-[var(--glass-popup)] text-fg-2 hover:text-danger"
					aria-label="Delete background"
					onclick={() => remove(b)}><X size={12} /></button
				>
			{/if}
		</div>
	{/each}
	<button
		type="button"
		class="tile flex flex-col items-center justify-center gap-1 border-dashed text-[12px]"
		disabled={uploading}
		onclick={() => input.click()}
	>
		<Upload size={18} />
		{uploading ? 'Uploading…' : 'Upload'}
	</button>
</div>

<style>
	.tile {
		position: relative;
		aspect-ratio: 16 / 10;
		border-radius: 0.75rem;
		border: 2px solid var(--line);
		color: var(--fg-2);
		background: var(--hover);
		transition: border-color var(--dur-fade) var(--ease);
	}
	.tile:hover {
		border-color: var(--line-strong);
		color: var(--fg);
	}
	.tile.active {
		border-color: var(--accent);
		color: var(--accent);
	}
</style>
