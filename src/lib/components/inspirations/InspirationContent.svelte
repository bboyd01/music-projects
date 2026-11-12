<script lang="ts">
	import { page } from '$app/state';
	import Music from '@lucide/svelte/icons/music';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import type { InspirationView } from '#lib/server/queries.ts';
	import { openUrlFor } from '#lib/music-links.ts';

	let { item, fill = false }: { item: InspirationView; fill?: boolean } = $props();
	const service = $derived(page.data.user?.settings?.musicService ?? 'apple');
</script>

{#if item.type === 'image'}
	<img
		src={item.data.url}
		alt=""
		draggable="false"
		class="block select-none {fill ? 'h-full w-full object-cover' : 'w-full rounded-lg'}"
		loading="lazy"
	/>
{:else if item.type === 'text'}
	<p class="h-full overflow-auto px-3.5 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap">{item.data.text}</p>
{:else}
	<a
		href={openUrlFor(item.data, service)}
		target="_blank"
		rel="noopener noreferrer"
		class="flex h-full items-center gap-3 p-2.5 pr-3"
		title="Open in {item.data.youtubeUrl ? 'YouTube' : service === 'spotify' ? 'Spotify' : 'Apple Music'}"
		draggable="false"
	>
		{#if item.data.thumbUrl}
			<img src={item.data.thumbUrl} alt="" width="50" height="50" class="size-[50px] shrink-0 rounded-md object-cover" draggable="false" />
		{:else}
			<span class="flex size-[50px] shrink-0 items-center justify-center rounded-md bg-hover text-fg-3"><Music size={18} /></span>
		{/if}
		<span class="min-w-0 flex-1 leading-tight">
			<span class="block truncate text-[14.5px] font-medium">{item.data.title}</span>
			<span class="block truncate text-[13px] text-fg-3">{item.data.artist ?? ''}</span>
		</span>
		<ExternalLink size={13} class="shrink-0 text-fg-3" />
	</a>
{/if}
