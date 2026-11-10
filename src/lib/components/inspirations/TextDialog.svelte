<script lang="ts">
	import Modal from '../Modal.svelte';

	let {
		open = $bindable(false),
		initial = '',
		title = 'Text',
		onsave
	}: { open?: boolean; initial?: string; title?: string; onsave: (text: string) => Promise<void> } = $props();

	let text = $state('');
	let busy = $state(false);
	$effect(() => {
		if (open) text = initial;
	});

	async function save() {
		busy = true;
		try {
			await onsave(text);
			open = false;
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open {title} width={480}>
	<!-- svelte-ignore a11y_autofocus -->
	<textarea
		class="input"
		rows="6"
		placeholder="A lyric, a mood, a reference, a note to self…"
		bind:value={text}
		autofocus
		onkeydown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && save()}
	></textarea>
	<div class="mt-3 flex justify-end gap-2">
		<button class="btn btn-ghost" onclick={() => (open = false)}>Cancel</button>
		<button class="btn btn-primary" disabled={busy || !text.trim()} onclick={save}>Save</button>
	</div>
</Modal>
