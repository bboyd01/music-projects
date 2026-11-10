<script lang="ts">
	let { body }: { body: string } = $props();
	const parts = $derived(body.split(/((?:^|(?<=\s))@[a-z0-9_]{2,32})/gi));
</script>

<p class="text-[13.5px] leading-relaxed break-words whitespace-pre-wrap">
	{#each parts as part}{#if /^@[a-z0-9_]{2,32}$/i.test(part)}<span class="font-medium text-accent">{part}</span>{:else}{part}{/if}{/each}
</p>
