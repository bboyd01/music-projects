import { asc, eq } from 'drizzle-orm';
import { db, schema } from './db';
import { imageUrl } from './images';

export type BgOption = { id: string; backdrop: string; full: string; builtIn: boolean };
export type BgSetting = { mode: 'random' } | { mode: 'fixed'; id: string };

const BUILT_IN = 8;
const KEY = 'background';

export function builtInBackgrounds(): BgOption[] {
	return Array.from({ length: BUILT_IN }, (_, i) => {
		const n = String(i + 1).padStart(2, '0');
		return { id: `builtin-${n}`, backdrop: `/backgrounds/bg-${n}.webp`, full: `/backgrounds/bg-${n}-full.webp`, builtIn: true };
	});
}

/** Built-in backgrounds plus everything uploaded in Settings. */
export function listBackgrounds(): BgOption[] {
	const uploaded = db
		.select()
		.from(schema.backgrounds)
		.orderBy(asc(schema.backgrounds.createdAt))
		.all()
		.map((b) => ({ id: b.id, backdrop: imageUrl(b.backdrop)!, full: imageUrl(b.full)!, builtIn: false }));
	return [...builtInBackgrounds(), ...uploaded];
}

export function getBackgroundSetting(): BgSetting {
	const row = db.select().from(schema.appSettings).where(eq(schema.appSettings.key, KEY)).get();
	const v = row?.value as BgSetting | undefined;
	return v && (v.mode === 'random' || (v.mode === 'fixed' && typeof v.id === 'string')) ? v : { mode: 'random' };
}

export function setBackgroundSetting(value: BgSetting) {
	db.insert(schema.appSettings)
		.values({ key: KEY, value })
		.onConflictDoUpdate({ target: schema.appSettings.key, set: { value } })
		.run();
}

function hash(str: string) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
	return h >>> 0;
}

/**
 * The global background: the chosen one, or (Random) null plus the pool to pick from.
 * Projects without their own image use the chosen background, or a stable pick from the pool.
 */
export function globalBackground() {
	const pool = listBackgrounds();
	const setting = getBackgroundSetting();
	const selected = setting.mode === 'fixed' ? (pool.find((b) => b.id === setting.id) ?? null) : null;
	return { setting: selected ? setting : ({ mode: 'random' } as BgSetting), selected, pool };
}

export function fallbackForProject(projectId: string): { backdrop: string; full: string } {
	const { selected, pool } = globalBackground();
	const pick = selected ?? pool[hash(projectId) % pool.length];
	return { backdrop: pick.backdrop, full: pick.full };
}
