<script lang="ts">
	import { page } from '$app/state';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { navItems, isActive } from './nav';
	import type { Status } from '#lib/server/db/schema.ts';

	const projects = $derived((page.data.projects ?? []) as { id: string; name: string; statusId: string | null }[]);
	const statuses = $derived((page.data.statuses ?? []) as Status[]);
	const colorOf = (id: string | null) => statuses.find((s) => s.id === id)?.color ?? 'var(--fg-3)';
	const currentProject = $derived(page.params.id);
</script>

<aside class="glass-blur sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col rounded-none border-y-0 border-l-0 md:flex">
	<a href="/projects" class="flex items-center gap-2.5 px-5 pt-6 pb-5">
		<span class="flex size-7 items-center justify-center rounded-lg bg-fg text-bg">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 14v-4M8 18V6M12 15V9M16 20V4M20 14v-4" /></svg>
		</span>
		<span class="serif text-[19px] leading-none">Music Projects</span>
	</a>

	<nav class="space-y-0.5 px-3" aria-label="Main">
		{#each navItems as item (item.href)}
			{@const active = isActive(page.url.pathname, item.href)}
			<a
				href={item.href}
				class="nav-link flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] {active ? 'active' : ''}"
				aria-current={active ? 'page' : undefined}
			>
				<item.icon size={17} strokeWidth={1.7} />
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="scroll-thin mt-6 min-h-0 flex-1 overflow-y-auto px-3">
		<p class="eyebrow px-2.5 pb-2">Projects</p>
		{#each projects as p (p.id)}
			<a
				href="/projects/{p.id}"
				class="nav-link flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] {currentProject === p.id ? 'active' : ''}"
			>
				<span class="size-1.5 shrink-0 rounded-full" style:background={colorOf(p.statusId)}></span>
				<span class="truncate">{p.name}</span>
			</a>
		{:else}
			<p class="px-2.5 text-[12px] text-fg-3">No projects yet</p>
		{/each}
	</div>

	<div class="flex items-center gap-2 border-t border-line px-4 py-3">
		<span class="flex size-7 items-center justify-center rounded-full bg-hover text-[12px] font-semibold">
			{page.data.user?.name?.[0]?.toUpperCase()}
		</span>
		<div class="min-w-0 flex-1 leading-tight">
			<p class="truncate text-[13px]">{page.data.user?.name}</p>
			<p class="truncate text-[11px] text-fg-3">@{page.data.user?.username}</p>
		</div>
		<form method="POST" action="/logout">
			<button class="icon-btn size-8" aria-label="Sign out" title="Sign out"><LogOut size={15} /></button>
		</form>
	</div>
</aside>

<style>
	.nav-link {
		color: var(--fg-2);
		transition:
			background-color var(--dur-fade) var(--ease),
			color var(--dur-fade) var(--ease);
	}
	.nav-link:hover {
		background: var(--hover);
		color: var(--fg);
	}
	.nav-link.active {
		background: var(--hover);
		color: var(--fg);
		box-shadow: inset 2px 0 0 var(--accent);
	}
</style>
