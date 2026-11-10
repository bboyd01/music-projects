import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from './db';
import { newId } from './id';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Create a token; the plain value is returned once and never stored. */
export function createApiToken(userId: string, name: string) {
	const token = `mp_${randomBytes(32).toString('base64url')}`;
	const id = newId();
	db.insert(schema.apiTokens).values({ id, userId, name, tokenHash: hash(token), createdAt: Date.now() }).run();
	return { id, token };
}

export function listApiTokens(userId: string) {
	return db
		.select({
			id: schema.apiTokens.id,
			name: schema.apiTokens.name,
			createdAt: schema.apiTokens.createdAt,
			lastUsedAt: schema.apiTokens.lastUsedAt
		})
		.from(schema.apiTokens)
		.where(eq(schema.apiTokens.userId, userId))
		.orderBy(desc(schema.apiTokens.createdAt))
		.all();
}

export function revokeApiToken(userId: string, id: string) {
	return db
		.delete(schema.apiTokens)
		.where(and(eq(schema.apiTokens.id, id), eq(schema.apiTokens.userId, userId)))
		.run().changes;
}

/** Resolve `Authorization: Bearer mp_…` to its user (null if missing/unknown). */
export function userForBearer(header: string | null) {
	const m = header?.match(/^Bearer\s+(mp_[A-Za-z0-9_-]{20,})\s*$/);
	if (!m) return null;
	const row = db
		.select({ token: schema.apiTokens, user: schema.users })
		.from(schema.apiTokens)
		.innerJoin(schema.users, eq(schema.users.id, schema.apiTokens.userId))
		.where(eq(schema.apiTokens.tokenHash, hash(m[1])))
		.get();
	if (!row) return null;
	// Record use, at most once a minute.
	if (!row.token.lastUsedAt || Date.now() - row.token.lastUsedAt > 60_000) {
		db.update(schema.apiTokens).set({ lastUsedAt: Date.now() }).where(eq(schema.apiTokens.id, row.token.id)).run();
	}
	return row.user;
}
