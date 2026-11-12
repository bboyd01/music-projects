<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Settings from '@lucide/svelte/icons/settings';
	import { api } from '#lib/api.ts';

	let { data, children } = $props();

	const base = $derived(`/projects/${data.project.id}`);
	const route = $derived(page.route.id ?? '');
	const onTrack = $derived(route.includes('/tracks/'));
	const onSettings = $derived(route.endsWith('/settings'));
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

<div class="mx-auto max-w-6xl px-4 pt-8 sm:px-8 md:pt-10">
	{#if onTrack}
		<!-- A track is self-contained: just a way back to its project. -->
		<a href={base} class="mb-4 inline-flex items-center gap-1.5 text-[14px] text-fg-3 hover:text-fg-2">
			<ArrowLeft size={14} />
			{data.project.name}
		</a>
	{:else}
		<header class="enter mb-8 flex items-start gap-3">
			<div class="min-w-0 flex-1">
				{#if onSettings}
					<a href={base} class="mb-2 inline-flex items-center gap-1.5 text-[14px] text-fg-3 hover:text-fg-2">
						<ArrowLeft size={14} /> Back to project
					</a>
				{/if}
				{#if canEdit && !onSettings}
					<input
						class="serif input-bare -ml-1.5 w-full px-1.5 text-4xl leading-tight sm:text-5xl"
						bind:value={name}
						aria-label="Project name"
						onblur={saveName}
						onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
					/>
				{:else}
					<h1 class="serif text-4xl leading-tight sm:text-5xl">{data.project.name}{onSettings ? ' · Settings' : ''}</h1>
				{/if}
			</div>
			{#if !onSettings}
				<a href="{base}/settings" class="icon-btn mt-2" title="Project settings" aria-label="Project settings">
					<Settings size={19} />
				</a>
			{/if}
		</header>
	{/if}

	{#key page.url.pathname}
		<div class="enter-fade">
			{@render children()}
		</div>
	{/key}
</div>
