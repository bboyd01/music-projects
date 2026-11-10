<script lang="ts">
	import Upload from '@lucide/svelte/icons/upload';
	import FileAudio from '@lucide/svelte/icons/file-audio';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import { api, uploadWithProgress } from '#lib/api.ts';
	import { formatTime, relativeTime } from '#lib/time.ts';
	import { toast } from '#lib/state/ui.svelte.ts';
	import { player } from '#lib/state/player.svelte.ts';
	import PlayButton from './PlayButton.svelte';

	type Audio = { filename: string; duration: number | null; size: number; uploadedAt: number } | null;
	let {
		audio,
		trackId,
		projectId,
		canEdit,
		onchange
	}: { audio: Audio; trackId: string; projectId: string; canEdit: boolean; onchange: () => void } = $props();

	let input: HTMLInputElement;
	let progress = $state<number | null>(null);
	let over = $state(false);

	const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b > 10 * 1024 * 1024 ? 0 : 1)} MB`;

	async function upload(file: File | undefined) {
		if (!file) return;
		if (!file.type.startsWith('audio/') && !/\.(mp3|wav|flac|m4a|aac|ogg|opus|aiff?|webm)$/i.test(file.name)) {
			toast('That doesn’t look like an audio file', 'error');
			return;
		}
		progress = 0;
		try {
			await uploadWithProgress(
				'PUT',
				`/api/tracks/${trackId}/audio`,
				file,
				{ 'x-filename': encodeURIComponent(file.name), 'content-type': file.type || 'application/octet-stream' },
				(f) => (progress = f)
			);
			toast(audio ? 'Audio replaced' : 'Audio uploaded');
			onchange();
			if (player.project?.id === projectId) void player.refreshQueue();
		} catch {
			/* toast already shown */
		} finally {
			progress = null;
			input.value = '';
		}
	}

	async function remove() {
		if (!confirm('Remove this track’s audio file?')) return;
		await api('DELETE', `/api/tracks/${trackId}/audio`);
		onchange();
		if (player.project?.id === projectId) void player.refreshQueue();
	}
</script>

<input
	bind:this={input}
	type="file"
	accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aif,.aiff"
	class="hidden"
	onchange={(e) => upload((e.currentTarget as HTMLInputElement).files?.[0])}
/>

{#if progress !== null}
	<div class="card p-4">
		<p class="mb-2 text-[13px] text-fg-2">Uploading… {Math.round(progress * 100)}%</p>
		<div class="h-[3px] overflow-hidden rounded-full bg-line-strong">
			<div class="h-full bg-accent" style:width="{progress * 100}%" style:transition="width var(--dur-fade) linear"></div>
		</div>
	</div>
{:else if audio}
	<div class="card flex items-center gap-3 p-3">
		<PlayButton {projectId} {trackId} />
		<FileAudio size={18} class="shrink-0 text-fg-3" strokeWidth={1.6} />
		<div class="min-w-0 flex-1 leading-tight">
			<p class="truncate text-[13.5px] font-medium">{audio.filename}</p>
			<p class="tabular text-[12px] text-fg-3">
				{formatTime(audio.duration)} · {mb(audio.size)} · {relativeTime(audio.uploadedAt)}
			</p>
		</div>
		{#if canEdit}
			<button class="icon-btn" title="Replace audio" aria-label="Replace audio" onclick={() => input.click()}><RefreshCw size={15} /></button>
			<button class="icon-btn hover:text-danger" title="Remove audio" aria-label="Remove audio" onclick={remove}><Trash2 size={15} /></button>
		{/if}
	</div>
{:else if canEdit}
	<button
		type="button"
		class="drop flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center {over
			? 'border-accent bg-accent-soft'
			: 'border-line-strong'}"
		onclick={() => input.click()}
		ondragover={(e) => {
			e.preventDefault();
			over = true;
		}}
		ondragleave={() => (over = false)}
		ondrop={(e) => {
			e.preventDefault();
			over = false;
			upload(e.dataTransfer?.files[0]);
		}}
	>
		<Upload size={18} class="text-fg-3" />
		<span class="text-[13px] font-medium">Upload audio</span>
		<span class="text-[12px] text-fg-3">Drop a file or click · MP3, WAV, FLAC, M4A, OGG, AIFF</span>
	</button>
{:else}
	<p class="text-[13px] text-fg-3">No audio yet.</p>
{/if}

<style>
	.drop {
		transition:
			background-color var(--dur-fade) var(--ease),
			border-color var(--dur-fade) var(--ease);
	}
	.drop:hover {
		background: var(--hover);
	}
</style>
