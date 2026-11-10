import { browser } from '$app/env';

type Toast = { id: number; message: string; kind: 'info' | 'error' };

class UiState {
	toasts = $state<Toast[]>([]);
	/** URL of the (small) image shown blurred behind everything. */
	backdrop = $state<string>('/backgrounds/bg-01.webp');
	motion = $state<'on' | 'mobile-off' | 'off'>('on');
	reducedMotion = $state(false);
	small = $state(false);
}

export const ui = new UiState();

if (browser) {
	const rm = matchMedia('(prefers-reduced-motion: reduce)');
	const sm = matchMedia('(max-width: 767px), (pointer: coarse)');
	ui.reducedMotion = rm.matches;
	ui.small = sm.matches;
	rm.addEventListener('change', (e) => (ui.reducedMotion = e.matches));
	sm.addEventListener('change', (e) => (ui.small = e.matches));
	ui.motion = (document.documentElement.dataset.motion as UiState['motion']) ?? 'on';
}

let nextId = 1;
export function toast(message: string, kind: Toast['kind'] = 'info') {
	const id = nextId++;
	ui.toasts = [...ui.toasts, { id, message, kind }];
	setTimeout(() => (ui.toasts = ui.toasts.filter((t) => t.id !== id)), kind === 'error' ? 5000 : 2600);
}

/** Durations for Svelte transitions (CSS uses the --dur-* variables). Max 130ms. */
export const DUR = { panel: 130, fade: 90 } as const;

export function motionOn() {
	if (ui.reducedMotion || ui.motion === 'off') return false;
	if (ui.motion === 'mobile-off' && ui.small) return false;
	return true;
}

export function dur(kind: keyof typeof DUR = 'panel') {
	return motionOn() ? DUR[kind] : 0;
}

export const ease = (t: number) => {
	// cubic-bezier(0.2, 0, 0, 1) approximation — fast out, gentle settle.
	return 1 - Math.pow(1 - t, 3.2);
};

export function setMotion(m: UiState['motion']) {
	ui.motion = m;
	if (browser) document.documentElement.dataset.motion = m;
}

export function setTheme(t: 'system' | 'dark' | 'light') {
	if (browser) document.documentElement.dataset.theme = t;
}
