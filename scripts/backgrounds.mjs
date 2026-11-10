#!/usr/bin/env node
/**
 * Builds the default black-and-white backgrounds in static/backgrounds/.
 *
 *   npm run backgrounds            → compress photos in assets/backgrounds/ (jpg/png/webp),
 *                                    or, if that folder is empty, render the built-in
 *                                    generated abstracts.
 *   npm run backgrounds -- --generated   → always use the generated abstracts.
 *
 * Every background gets two grayscale WebP files:
 *   bg-NN.webp       480px wide, q60  — blurred page backdrop (blur hides the low resolution)
 *   bg-NN-full.webp  1600px long edge, q78 — fullscreen player visual
 *
 * To use your own photos (e.g. free B&W abstracts from Unsplash/Pexels), drop up to
 * 8 files into assets/backgrounds/ and re-run. Credit them in static/backgrounds/CREDITS.md.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('static/backgrounds');
const SRC = path.resolve('assets/backgrounds');
const W = 1600;
const H = 1000;

const svg = (body, defs = '') =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;

/** Original abstract compositions, rendered with SVG filters (no third-party imagery). */
const generated = [
	// 01 Smoke — slow fractal noise with a soft vignette
	svg(
		`<rect width="100%" height="100%" fill="#111"/><rect width="100%" height="100%" filter="url(#f)"/><rect width="100%" height="100%" fill="url(#v)"/>`,
		`<filter id="f"><feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0042" numOctaves="5" seed="7"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="gamma" exponent="1.8" amplitude="1.9"/><feFuncG type="gamma" exponent="1.8" amplitude="1.9"/><feFuncB type="gamma" exponent="1.8" amplitude="1.9"/></feComponentTransfer></filter>
		 <radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="40%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.75"/></radialGradient>`
	),
	// 02 Ripples — concentric rings displaced by noise, like water
	svg(
		`<rect width="100%" height="100%" fill="#1c1c1c"/><g filter="url(#d)"><circle cx="1000" cy="400" r="40" fill="none" stroke="#d8d8d8" stroke-width="34"/><circle cx="1000" cy="400" r="110" fill="none" stroke="#3a3a3a" stroke-width="38"/><circle cx="1000" cy="400" r="180" fill="none" stroke="#d8d8d8" stroke-width="42"/><circle cx="1000" cy="400" r="250" fill="none" stroke="#3a3a3a" stroke-width="46"/><circle cx="1000" cy="400" r="320" fill="none" stroke="#d8d8d8" stroke-width="50"/><circle cx="1000" cy="400" r="390" fill="none" stroke="#3a3a3a" stroke-width="54"/><circle cx="1000" cy="400" r="460" fill="none" stroke="#d8d8d8" stroke-width="58"/><circle cx="1000" cy="400" r="530" fill="none" stroke="#3a3a3a" stroke-width="62"/><circle cx="1000" cy="400" r="600" fill="none" stroke="#d8d8d8" stroke-width="66"/><circle cx="1000" cy="400" r="670" fill="none" stroke="#3a3a3a" stroke-width="70"/><circle cx="1000" cy="400" r="740" fill="none" stroke="#d8d8d8" stroke-width="74"/><circle cx="1000" cy="400" r="810" fill="none" stroke="#3a3a3a" stroke-width="78"/><circle cx="1000" cy="400" r="880" fill="none" stroke="#d8d8d8" stroke-width="82"/><circle cx="1000" cy="400" r="950" fill="none" stroke="#3a3a3a" stroke-width="86"/><circle cx="1000" cy="400" r="1020" fill="none" stroke="#d8d8d8" stroke-width="90"/><circle cx="1000" cy="400" r="1090" fill="none" stroke="#3a3a3a" stroke-width="94"/><circle cx="1000" cy="400" r="1160" fill="none" stroke="#d8d8d8" stroke-width="98"/><circle cx="1000" cy="400" r="1230" fill="none" stroke="#3a3a3a" stroke-width="102"/><circle cx="1000" cy="400" r="1300" fill="none" stroke="#d8d8d8" stroke-width="106"/><circle cx="1000" cy="400" r="1370" fill="none" stroke="#3a3a3a" stroke-width="110"/><circle cx="1000" cy="400" r="1440" fill="none" stroke="#d8d8d8" stroke-width="114"/></g><rect width="100%" height="100%" fill="url(#v)"/>`,
		`<filter id="d" filterUnits="userSpaceOnUse" x="-200" y="-200" width="2000" height="1400"><feTurbulence type="fractalNoise" baseFrequency="0.003" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="90"/><feGaussianBlur stdDeviation="7"/></filter>
		 <radialGradient id="v" cx="62%" cy="40%" r="80%"><stop offset="30%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.8"/></radialGradient>`
	),
	// 03 Light beams — architectural diagonals
	svg(
		`<rect width="100%" height="100%" fill="#0e0e0e"/>
		 <g filter="url(#b)" opacity="0.9">
			<polygon points="300,0 520,0 1100,1000 760,1000" fill="#d9d9d9"/>
			<polygon points="700,0 820,0 1450,1000 1260,1000" fill="#8c8c8c"/>
			<polygon points="1000,0 1060,0 1600,860 1600,1000 1520,1000" fill="#5a5a5a"/>
		 </g><rect width="100%" height="100%" filter="url(#g)" opacity="0.25"/>`,
		`<filter id="b"><feGaussianBlur stdDeviation="38"/></filter>
		 <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2"/><feColorMatrix type="saturate" values="0"/></filter>`
	),
	// 04 Dunes — layered horizontal bands, gently warped
	svg(
		`<rect x="-400" y="-400" width="2400" height="1800" fill="url(#l)" filter="url(#d)"/>`,
		`<linearGradient id="l" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="160" y2="190" spreadMethod="reflect"><stop offset="0" stop-color="#1a1a1a"/><stop offset="0.6" stop-color="#9a9a9a"/><stop offset="1" stop-color="#e6e6e6"/></linearGradient>
		 <filter id="d" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="1800"><feTurbulence type="fractalNoise" baseFrequency="0.0016 0.006" numOctaves="3" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="260" xChannelSelector="R" yChannelSelector="G"/></filter>`
	),
	// 05 Ink — thresholded turbulence, like ink bleeding into paper
	svg(
		`<rect width="100%" height="100%" fill="#d9d9d9"/><rect width="100%" height="100%" filter="url(#i)" opacity="0.85"/>`,
		`<filter id="i"><feTurbulence type="turbulence" baseFrequency="0.0035" numOctaves="4" seed="21"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.3 -1.3 -1.3 0 1.55"/><feGaussianBlur stdDeviation="2.5"/></filter>`
	),
	// 06 Orb — a single soft light in darkness
	svg(
		`<rect width="100%" height="100%" fill="#070707"/><circle cx="1050" cy="420" r="420" fill="url(#o)"/><rect width="100%" height="100%" filter="url(#g)" opacity="0.18"/>`,
		`<radialGradient id="o"><stop offset="0" stop-color="#f0f0f0"/><stop offset="0.35" stop-color="#7a7a7a" stop-opacity="0.8"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
		 <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2"/><feColorMatrix type="saturate" values="0"/></filter>`
	),
	// 07 Concrete — fine mineral texture with raking light
	svg(
		`<rect width="100%" height="100%" filter="url(#c)"/><rect width="100%" height="100%" fill="url(#lg)"/>`,
		`<filter id="c"><feTurbulence type="fractalNoise" baseFrequency="0.007" numOctaves="4" seed="5"/><feColorMatrix type="saturate" values="0"/><feGaussianBlur stdDeviation="0.8"/><feComponentTransfer><feFuncR type="linear" slope="1.6" intercept="-0.25"/><feFuncG type="linear" slope="1.6" intercept="-0.25"/><feFuncB type="linear" slope="1.6" intercept="-0.25"/></feComponentTransfer></filter>
		 <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.25"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></linearGradient>`
	),
	// 08 Silk — a folded gradient, like fabric under soft light
	svg(
		`<rect x="-400" y="-400" width="2400" height="1800" fill="url(#s)" filter="url(#d)"/>`,
		`<linearGradient id="s" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="620" y2="160" spreadMethod="reflect"><stop offset="0" stop-color="#0d0d0d"/><stop offset="0.5" stop-color="#6e6e6e"/><stop offset="1" stop-color="#d4d4d4"/></linearGradient>
		 <filter id="d" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="1800"><feTurbulence type="fractalNoise" baseFrequency="0.0012 0.0018" numOctaves="2" seed="17" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="420" xChannelSelector="R" yChannelSelector="B"/><feGaussianBlur stdDeviation="6"/></filter>`
	)
];

