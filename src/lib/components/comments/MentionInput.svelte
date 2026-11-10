<script lang="ts">
	import { autogrow } from '#lib/actions.ts';
	import type { Member } from '#lib/state/composer.svelte.ts';

	let {
		value = $bindable(''),
		members,
		placeholder = 'Add a comment… use @ to mention',
		rows = 3,
		autofocus = false,
		onsubmit
	}: {
		value?: string;
		members: Member[];
		placeholder?: string;
		rows?: number;
		autofocus?: boolean;
		onsubmit?: () => void;
	} = $props();

	let ta: HTMLTextAreaElement;
	let query = $state<string | null>(null);
	let active = $state(0);

	const matches = $derived(
		query === null
			? []
			: members
					.filter(
						(m) => m.username.toLowerCase().startsWith(query!.toLowerCase()) || m.name.toLowerCase().includes(query!.toLowerCase())
					)
					.slice(0, 6)
	);

	$effect(() => {
		if (autofocus) queueMicrotask(() => ta?.focus());
	});

	function detect() {
		const upto = value.slice(0, ta.selectionStart);
		const m = upto.match(/(?:^|\s)@([a-z0-9_]{0,32})$/i);
		query = m ? m[1] : null;
		active = 0;
	}

	function pick(m: Member) {
		const pos = ta.selectionStart;
		const before = value.slice(0, pos).replace(/@([a-z0-9_]{0,32})$/i, `@${m.username} `);
		value = before + value.slice(pos);
		query = null;
		queueMicrotask(() => {
			ta.focus();
			ta.setSelectionRange(before.length, before.length);
		});
	}

	function key(e: KeyboardEvent) {
		if (matches.length) {
			if (e.key === 'ArrowDown') {
				active = (active + 1) % matches.length;
				e.preventDefault();
				return;
			}
			if (e.key === 'ArrowUp') {
				active = (active - 1 + matches.length) % matches.length;
				e.preventDefault();
				return;
			}
			if (e.key === 'Enter' || e.key === 'Tab') {
				pick(matches[active]);
				e.preventDefault();
				return;
			}
			if (e.key === 'Escape') {
				query = null;
				e.stopPropagation();
				return;
			}
		}
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			onsubmit?.();
		}
	}
</script>

<div class="relative">
	<textarea
		bind:this={ta}
		bind:value
		{rows}
		{placeholder}
		class="input resize-none"
		use:autogrow={value}
		oninput={detect}
		onclick={detect}
		onkeydown={key}
		onblur={() => setTimeout(() => (query = null), 120)}
	></textarea>
	{#if matches.length}
		<div class="menu absolute top-full left-0 mt-1 w-60" role="listbox">
			{#each matches as m, i (m.id)}
				<button
					type="button"
					class="menu-item"
					data-active={i === active}
					role="option"
					aria-selected={i === active}
					onmousedown={(e) => {
						e.preventDefault();
						pick(m);
					}}
				>
					<span class="font-medium text-fg">{m.name}</span>
					<span class="text-fg-3">@{m.username}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
