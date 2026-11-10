<script lang="ts">
	import { player } from '#lib/state/player.svelte.ts';

	let el: HTMLAudioElement;
	const reported = new Set<string>();

	$effect(() => {
		player.audio = el;
		return () => (player.audio = null);
	});

	function onMeta() {
		player.duration = el.duration;
		const t = player.current;
		// Store the browser-reported duration if the server couldn't parse one.
		if (t && !t.duration && Number.isFinite(el.duration) && !reported.has(t.id)) {
			reported.add(t.id);
			fetch(`/api/tracks/${t.id}/audio`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ duration: el.duration })
			});
		}
	}

	function onKey(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
		if (!player.current) return;
		if (e.code === 'Space') {
			e.preventDefault();
			player.toggle();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<audio
	bind:this={el}
	preload="metadata"
	onplay={() => (player.playing = true)}
	onpause={() => (player.playing = false)}
	ontimeupdate={() => (player.time = el.currentTime)}
	onloadedmetadata={onMeta}
	ondurationchange={() => Number.isFinite(el.duration) && (player.duration = el.duration)}
	onended={() => (player.hasNext ? player.next() : (player.playing = false))}
></audio>
