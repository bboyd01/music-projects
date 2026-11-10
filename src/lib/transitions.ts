import { dur, ease } from '#lib/state/ui.svelte.ts';

/** Fade + short slide — used for panels, sheets and menus. */
export function slide(_node: Element, { y = 8, x = 0, kind = 'panel' as 'panel' | 'fade' } = {}) {
	return {
		duration: dur(kind),
		easing: ease,
		css: (t: number) => `opacity:${t};transform:translate(${(1 - t) * x}px,${(1 - t) * y}px)`
	};
}

export function fade(_node: Element, { kind = 'fade' as 'panel' | 'fade' } = {}) {
	return { duration: dur(kind), easing: ease, css: (t: number) => `opacity:${t}` };
}

export function pop(_node: Element) {
	return {
		duration: dur('panel'),
		easing: ease,
		css: (t: number) => `opacity:${t};transform:scale(${0.97 + 0.03 * t})`
	};
}
