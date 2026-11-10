import { commentTimestamp } from '#lib/time.ts';
import { player } from './player.svelte';

export type Member = { id: string; name: string; username: string };

/** The comment composer is global so the player can open it from anywhere. */
class Composer {
	open = $state(false);
	trackId = $state<string | null>(null);
	trackTitle = $state('');
	timestampSec = $state<number | null>(null);
	members = $state<Member[]>([]);
	/** Called after a successful post (e.g. to refresh a track page). */
	onPosted: (() => void) | null = null;

	/** General comment on the playing track. */
	general() {
		const t = player.current;
		if (!t) return;
		this.onPosted = null;
		this.#open(t.id, t.title, null);
	}

	/** Timestamped comment, starting 3 seconds before the click. */
	timestamped() {
		const t = player.current;
		if (!t) return;
		this.onPosted = null;
		this.#open(t.id, t.title, commentTimestamp(player.time));
	}

	#open(trackId: string, title: string, ts: number | null) {
		if (player.current?.id === trackId && player.detail) this.members = player.detail.members;
		this.trackId = trackId;
		this.trackTitle = title;
		this.timestampSec = ts;
		this.open = true;
	}
}

export const composer = new Composer();
