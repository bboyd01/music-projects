<script lang="ts">
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Settings from '@lucide/svelte/icons/settings';
	import { api } from '#lib/api.ts';
	import { autogrow } from '#lib/actions.ts';

	let { data, children } = $props();

	const base = $derived(`/projects/${data.project.id}`);
	const route = $derived(page.route.id ?? '');
	const onTrack = $derived(route.includes('/tracks/'));
	const onSettings = $derived(route.endsWith('/settings'));
	const canEdit = $derived(data.role !== 'viewer');

	let name = $state('');
	// The title shows clamped to two lines; clicking it swaps in a full-height textarea.
	let editing = $state(false);
	let field = $state<HTMLTextAreaElement>();
	async function startEditing() {
		editing = true;
		await tick();
		field?.focus();
		field?.setSelectionRange(name.length, name.length);
	}
	$effect(() => {
		name = data.project.name;
	});

	async function saveName() {
		editing = false;
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
				{#if canEdit && !onSettings && editing}
					<textarea
						bind:this={field}
						class="serif input-bare -ml-1.5 block w-full resize-none px-1.5 text-4xl leading-tight break-words sm:text-5xl"
						rows="1"
						bind:value={name}
						use:autogrow={name}
						aria-label="Project name"
						onblur={saveName}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === 'Escape') {
								e.preventDefault();
								if (e.key === 'Escape') name = data.project.name;
								e.currentTarget.blur();
							}
						}}
					></textarea>
				{:else if canEdit && !onSettings}
					<h1 class="serif text-4xl leading-tight sm:text-5xl">
						<button
							type="button"
							class="input-bare -ml-1.5 line-clamp-2 w-full cursor-text px-1.5 text-left break-words"
							title={data.project.name}
							aria-label="Edit project name: {data.project.name}"
							onclick={startEditing}>{name}</button
						>
					</h1>
				{:else}
					<h1 class="serif line-clamp-2 text-4xl leading-tight break-words sm:text-5xl" title={data.project.name}>
						{data.project.name}{onSettings ? ' · Settings' : ''}
					</h1>
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
