import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { MPEGDecoder } from 'mpg123-decoder';
import { PeakBuilder } from '#lib/waveform.ts';

/**
 * Compute waveform peaks for an audio file on disk, streaming (never the whole file in memory).
 * WAV and AIFF are parsed directly; MP3 is decoded with a small WebAssembly mpg123 build.
 * Returns null for other formats or unreadable files — peaks are optional.
 */
export async function computePeaks(path: string): Promise<number[] | null> {
	try {
		const fh = await fsp.open(path, 'r');
		const head = Buffer.alloc(12);
		await fh.read(head, 0, 12, 0);
		await fh.close();
		const id = head.toString('ascii', 0, 4);
		const form = head.toString('ascii', 8, 12);
		if (id === 'RIFF' && form === 'WAVE') return await wavPeaks(path);
		if (id === 'FORM' && (form === 'AIFF' || form === 'AIFC')) return await aiffPeaks(path);
		if (isMp3(head)) return await mp3Peaks(path);
		return null;
	} catch (e) {
		console.warn('[waveform] could not compute peaks:', (e as Error).message);
		return null;
	}
}

function isMp3(head: Buffer) {
	// ID3 tag, or an MPEG audio frame sync (11 set bits).
	return head.toString('ascii', 0, 3) === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);
}

// ── PCM (WAV / AIFF) ────────────────────────────────────────────

type PcmFormat = { channels: number; bits: number; float: boolean; bigEndian: boolean };
type Chunk = { id: string; offset: number; size: number };

/** Walk RIFF/IFF chunks without reading sample data. */
async function chunks(path: string, start: number, bigEndian: boolean): Promise<Chunk[]> {
	const fh = await fsp.open(path, 'r');
	try {
		const { size: fileSize } = await fh.stat();
		const out: Chunk[] = [];
		const hdr = Buffer.alloc(8);
		let pos = start;
		while (pos + 8 <= fileSize && out.length < 64) {
			await fh.read(hdr, 0, 8, pos);
			const id = hdr.toString('ascii', 0, 4);
			let size = bigEndian ? hdr.readUInt32BE(4) : hdr.readUInt32LE(4);
			if (pos + 8 + size > fileSize) size = fileSize - pos - 8; // tolerate truncated/streamed files
			out.push({ id, offset: pos + 8, size });
			pos += 8 + size + (size % 2); // chunks are word-aligned
		}
		return out;
	} finally {
		await fh.close();
	}
}

async function readChunk(path: string, c: Chunk, max = 64) {
	const fh = await fsp.open(path, 'r');
	try {
		const buf = Buffer.alloc(Math.min(c.size, max));
		await fh.read(buf, 0, buf.length, c.offset);
		return buf;
	} finally {
		await fh.close();
	}
}

async function wavPeaks(path: string) {
	const list = await chunks(path, 12, false);
	const fmtC = list.find((c) => c.id === 'fmt ');
	const dataC = list.find((c) => c.id === 'data');
	if (!fmtC || !dataC) return null;
	const fmt = await readChunk(path, fmtC, 40);
	let tag = fmt.readUInt16LE(0);
	if (tag === 0xfffe && fmt.length >= 26) tag = fmt.readUInt16LE(24); // WAVE_FORMAT_EXTENSIBLE sub-format
	const f: PcmFormat = { channels: fmt.readUInt16LE(2), bits: fmt.readUInt16LE(14), float: tag === 3, bigEndian: false };
	if (tag !== 1 && tag !== 3) return null;
	return pcmPeaks(path, dataC.offset, dataC.size, f);
}

async function aiffPeaks(path: string) {
	const list = await chunks(path, 12, true);
	const comm = list.find((c) => c.id === 'COMM');
	const ssnd = list.find((c) => c.id === 'SSND');
	if (!comm || !ssnd) return null;
	const c = await readChunk(path, comm, 26);
	const f: PcmFormat = { channels: c.readUInt16BE(0), bits: c.readUInt16BE(6), float: false, bigEndian: true };
	// AIFC carries a compression type: NONE/twos = big-endian PCM, sowt = little-endian, fl32 = float.
	if (comm.size >= 22) {
		const type = c.toString('ascii', 18, 22).toLowerCase();
		if (type === 'sowt') f.bigEndian = false;
		else if (type === 'fl32') f.float = true;
		else if (type !== 'none' && type !== 'twos') return null;
	}
	const ssndHead = await readChunk(path, ssnd, 8);
	const dataOffset = ssndHead.readUInt32BE(0);
	return pcmPeaks(path, ssnd.offset + 8 + dataOffset, ssnd.size - 8 - dataOffset, f);
}

function pcmPeaks(path: string, offset: number, size: number, f: PcmFormat): Promise<number[] | null> {
	const bytes = f.bits / 8;
	if (![8, 16, 24, 32].includes(f.bits) || f.channels < 1 || size <= 0) return Promise.resolve(null);
	const frameSize = bytes * f.channels;
	const builder = new PeakBuilder();
	let carry: Buffer = Buffer.alloc(0);

	const read = (buf: Buffer, p: number): number => {
		if (f.float) return f.bigEndian ? buf.readFloatBE(p) : buf.readFloatLE(p);
		switch (f.bits) {
			case 8:
				return f.bigEndian ? buf.readInt8(p) / 128 : (buf[p] - 128) / 128; // WAV 8-bit is unsigned
			case 16:
				return (f.bigEndian ? buf.readInt16BE(p) : buf.readInt16LE(p)) / 32768;
			case 24:
				return (f.bigEndian ? buf.readIntBE(p, 3) : buf.readIntLE(p, 3)) / 8388608;
			default:
				return (f.bigEndian ? buf.readInt32BE(p) : buf.readInt32LE(p)) / 2147483648;
		}
	};

	return new Promise((resolve, reject) => {
		const stream = fs.createReadStream(path, { start: offset, end: offset + size - 1, highWaterMark: 1 << 20 });
		stream.on('data', (chunk) => {
			const buf = carry.length ? Buffer.concat([carry, chunk as Buffer]) : (chunk as Buffer);
			const frames = Math.floor(buf.length / frameSize);
			for (let i = 0; i < frames; i++) {
				let m = 0;
				const base = i * frameSize;
				for (let c = 0; c < f.channels; c++) {
					const v = Math.abs(read(buf, base + c * bytes));
					if (v > m) m = v;
				}
				builder.pushFrame(m);
			}
			carry = buf.subarray(frames * frameSize);
		});
		stream.on('error', reject);
		stream.on('end', () => resolve(builder.finish()));
	});
}

// ── MP3 ─────────────────────────────────────────────────────────

async function mp3Peaks(path: string) {
	const decoder = new MPEGDecoder();
	await decoder.ready;
	const builder = new PeakBuilder();
	try {
		for await (const chunk of fs.createReadStream(path, { highWaterMark: 256 * 1024 })) {
			const { channelData, samplesDecoded } = decoder.decode(new Uint8Array(chunk as Buffer));
			if (samplesDecoded) builder.pushChannels(channelData, samplesDecoded);
		}
	} finally {
		decoder.free();
	}
	return builder.finish();
}
