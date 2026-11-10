<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AtSign from '@lucide/svelte/icons/at-sign';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Check from '@lucide/svelte/icons/check';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Popover from '#lib/components/Popover.svelte';
	import TrackIcon from '#lib/components/TrackIcon.svelte';
	import CommentBody from '#lib/components/comments/CommentBody.svelte';
	import { formatTime, relativeTime } from '#lib/time.ts';
	import { player } from '#lib/state/player.svelte.ts';

	let { data } = $props();
	const me = $derived(page.data.user!);

	const options = $derived([
		{ value: 'me', label: 'Mentioning you' },
		{ value: 'all', label: 'All comments' },
		...data.people.filter((p) => p.id !== me.id).map((p) => ({ value: p.id, label: `Mentioning @${p.username}` }))
	]);
	const current = $derived(options.find((o) => o.value === data.filter) ?? options[0]);

	function pick(value: string) {
		goto(value === 'me' ? '/comments' : `/comments?mentions=${value}`, { reset: false });
	}
</script>

<svelte:head><title>Comments · Music Projects</title></svelte:head>

<div class="mx-auto max-w-3xl px-4 pt-8 sm:px-8 md:pt-12">
	<header class="enter mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="serif text-4xl sm:text-5xl">Comments</h1>
		</div>
		<Popover label="Filter comments" width={240} align="end" triggerClass="btn btn-outline">
			{#snippet trigger()}<AtSign size={14} /> {current.label} <ChevronDown size={14} class="text-fg-3" />{/snippet}
			{#snippet children({ close })}
				{#each options as o (o.value)}
					<button
						class="menu-item"
						data-active={o.value === data.filter}
						onclick={() => {
							close();
							pick(o.value);
						}}
					>
						<span class="flex-1">{o.label}</span>
						{#if o.value === data.filter}<Check size={14} />{/if}
					</button>
				{/each}
			{/snippet}
		</Popover>
	</header>

	{#key data.filter}
		{#if data.comments.length === 0}
			<div class="card enter-fade flex flex-col items-center px-6 py-16 text-center">
				<MessageSquare size={26} class="mb-3 text-fg-3" strokeWidth={1.5} />
				<p class="serif mb-1 text-xl">{data.filter === 'me' ? 'No mentions yet' : 'No comments here'}</p>
				<p class="text-fg-3">
					{data.filter === 'me' ? 'Comments that @mention you will show up here.' : 'Try another filter.'}
				</p>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each data.comments as c, i (c.id)}
					<li class="enter" style:animation-delay="{Math.min(i, 10) * 14}ms">
						<article class="card p-4">
							<header class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
								<span class="font-medium">{c.authorName}</span>
								<span class="text-fg-3">on</span>
								<a href="/projects/{c.projectId}/tracks/{c.trackId}" class="inline-flex items-center gap-1.5 font-medium hover:text-accent">
									{#if c.trackIcon}<TrackIcon icon={c.trackIcon} size={13} />{/if}
									{c.trackTitle}
								</a>
								<span class="text-fg-3">· {c.projectName}</span>
								{#if c.timestampSec != null}
									<button class="ts-chip" title="Play from here" onclick={() => player.seekTrack(c.projectId, c.trackId, c.timestampSec!)}>
										{formatTime(c.timestampSec)}
									</button>
								{/if}
								{#if c.resolvedAt}<span class="inline-flex items-center gap-1 text-accent" title="Resolved"><CircleCheck size={13} /> Resolved</span>{/if}
								<span class="ml-auto text-fg-3">{relativeTime(c.createdAt)}</span>
							</header>
							<CommentBody body={c.body} />
						</article>
					</li>
				{/each}
			</ul>
		{/if}
	{/key}
</div>
