<script lang="ts">
	import { page } from '$app/state';
	import { navItems, isActive } from './nav';
</script>

<nav
	class="glass-blur fixed inset-x-0 bottom-0 z-40 flex rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
	aria-label="Main"
>
	{#each navItems as item (item.href)}
		{@const active = isActive(page.url.pathname, item.href)}
		<a
			href={item.href}
			class="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium {active
				? 'text-accent'
				: 'text-fg-3'}"
			aria-current={active ? 'page' : undefined}
		>
			<item.icon size={20} strokeWidth={1.7} />
			{item.label}
		</a>
	{/each}
</nav>
