import { error } from '@sveltejs/kit';

export async function readJson(request: Request): Promise<Record<string, unknown>> {
	try {
		const v = await request.json();
		if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
	} catch {
		/* fall through */
	}
	error(400, 'Expected a JSON object');
}

export function str(v: unknown, field: string, { max = 10_000, min = 0 } = {}): string {
	if (typeof v !== 'string') error(400, `${field} must be text`);
	const s = v.trim();
	if (s.length < min) error(400, `${field} is required`);
	if (s.length > max) error(400, `${field} is too long`);
	return s;
}

export function optStr(v: unknown, field: string, opts?: { max?: number }): string | undefined {
	return v === undefined ? undefined : str(v, field, opts);
}

/** null clears the value; undefined leaves it unchanged. */
export function nullableStr(v: unknown, field: string, opts?: { max?: number }): string | null | undefined {
	if (v === undefined) return undefined;
	if (v === null || v === '') return null;
	return str(v, field, opts);
}

export function optDate(v: unknown, field: string): string | null | undefined {
	const s = nullableStr(v, field, { max: 10 });
	if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) error(400, `${field} must be YYYY-MM-DD`);
	return s;
}

export function optNum(v: unknown, field: string): number | undefined {
	if (v === undefined) return undefined;
	if (typeof v !== 'number' || !Number.isFinite(v)) error(400, `${field} must be a number`);
	return v;
}

export function nullableNum(v: unknown, field: string): number | null | undefined {
	if (v === null) return null;
	return optNum(v, field);
}

export function optBool(v: unknown, field: string): boolean | undefined {
	if (v === undefined) return undefined;
	if (typeof v !== 'boolean') error(400, `${field} must be true/false`);
	return v;
}

export function oneOf<T extends string>(v: unknown, field: string, values: readonly T[]): T | undefined {
	if (v === undefined) return undefined;
	if (typeof v !== 'string' || !values.includes(v as T)) error(400, `${field} is invalid`);
	return v as T;
}

/** Drop undefined keys so drizzle .set() only touches provided fields. */
export function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
	return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
