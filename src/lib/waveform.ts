/** Number of peaks stored per track (drawn bars are resampled from these). */
export const PEAK_COUNT = 1200;
/** Frames folded into one fine bin while streaming (keeps memory tiny for long files). */
const FRAMES_PER_BIN = 1024;

/**
 * Streams audio frames in and produces normalized peaks (0–255) at the end.
 * Feed it channel arrays (Float32, -1..1) or per-frame peak values.
 */
export class PeakBuilder {
	#bins: number[] = [];
	#current = 0;
	#count = 0;

	/** Add one frame's peak (max |sample| across channels, 0..1). */
	pushFrame(peak: number) {
		if (peak > this.#current) this.#current = peak;
		if (++this.#count === FRAMES_PER_BIN) this.#flush();
	}

	/** Add a block of planar channel data (as from decoders / AudioBuffer). */
	pushChannels(channels: ArrayLike<number>[], frames = channels[0]?.length ?? 0) {
		for (let i = 0; i < frames; i++) {
			let m = 0;
			for (let c = 0; c < channels.length; c++) {
				const v = Math.abs(channels[c][i]);
				if (v > m) m = v;
			}
			this.pushFrame(m);
		}
	}

	#flush() {
		this.#bins.push(this.#current);
		this.#current = 0;
		this.#count = 0;
	}

	/** Downsample to `count` buckets (max of each range) and normalize to 0–255. */
	finish(count = PEAK_COUNT): number[] | null {
		if (this.#count) this.#flush();
		return downsample(this.#bins, count);
	}
}

export function downsample(bins: ArrayLike<number>, count: number): number[] | null {
	const n = bins.length;
	if (!n) return null;
	const out = new Array<number>(Math.min(count, n));
	for (let i = 0; i < out.length; i++) {
		const start = Math.floor((i * n) / out.length);
		const end = Math.max(start + 1, Math.floor(((i + 1) * n) / out.length));
		let m = 0;
		for (let j = start; j < end; j++) if (bins[j] > m) m = bins[j];
		out[i] = m;
	}
	const max = Math.max(...out);
	return out.map((v) => (max > 0 ? Math.round((v / max) * 255) : 0));
}

/** Resample stored peaks to the number of bars that fit (max over each range, 0..1). */
export function bars(peaks: ArrayLike<number>, count: number): number[] {
	const n = peaks.length;
	if (!n || count <= 0) return [];
	const out = new Array<number>(count);
	for (let i = 0; i < count; i++) {
		const start = Math.floor((i * n) / count);
		const end = Math.max(start + 1, Math.floor(((i + 1) * n) / count));
		let m = 0;
		for (let j = start; j < end && j < n; j++) if (peaks[j] > m) m = peaks[j];
		out[i] = m / 255;
	}
	return out;
}

export function isValidPeaks(v: unknown): v is number[] {
	return (
		Array.isArray(v) &&
		v.length > 0 &&
		v.length <= 2000 &&
		v.every((x) => Number.isInteger(x) && x >= 0 && x <= 255)
	);
}
