import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { computePeaks } from './waveform';
import { PEAK_COUNT, bars, downsample, isValidPeaks } from '../waveform';

const SR = 22050;
const SECONDS = 6;
let dir: string;

/** Envelope: 2s silence, 2s loud (0.9), 2s quiet (0.25). */
const amp = (t: number) => (t < 2 ? 0 : t < 4 ? 0.9 : 0.25);
const sample = (i: number) => amp(i / SR) * Math.sin((2 * Math.PI * 440 * i) / SR);

function wav(name: string, { bits, channels, float = false }: { bits: number; channels: number; float?: boolean }) {
	const frames = SR * SECONDS;
	const bytes = bits / 8;
	const data = Buffer.alloc(frames * channels * bytes);
	for (let i = 0; i < frames; i++) {
		for (let c = 0; c < channels; c++) {
			const v = sample(i) * (c === 1 ? 0.5 : 1);
			const p = (i * channels + c) * bytes;
			if (float) data.writeFloatLE(v, p);
			else if (bits === 16) data.writeInt16LE(Math.round(v * 32767), p);
			else if (bits === 24) data.writeIntLE(Math.round(v * 8388607), p, 3);
		}
	}
	const hdr = Buffer.alloc(44);
	hdr.write('RIFF', 0);
	hdr.writeUInt32LE(36 + data.length, 4);
	hdr.write('WAVE', 8);
	hdr.write('fmt ', 12);
	hdr.writeUInt32LE(16, 16);
	hdr.writeUInt16LE(float ? 3 : 1, 20);
	hdr.writeUInt16LE(channels, 22);
	hdr.writeUInt32LE(SR, 24);
	hdr.writeUInt32LE(SR * channels * bytes, 28);
	hdr.writeUInt16LE(channels * bytes, 32);
	hdr.writeUInt16LE(bits, 34);
	hdr.write('data', 36);
	hdr.writeUInt32LE(data.length, 40);
	const file = path.join(dir, name);
	fs.writeFileSync(file, Buffer.concat([hdr, data]));
	return file;
}

/** Encode the same envelope to MP3 in a plain Node process. */
function mp3(name: string) {
	const file = path.join(dir, name);
	const script = `
		// The npm entry point is broken (MPEGMode undefined); the prebuilt bundle works.
		const src = require('fs').readFileSync(require.resolve('lamejs/lame.all.js'), 'utf8');
		const { Mp3Encoder } = new Function(src + '; return lamejs;')();
		const SR = ${SR}, S = ${SECONDS};
		const amp = (t) => (t < 2 ? 0 : t < 4 ? 0.9 : 0.25);
		const enc = new Mp3Encoder(1, SR, 64);
		const pcm = new Int16Array(SR * S);
		for (let i = 0; i < pcm.length; i++) pcm[i] = Math.round(amp(i / SR) * Math.sin((2 * Math.PI * 440 * i) / SR) * 32767);
		const parts = [];
		for (let i = 0; i < pcm.length; i += 1152) parts.push(Buffer.from(enc.encodeBuffer(pcm.subarray(i, i + 1152))));
		parts.push(Buffer.from(enc.flush()));
		require('fs').writeFileSync(${JSON.stringify(file)}, Buffer.concat(parts));
	`;
	execFileSync(process.execPath, ['-e', script], { cwd: process.cwd() });
	return file;
}

/** Average normalized level over a fraction range of the peaks. */
const level = (p: number[], from: number, to: number) => {
	const s = p.slice(Math.floor(from * p.length), Math.floor(to * p.length));
	return s.reduce((a, b) => a + b, 0) / s.length / 255;
};

function expectEnvelope(p: number[] | null) {
	expect(p).not.toBeNull();
	expect(isValidPeaks(p)).toBe(true);
	const peaks = p!;
	expect(level(peaks, 0.05, 0.28)).toBeLessThan(0.05); // silence
	expect(level(peaks, 0.4, 0.6)).toBeGreaterThan(0.9); // loud section (normalized to max)
	const quiet = level(peaks, 0.72, 0.95);
	expect(quiet).toBeGreaterThan(0.2);
	expect(quiet).toBeLessThan(0.4); // 0.25 / 0.9 ≈ 0.28
}

beforeAll(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wave-'));
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('computePeaks', () => {
	it('reads 16-bit stereo WAV', async () => {
		const p = await computePeaks(wav('a.wav', { bits: 16, channels: 2 }));
		expectEnvelope(p);
		expect(p!.length).toBeLessThanOrEqual(PEAK_COUNT);
	});
	it('reads 24-bit mono WAV', async () => expectEnvelope(await computePeaks(wav('b.wav', { bits: 24, channels: 1 }))));
	it('reads 32-bit float WAV', async () => expectEnvelope(await computePeaks(wav('c.wav', { bits: 32, channels: 2, float: true }))));
	it('decodes MP3', async () => expectEnvelope(await computePeaks(mp3('d.mp3'))));
	it('returns null for unsupported or corrupt files', async () => {
		const junk = path.join(dir, 'junk.bin');
		fs.writeFileSync(junk, Buffer.from('not audio at all, just some bytes'));
		expect(await computePeaks(junk)).toBeNull();
		expect(await computePeaks(path.join(dir, 'missing.wav'))).toBeNull();
	});
});

describe('peak helpers', () => {
	it('downsample normalizes to 0–255 and keeps maxima', () => {
		expect(downsample([0, 0.5, 0.25, 1], 2)).toEqual([128, 255]);
		expect(downsample([], 10)).toBeNull();
	});
	it('bars resamples to the requested count', () => {
		const b = bars([0, 255, 0, 51], 2);
		expect(b).toEqual([1, 0.2]);
	});
	it('validates peaks', () => {
		expect(isValidPeaks([0, 128, 255])).toBe(true);
		expect(isValidPeaks([0, 256])).toBe(false);
		expect(isValidPeaks([1.5])).toBe(false);
		expect(isValidPeaks('x')).toBe(false);
	});
});
