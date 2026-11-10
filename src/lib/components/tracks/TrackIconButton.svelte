<script lang="ts">
	import { page } from '$app/state';
	import { openerUrl, projectPath } from '#lib/daw.ts';
	import TrackIcon from '../TrackIcon.svelte';

	/**
	 * A track's icon. When "Open in DAW" is set up, clicking it opens the track's project
	 * (same as the track page's Open Project button). Otherwise it's just the icon.
	 */
	let {
		title,
		icon,
		size = 16,
		placeholder = false,
		class: cls = ''
	}: { title: string; icon: string | null; size?: number; placeholder?: boolean; class?: string } = $props();

	const settings = $derived(page.data.user?.settings ?? {});
	const path = $derived(settings.dawEnabled === false ? null : projectPath(settings.projectFolder, settings.projectExt, title));

	function open(e: MouseEvent) {
		// Don't also open the track (rows and list items are clickable).
		e.preventDefault();
		e.stopPropagation();
		if (path) window.location.href = openerUrl(path);
	}
</script>

{#if path}
	<button
		type="button"
		class="daw-icon {cls} {icon ? '' : 'faint'}"
		title={`Open project in your DAW\n${path}`}
		aria-label="Open {title} in your DAW"
		onclick={open}
	>
		<TrackIcon icon={icon ?? 'note'} {size} />
	</button>
{:else if icon || placeholder}
	<span class="{cls} {icon ? '' : 'text-fg-3'}"><TrackIcon icon={icon ?? 'note'} {size} /></span>
{/if}

<style>
	.daw-icon {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		color: var(--fg-2);
		cursor: pointer;
		transition:
			color var(--dur-panel) var(--ease),
			background-color var(--dur-panel) var(--ease),
			box-shadow var(--dur-panel) var(--ease),
			transform var(--dur-panel) var(--ease);
	}
	.daw-icon.faint {
		color: var(--fg-3);
	}
	/* Hover: a soft brass glow and a slight lift. Timing follows the app's motion settings. */
	.daw-icon:hover,
	.daw-icon:focus-visible {
		color: var(--accent);
		background: var(--accent-soft);
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent),
			0 0 14px 2px color-mix(in srgb, var(--accent) 35%, transparent);
		transform: scale(1.08);
	}
	.daw-icon:active {
		transform: scale(0.94);
	}
</style>