async function readSources() {
	try {
		const files = (await fs.readdir(SRC)).filter((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f)).sort();
		return files.slice(0, 8).map((f) => path.join(SRC, f));
	} catch {
		return [];
	}
}

async function emit(input, n) {
	const id = String(n).padStart(2, '0');
	const base = () => sharp(input).rotate().grayscale();
	const full = await base()
		.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 78, effort: 6 })
		.toFile(path.join(OUT, `bg-${id}-full.webp`));
	const small = await base()
		.resize({ width: 480 })
		.webp({ quality: 60, effort: 6 })
		.toFile(path.join(OUT, `bg-${id}.webp`));
	console.log(`bg-${id}: backdrop ${(small.size / 1024).toFixed(1)} KB, full ${(full.size / 1024).toFixed(1)} KB`);
}

await fs.mkdir(OUT, { recursive: true });
const forceGenerated = process.argv.includes('--generated');
const sources = forceGenerated ? [] : await readSources();
if (sources.length) {
	console.log(`Compressing ${sources.length} photo(s) from assets/backgrounds/`);
	for (let i = 0; i < sources.length; i++) await emit(sources[i], i + 1);
} else {
	console.log('Rendering generated abstract backgrounds');
	for (let i = 0; i < generated.length; i++) {
		// Trim a margin so filter/displacement edges never show.
		const trimmed = await sharp(Buffer.from(generated[i]))
			.extract({ left: 200, top: 125, width: W - 400, height: H - 250 })
			.png()
			.toBuffer();
		await emit(trimmed, i + 1);
	}
}
