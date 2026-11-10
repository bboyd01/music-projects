import { hash, verify } from '@node-rs/argon2';
import { and, eq, gt, lt } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db, schema } from './db';
import { newToken } from './id';
import { config } from './config';
import { createHash } from 'node:crypto';

export const SESSION_COOKIE = 'mp_session';
const DAY = 24 * 60 * 60 * 1000;

export function hashPassword(password: string) {
	return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hashStr: string, password: string) {
	try {
		return await verify(hashStr, password);
	} catch {
		return false;
	}
}

/** Session ids are stored hashed so a leaked DB can't be used to hijack sessions. */
function hashToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function createSession(userId: string, cookies: Cookies, secure: boolean) {
	const token = newToken();
	const expiresAt = Date.now() + config.sessionDays * DAY;
	db.insert(schema.sessions).values({ id: hashToken(token), userId, expiresAt }).run();
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		expires: new Date(expiresAt)
	});
}

export function validateSession(token: string | undefined) {
	if (!token) return null;
	const id = hashToken(token);
	const row = db
		.select({ session: schema.sessions, user: schema.users })
		.from(schema.sessions)
		.innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
		.where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, Date.now())))
		.get();
	if (!row) return null;
	// Sliding expiry: extend when less than half the lifetime remains.
	if (row.session.expiresAt - Date.now() < (config.sessionDays * DAY) / 2) {
		db.update(schema.sessions)
			.set({ expiresAt: Date.now() + config.sessionDays * DAY })
			.where(eq(schema.sessions.id, id))
			.run();
	}
	return row.user;
}

export function destroySession(token: string | undefined, cookies: Cookies) {
	if (token) db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token))).run();
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function destroyUserSessions(userId: string) {
	db.delete(schema.sessions).where(eq(schema.sessions.userId, userId)).run();
}

export function purgeExpiredSessions() {
	db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, Date.now())).run();
}

export type SafeUser = {
	id: string;
	email: string | null;
	username: string;
	name: string;
	isAdmin: boolean;
	readOnly: boolean;
	discordUserId: string | null;
	settings: schema.UserSettings;
};

export function toSafeUser(u: schema.User): SafeUser {
	return {
		id: u.id,
		email: u.email,
		username: u.username,
		name: u.name,
		isAdmin: u.isAdmin,
		readOnly: u.readOnly,
		discordUserId: u.discordUserId,
		settings: u.settings ?? {}
	};
}
