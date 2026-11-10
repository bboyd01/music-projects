<script lang="ts">
	import type { InspirationView } from '#lib/server/queries.ts';

	/** Blends the track's image and text inspirations into one visual. */
	let { items, fallback }: { items: InspirationView[]; fallback: string | null } = $props();

	const visual = $derived(items.filter((i) => i.type === 'image' || i.type === 'text').slice(0, 9));
	const images = $derived(visual.filter((i) => i.type === 'image'));
	const cols = $derived(visual.length <= 1 ? 1 : visual.length <= 4 ? 2 : 3);
	const rows = $derived(Math.ceil(visual.length / cols));
</script>

{#if visual.length === 0}
	{#if fallback}
		<img src={fallback} alt="" class="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
	{/if}
{:else if visual.length === 1 && images.length === 1}
	{@const img = images[0]}
	{#if img.type === 'image'}
		<img src={img.data.url} alt="" class="h-full max-h-full w-auto max-w-full rounded-2xl object-contain shadow-2xl" />
	{/if}
{:else if visual.length === 1}
	{@const txt = visual[0]}
	{#if txt.type === 'text'}
		<blockquote class="serif glass max-w-xl rounded-2xl p-8 text-2xl leading-snug sm:text-3xl">
			<p class="line-clamp-[8] whitespace-pre-wrap">{txt.data.text}</p>
		</blockquote>
	{/if}
{:else}
	<div
		class="grid h-full w-full max-w-4xl gap-2.5"
		style:grid-template-columns="repeat({cols}, minmax(0, 1fr))"
		style:grid-template-rows="repeat({rows}, minmax(0, 1fr))"
	>
		{#each visual as v, i (v.id)}
			<div class="tile enter min-h-0 overflow-hidden rounded-xl" style:animation-delay="{i * 16}ms">
				{#if v.type === 'image'}
					<img src={v.data.url} alt="" class="h-full w-full object-cover" />
				{:else if v.type === 'text'}
					<div class="glass flex h-full items-center rounded-xl p-4 sm:p-5">
						<p class="serif line-clamp-6 text-[17px] leading-snug whitespace-pre-wrap sm:text-xl">{v.data.text}</p>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
