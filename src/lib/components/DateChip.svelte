<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import X from '@lucide/svelte/icons/x';
	import { formatDate } from '#lib/time.ts';

	let {
		label,
		value,
		disabled = false,
		onchange
	}: { label: string; value: string | null; disabled?: boolean; onchange: (v: string | null) => void } = $props();
</script>

<!-- A chip that shows the date nicely; the real (invisible) date input on top opens the native picker. -->
<span class="chip relative h-7 pr-2.5 {value ? 'text-fg' : 'text-fg-3'}">
	<CalendarDays size={13} class="shrink-0" />
	{#if value}
		<span class="text-fg-3">{label}</span>
		<span class="tabular">{formatDate(value)}</span>
	{:else}
		<span>{disabled ? `No ${label.toLowerCase()} date` : `Add ${label.toLowerCase()} date`}</span>
	{/if}
	{#if !disabled}
		<input
			type="date"
			class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
			aria-label="{label} date"
			value={value ?? ''}
			onchange={(e) => onchange(e.currentTarget.value || null)}
		/>
		{#if value}
			<button
				type="button"
				class="relative z-10 -mr-1 ml-0.5 flex size-5 items-center justify-center rounded-full text-fg-3 hover:bg-hover hover:text-fg"
				aria-label="Clear {label.toLowerCase()} date"
				onclick={() => onchange(null)}><X size={12} /></button
			>
		{/if}
	{/if}
</span>
