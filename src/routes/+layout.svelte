<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Backdrop from '#lib/components/Backdrop.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import Sidebar from '#lib/components/shell/Sidebar.svelte';
	import TabBar from '#lib/components/shell/TabBar.svelte';
	import AudioEngine from '#lib/components/player/AudioEngine.svelte';
	import MiniPlayer from '#lib/components/player/MiniPlayer.svelte';
	import CommentComposer from '#lib/components/comments/CommentComposer.svelte';
	import { ui } from '#lib/state/ui.svelte.ts';
	import { player } from '#lib/state/player.svelte.ts';

	let { data, children } = $props();

	$effect(() => {
		ui.motion = data.user?.settings.motion ?? 'on';
	});

	const onListenFull = $derived(page.url.pathname === '/listen' && player.mode === 'full');
	const showMini = $derived(!!player.current && !onListenFull);
</script>

<svelte:head>
	<title>Music Projects</title>
</svelte:head>

<Backdrop />

{#if data.user}
	<div class="flex min-h-dvh">
		<Sidebar />
		<main
			class="min-w-0 flex-1 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-6"
			class:has-mini={showMini}
			style:--mini-h={showMini ? '5rem' : '0px'}
		>
			{@render children()}
		</main>
	</div>
	{#if showMini}<MiniPlayer />{/if}
	<TabBar />
	<CommentComposer />
	<AudioEngine />
{:else}
	{@render children()}
{/if}

<Toasts />

<style>
	/* Leave room for the mini player above the content's end. */
	main.has-mini {
		padding-bottom: calc(env(safe-area-inset-bottom) + 9.5rem);
	}
	@media (min-width: 768px) {
		main.has-mini {
			padding-bottom: 6.5rem;
		}
	}
</style>
