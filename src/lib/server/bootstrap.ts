import { count } from 'drizzle-orm';
import { db, runMigrations, schema } from './db';
import { config } from './config';
import { newId } from './id';
import { hashPassword, purgeExpiredSessions } from './auth';
import { defaultProjectStatuses, defaultTrackStatuses } from '#lib/palette.ts';

let done = false;

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

	purgeExpiredSessions();
}
