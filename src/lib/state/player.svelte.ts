import { api } from '#lib/api.ts';
import type { Backdrop, TrackDetail } from '#lib/server/queries.ts';

export type QueueTrack = {
	id: string;
	title: string;
	icon: string | null;
	filename: string;
	duration: number | null;
	url: string;
};

type QueueResponse = {
	project: { id: string; name: string; backdrop: Backdrop };
	tracks: QueueTrack[];
};

/**
 * Global player. A single <audio> element (AudioEngine.svelte in the root layout)
 * is bound here, so playback survives client-side navigation.
 */
class Player {
	audio: HTMLAudioElement | null = null;

	project = $state<QueueResponse['project'] | null>(null);
	queue = $state<QueueTrack[]>([]);
	index = $state(-1);
	playing = $state(false);
	time = $state(0);
	duration = $state(0);
	mode = $state<'mini' | 'full'>('mini');
	detail = $state<TrackDetail | null>(null);
	loading = $state(false);

	current = $derived(this.index >= 0 ? (this.queue[this.index] ?? null) : null);
	hasPrev = $derived(this.index > 0);
	hasNext = $derived(this.index >= 0 && this.index < this.queue.length - 1);

	/** Load a project's queue and start (or cue) a track. */
	async open(projectId: string, trackId: string, { autoplay = true, mode }: { autoplay?: boolean; mode?: 'mini' | 'full' } = {}) {
		this.loading = true;
		try {
			const data = await api<QueueResponse>('GET', `/api/projects/${projectId}/queue`);
			this.project = data.project;
			this.queue = data.tracks;
			const idx = data.tracks.findIndex((t) => t.id === trackId);
			if (idx === -1) return false;
			if (mode) this.mode = mode;
			this.#select(idx, autoplay);
			return true;
		} finally {
			this.loading = false;
		}
	}

	/** Re-fetch the queue (e.g. after a new upload) keeping the current track. */
	async refreshQueue() {
		if (!this.project) return;
		const currentId = this.current?.id;
		const currentUrl = this.current?.url;
		const data = await api<QueueResponse>('GET', `/api/projects/${this.project.id}/queue`, undefined, { quiet: true });
		this.project = data.project;
		this.queue = data.tracks;
		const idx = data.tracks.findIndex((t) => t.id === currentId);
		if (idx === -1) {
			this.stop();
			return;
		}
		this.index = idx;
		if (data.tracks[idx].url !== currentUrl) this.#select(idx, this.playing);
	}

	#select(idx: number, autoplay: boolean) {
		const t = this.queue[idx];
		if (!t) return;
		const changed = this.current?.url !== t.url;
		this.index = idx;
		if (changed && this.audio) {
			this.audio.src = t.url;
			this.time = 0;
			this.duration = t.duration ?? 0;
			this.audio.load();
		}
		if (autoplay) this.play();
		void this.refreshDetail();
		this.#updateMediaSession();
	}

	async refreshDetail() {
		const t = this.current;
		if (!t) {
			this.detail = null;
			return;
		}
		try {
			const d = await api<TrackDetail>('GET', `/api/tracks/${t.id}/detail`, undefined, { quiet: true });
			if (this.current?.id === t.id) this.detail = d;
		} catch {
			/* keep previous detail */
		}
	}

	play() {
		this.audio?.play().catch(() => (this.playing = false));
	}
	pause() {
		this.audio?.pause();
	}
	toggle() {
		if (!this.audio) return;
		if (this.audio.paused) this.play();
		else this.pause();
	}
	seek(sec: number) {
		if (!this.audio) return;
		const d = this.duration || this.audio.duration || 0;
		this.audio.currentTime = Math.max(0, d ? Math.min(sec, d - 0.05) : sec);
		this.time = this.audio.currentTime;
	}
	/** Seek within a track, loading it first if needed (used by timestamp chips). */
	async seekTrack(projectId: string, trackId: string, sec: number) {
		if (this.current?.id !== trackId) {
			const ok = await this.open(projectId, trackId, { autoplay: true });
			if (!ok) return;
			const a = this.audio;
			if (a && a.readyState < 1) {
				await new Promise<void>((r) => a.addEventListener('loadedmetadata', () => r(), { once: true }));
			}
		}
		this.seek(sec);
		this.play();
	}
	next() {
		if (this.hasNext) this.#select(this.index + 1, true);
	}
	prev() {
		// Like most players: restart the track if we're more than 3s in.
		if (this.time > 3 || !this.hasPrev) this.seek(0);
		else this.#select(this.index - 1, true);
	}
	stop() {
		this.pause();
		if (this.audio) {
			this.audio.removeAttribute('src');
			this.audio.load();
		}
		this.queue = [];
		this.index = -1;
		this.detail = null;
		this.project = null;
		this.mode = 'mini';
	}

	#updateMediaSession() {
		if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
		const t = this.current;
		if (!t) return;
		navigator.mediaSession.metadata = new MediaMetadata({
			title: t.title,
			artist: this.project?.name ?? '',
			album: t.filename,
			artwork: this.project ? [{ src: this.project.backdrop.full, sizes: '512x512' }] : []
		});
		navigator.mediaSession.setActionHandler('play', () => this.play());
		navigator.mediaSession.setActionHandler('pause', () => this.pause());
		navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
		navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
		navigator.mediaSession.setActionHandler('seekto', (d) => d.seekTime != null && this.seek(d.seekTime));
	}
}

export const player = new Player();
