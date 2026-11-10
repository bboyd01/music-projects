<script lang="ts">
	import { customIcons, iconByKey } from '#lib/icons.ts';

	let { icon, size = 16, class: cls = '' }: { icon: string | null | undefined; size?: number; class?: string } =
		$props();

	const entry = $derived(icon ? iconByKey.get(icon) : undefined);
	const paths = $derived(icon ? customIcons[icon] : undefined);
</script>

{#if entry?.component}
	<entry.component {size} strokeWidth={1.6} class={cls} aria-hidden="true" />
{:else if paths}
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.6"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={cls}
		aria-hidden="true"
	>
		{#each paths as d}<path {d} />{/each}
	</svg>
{/if}
