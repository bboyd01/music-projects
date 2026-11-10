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

	// ── Backdrop: one place decides what's behind everything ──
	type Bg = { id: string; backdrop: string };
	let randomPick = $state<Bg | null>(null);
	$effect(() => {
		// Random: pick once per browser session so it doesn't change on every navigation.
		const pool = data.background.pool as Bg[];
		if (data.background.selected || !pool.length) return;
		let id: string | null = null;
		try {
			id = sessionStorage.getItem('mp.bg');
		} catch {
			/* storage unavailable */
		}
		let pick = pool.find((b) => b.id === id);
		if (!pick) {
			pick = pool[Math.floor(Math.random() * pool.length)];
			try {
				sessionStorage.setItem('mp.bg', pick.id);
			} catch {
				/* ignore */
			}
		}
		randomPick = pick;
	});
	const globalBackdrop = $derived(data.background.selected?.backdrop ?? randomPick?.backdrop ?? '/backgrounds/bg-01.webp');
	$effect(() => {
		const route = page.route.id ?? '';
		const projectBg = (page.data as { backdrop?: { backdrop: string } }).backdrop?.backdrop;
		if (route.startsWith('/projects/[id]') && projectBg) ui.backdrop = projectBg;
		else if (route === '/listen' && player.project) ui.backdrop = player.project.backdrop.backdrop;
		else ui.backdrop = globalBackdrop;
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
