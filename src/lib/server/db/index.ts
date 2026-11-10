import fs from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { config } from '../config';
import * as schema from './schema';

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.audioDir, { recursive: true });
fs.mkdirSync(config.imageDir, { recursive: true });

const sqlite = new Database(config.dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema });
export { schema };

let migrated = false;
export function runMigrations() {
	if (migrated) return;
	// Migrations run inside one transaction, where SQLite ignores `PRAGMA foreign_keys`.
	// Table rebuilds (DROP + RENAME) would otherwise fire ON DELETE CASCADE on child
	// tables, so pause foreign keys around the whole run and verify integrity after.
	sqlite.pragma('foreign_keys = OFF');
	try {
		migrate(db, { migrationsFolder: config.migrationsDir });
		const violations = sqlite.pragma('foreign_key_check') as unknown[];
		if (violations.length) throw new Error(`Foreign key check failed after migration: ${JSON.stringify(violations.slice(0, 5))}`);
	} finally {
		sqlite.pragma('foreign_keys = ON');
	}
	migrated = true;
}
