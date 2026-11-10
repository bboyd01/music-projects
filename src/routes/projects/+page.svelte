<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import Music from '@lucide/svelte/icons/music';
	import { api } from '#lib/api.ts';
	import Modal from '#lib/components/Modal.svelte';
	import StatusSelect from '#lib/components/StatusSelect.svelte';

	let { data } = $props();
	let creating = $state(false);
	let name = $state('');
	let busy = $state(false);

	async function create() {
		if (!name.trim()) return;
		busy = true;
		try {
			const { id } = await api<{ id: string }>('POST', '/api/projects', { name });
			creating = false;
			name = '';
			await invalidateAll();
			goto(`/projects/${id}`);
		} finally {
			busy = false;
		}
	}

	async function setStatus(id: string, statusId: string) {
		await api('PATCH', `/api/projects/${id}`, { statusId });
		invalidateAll();
	}
</script>

<svelte:head><title>Projects · Music Projects</title></svelte:head>

<div class="mx-auto max-w-6xl px-4 pt-8 sm:px-8 md:pt-12">
	<header class="enter mb-8 flex items-end justify-between gap-4">
		<div>
			<h1 class="serif text-4xl sm:text-5xl">Projects</h1>
		</div>
		{#if !data.user?.readOnly}
			<button class="btn btn-primary" onclick={() => (creating = true)}><Plus size={16} /> New project</button>
		{/if}
	</header>

	{#if data.list.length === 0}
		<div class="card enter flex flex-col items-center px-6 py-16 text-center">
			<Music size={28} class="mb-4 text-fg-3" strokeWidth={1.5} />
			<h2 class="serif mb-2 text-2xl">Start your first project</h2>
			<p class="mb-6 max-w-sm text-fg-2">Projects hold your tracks, sketches, inspirations and feedback.</p>
			{#if !data.user?.readOnly}
				<button class="btn btn-primary" onclick={() => (creating = true)}><Plus size={16} /> New project</button>
			{/if}
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.list as p, i (p.id)}
				<div class="project-card enter group relative overflow-hidden rounded-2xl" style:animation-delay="{Math.min(i, 8) * 18}ms">
					<a href="/projects/{p.id}" class="absolute inset-0 z-0" aria-label="Open {p.name}"></a>
					<div class="cover pointer-events-none absolute inset-0" style:background-image="url('{p.backdrop}')"></div>
					<div class="pointer-events-none absolute inset-0" style:background="var(--card-scrim)"></div>
					<div class="pointer-events-none relative flex h-48 flex-col justify-between p-5 text-white">
						<div class="pointer-events-auto relative z-10 self-start">
							<StatusSelect scope="project" value={p.statusId} size="sm" disabled={p.role === 'viewer'} onchange={(s) => setStatus(p.id, s)} />
						</div>
						<div>
							<h2 class="serif text-2xl leading-tight">{p.name}</h2>
							<p class="mt-1 text-[12.5px] text-white/65">
								{p.trackCount} {p.trackCount === 1 ? 'track' : 'tracks'}{p.role !== 'owner' ? ` · ${p.role}` : ''}
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Modal bind:open={creating} title="New project" width={420}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			create();
		}}
	>
		<input class="input h-10" placeholder="Project name" bind:value={name} maxlength="120" />
		<div class="mt-4 flex justify-end gap-2">
			<button type="button" class="btn btn-ghost" onclick={() => (creating = false)}>Cancel</button>
			<button class="btn btn-primary" disabled={!name.trim() || busy}>Create</button>
		</div>
	</form>
</Modal>

<style>
	.project-card {
		border: 1px solid var(--line);
		box-shadow: var(--shadow);
		transition: transform var(--dur-panel) var(--ease);
	}
	.project-card:hover {
		transform: translateY(-2px);
	}
	.cover {
		background-size: cover;
		background-position: center;
		filter: blur(6px) saturate(0.8);
		transform: scale(1.08);
	}
</style>
