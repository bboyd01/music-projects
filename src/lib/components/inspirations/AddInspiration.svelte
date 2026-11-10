<script lang="ts">
	import Type from '@lucide/svelte/icons/type';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Music from '@lucide/svelte/icons/music';
	import { api, uploadWithProgress } from '#lib/api.ts';
	import { toast } from '#lib/state/ui.svelte.ts';
	import type { InspirationView } from '#lib/server/queries.ts';
	import type { MusicResult } from '#lib/server/music.ts';
	import AudioSearchDialog from './AudioSearchDialog.svelte';
	import TextDialog from './TextDialog.svelte';

	let {
		projectId,
		trackId = null,
		place,
		onadded,
		compact = false
	}: {
		projectId: string;
		trackId?: string | null;
		/** Where new items go on the canvas (e.g. the visible center). */
		place?: () => { x: number; y: number };
		onadded: (i: InspirationView) => void;
		compact?: boolean;
	} = $props();

	let fileInput: HTMLInputElement;
	let textOpen = $state(false);
	let audioOpen = $state(false);
	let uploading = $state(0);

	const url = $derived(`/api/projects/${projectId}/inspirations`);

	async function addText(text: string) {
		onadded(await api<InspirationView>('POST', url, { type: 'text', text, trackId, ...place?.() }));
	}

	async function addAudio(r: MusicResult) {
		onadded(await api<InspirationView>('POST', url, { type: 'audio', ...r, trackId, ...place?.() }));
	}

	async function addImages(files: FileList | null) {
		if (!files?.length) return;
		for (const file of Array.from(files)) {
			const form = new FormData();
			form.append('file', file);
			if (trackId) form.append('trackId', trackId);
			const p = place?.();
			if (p) {
				form.append('x', String(p.x));
				form.append('y', String(p.y));
			}
			uploading++;
			try {
				onadded((await uploadWithProgress('POST', url, form, {}, () => {})) as InspirationView);
			} catch {
				/* toast shown */
			} finally {
				uploading--;
			}
		}
		fileInput.value = '';
		if (files.length > 1) toast(`${files.length} images added`);
	}
</script>

<input
	bind:this={fileInput}
	type="file"
	accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
	multiple
	class="hidden"
	onchange={(e) => addImages((e.currentTarget as HTMLInputElement).files)}
/>

<div class="flex flex-wrap gap-1.5">
	<button class="btn btn-outline {compact ? 'h-8 px-2.5' : ''}" onclick={() => (textOpen = true)}><Type size={14} /> Text box</button>
	<button class="btn btn-outline {compact ? 'h-8 px-2.5' : ''}" disabled={uploading > 0} onclick={() => fileInput.click()}>
		<ImageIcon size={14} />
		{uploading ? 'Uploading…' : 'Image'}
	</button>
	<button class="btn btn-outline {compact ? 'h-8 px-2.5' : ''}" onclick={() => (audioOpen = true)}><Music size={14} /> Audio</button>
</div>

<TextDialog bind:open={textOpen} title="Add text" onsave={addText} />
<AudioSearchDialog bind:open={audioOpen} onpick={addAudio} />
