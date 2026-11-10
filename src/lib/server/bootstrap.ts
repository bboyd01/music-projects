import { count, eq } from 'drizzle-orm';
import { db, runMigrations, schema } from './db';
import { config } from './config';
import { newId } from './id';
import { hashPassword, purgeExpiredSessions } from './auth';
import { defaultProjectStatuses, defaultTrackStatuses } from '#lib/palette.ts';

let done = false;
let testHash = '';

export async function bootstrap() {
	if (done) return;
	done = true;
	runMigrations();

	const [{ n }] = db.select({ n: count() }).from(schema.statuses).all();
	if (n === 0) {
		const rows = [
			...defaultProjectStatuses.map((s, i) => ({ ...s, scope: 'project' as const, sortOrder: i })),
			...defaultTrackStatuses.map((s, i) => ({ ...s, scope: 'track' as const, sortOrder: i }))
		].map((s) => ({ id: newId(), isDone: false, ...s }));
		db.insert(schema.statuses).values(rows).run();
	}

	const [{ u }] = db.select({ u: count() }).from(schema.users).all();
	if (u === 0) {
		if (!config.adminEmail || !config.adminPassword) {
			console.warn(
				'[music-projects] No users exist. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart to create the first admin account.'
			);
			return;
		}
		const email = config.adminEmail.toLowerCase();
		db.insert(schema.users)
			.values({
				id: newId(),
				email,
				username: email.split('@')[0].replace(/[^a-z0-9_]/g, '') || 'admin',
				name: config.adminName,
				passwordHash: await hashPassword(config.adminPassword),
				isAdmin: true
			})
			.run();
		console.log(`[music-projects] Created admin account ${email}`);
	}

	if (config.includeTestUser) testHash = await hashPassword('test');
	syncTestUser();
	purgeExpiredSessions();
}

/** The read-only "test" account exists only while INCLUDE_TEST_USER is on. */
function syncTestUser() {
	const existing = db.select().from(schema.users).where(eq(schema.users.username, 'test')).get();
	if (config.includeTestUser) {
		if (!existing && testHash) {
			db.insert(schema.users)
				.values({ id: newId(), username: 'test', name: 'Test', email: null, passwordHash: testHash, readOnly: true })
				.run();
			console.log('[music-projects] Created read-only test account (test / test). Set INCLUDE_TEST_USER=false to remove it.');
		} else if (existing && !existing.readOnly) {
			// Never let a real account named "test" be silently changed.
			console.warn('[music-projects] A non-read-only user named "test" exists; leaving it alone.');
		}
	} else if (existing?.readOnly) {
		db.delete(schema.users).where(eq(schema.users.id, existing.id)).run();
		console.log('[music-projects] Removed the read-only test account (INCLUDE_TEST_USER is off).');
	}
}
