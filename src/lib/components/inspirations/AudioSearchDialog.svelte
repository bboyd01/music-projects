<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Link from '@lucide/svelte/icons/link';
	import Music from '@lucide/svelte/icons/music';
	import Modal from '../Modal.svelte';
	import { api } from '#lib/api.ts';
	import type { MusicResult } from '#lib/server/music.ts';

	let { open = $bindable(false), onpick }: { open?: boolean; onpick: (r: MusicResult) => Promise<void> } = $props();

	let q = $state('');
	let results = $state<MusicResult[]>([]);
	let isLink = $state(false);
	let loading = $state(false);
	let adding = $state<number | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let seq = 0;

	$effect(() => {
		if (open) {
			q = '';
			results = [];
		}
	});

	/** Autosearch 200ms after the last keystroke; links resolve immediately. */
	function oninput() {
		clearTimeout(timer);
		const term = q.trim();
		if (term.length < 2) {
			results = [];
			return;
		}
		const linkish = /^https?:\/\//.test(term);
		timer = setTimeout(() => run(term), linkish ? 0 : 200);
	}

	async function run(term: string) {
		const id = ++seq;
		loading = true;
		try {
			const r = await api<{ results: MusicResult[]; link: boolean }>('GET', `/api/music/search?q=${encodeURIComponent(term)}`, undefined, { quiet: true });
			if (id !== seq) return;
			results = r.results;
			isLink = r.link;
			// A pasted link is added straight away.
			if (r.link && r.results[0]) pick(r.results[0], 0);
		} catch {
			if (id === seq) results = [];
		} finally {
			if (id === seq) loading = false;
		}
	}

	async function pick(r: MusicResult, i: number) {
		adding = i;
		try {
			await onpick(r);
			open = false;
		} finally {
			adding = null;
		}
	}
</script>

<Modal bind:open title="Add audio inspiration" width={500}>
	<div class="relative">
		<span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-3">
			{#if /^https?:\/\//.test(q)}<Link size={15} />{:else}<Search size={15} />{/if}
		</span>
		<!-- svelte-ignore a11y_autofocus -->
		<input class="input h-10 pl-9" placeholder="Search a track, or paste an Apple Music / Spotify link" bind:value={q} {oninput} autofocus />
	</div>
	<div class="mt-3 min-h-24">
		{#if loading && !results.length}
			<p class="py-6 text-center text-[13px] text-fg-3">Searching…</p>
		{:else if results.length}
			<ul class="space-y-0.5">
				{#each results as r, i}
					<li>
						<button type="button" class="menu-item !py-2" disabled={adding !== null} onclick={() => pick(r, i)}>
							{#if r.artwork}
								<img src={r.artwork} alt="" class="size-10 shrink-0 rounded-md object-cover" loading="lazy" />
							{:else}
								<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-hover"><Music size={16} /></span>
							{/if}
							<span class="min-w-0 flex-1 leading-tight">
								<span class="block truncate font-medium text-fg">{r.title}</span>
								<span class="block truncate text-[12px] text-fg-3">{[r.artist, r.album].filter(Boolean).join(' · ')}</span>
							</span>
							{#if adding === i}<span class="text-[12px] text-fg-3">Adding…</span>{/if}
						</button>
					</li>
				{/each}
			</ul>
		{:else if q.trim().length >= 2}
			<p class="py-6 text-center text-[13px] text-fg-3">{isLink ? 'Couldn’t read that link.' : 'No matches.'}</p>
		{:else}
			<p class="py-6 text-center text-[13px] text-fg-3">Results appear as you type.</p>
		{/if}
	</div>
</Modal>
