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
	migrate(db, { migrationsFolder: config.migrationsDir });
	migrated = true;
}
