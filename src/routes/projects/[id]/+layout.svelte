<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { api } from '#lib/api.ts';
	import { ui } from '#lib/state/ui.svelte.ts';
	import StatusSelect from '#lib/components/StatusSelect.svelte';

	let { data, children } = $props();

	$effect(() => {
		ui.backdrop = data.backdrop.backdrop;
	});

	const base = $derived(`/projects/${data.project.id}`);
	const tabs = $derived([
		{ href: base, label: 'Tracks', match: (p: string) => p === base || p.startsWith(`${base}/tracks`) },
		{ href: `${base}/inspirations`, label: 'Inspirations', match: (p: string) => p.startsWith(`${base}/inspirations`) },
		{ href: `${base}/settings`, label: 'Settings', match: (p: string) => p.startsWith(`${base}/settings`) }
	]);
	const canEdit = $derived(data.role !== 'viewer');

	let name = $state('');
	$effect(() => {
		name = data.project.name;
	});

	async function saveName() {
		const v = name.trim();
		if (!v || v === data.project.name) {
			name = data.project.name;
			return;
		}
		await api('PATCH', `/api/projects/${data.project.id}`, { name: v });
		invalidateAll();
	}
</script>

<svelte:head><title>{data.project.name} · Music Projects</title></svelte:head>

<div class="mx-auto max-w-6xl px-4 pt-6 sm:px-8 md:pt-10">
	<header class="enter mb-5">
		<div class="mb-2 flex items-center gap-3">
			<a href="/projects" class="eyebrow hover:text-fg-2">Projects</a>
			<span class="text-fg-3">/</span>
			<StatusSelect
				scope="project"
				value={data.project.statusId}
				disabled={!canEdit}
				size="sm"
				onchange={async (statusId) => {
					await api('PATCH', `/api/projects/${data.project.id}`, { statusId });
					invalidateAll();
				}}
			/>
		</div>
		{#if canEdit}
			<input
				class="serif input-bare -ml-1.5 w-full px-1.5 text-4xl leading-tight sm:text-5xl"
				bind:value={name}
				aria-label="Project name"
				onblur={saveName}
				onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
			/>
		{:else}
			<h1 class="serif text-4xl leading-tight sm:text-5xl">{data.project.name}</h1>
		{/if}
	</header>

	<nav class="mb-6 flex gap-1 border-b border-line" aria-label="Project">
		{#each tabs as t (t.href)}
			{@const active = t.match(page.url.pathname)}
			<a
				href={t.href}
				class="tab relative -mb-px px-3 pb-2.5 text-[13.5px] font-medium {active ? 'text-fg' : 'text-fg-3 hover:text-fg-2'}"
				aria-current={active ? 'page' : undefined}
			>
				{t.label}
				{#if active}<span class="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent"></span>{/if}
			</a>
		{/each}
	</nav>

	{#key page.url.pathname}
		<div class="enter-fade">
			{@render children()}
		</div>
	{/key}
</div>
