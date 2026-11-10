import path from 'node:path';

const dataDir = path.resolve(process.env.DATA_DIR ?? 'data');

export const config = {
	dataDir,
	dbPath: path.join(dataDir, 'app.db'),
	audioDir: path.join(dataDir, 'uploads', 'audio'),
	imageDir: path.join(dataDir, 'uploads', 'images'),
	migrationsDir: path.resolve(process.env.MIGRATIONS_DIR ?? 'drizzle'),
	adminEmail: process.env.ADMIN_EMAIL,
	adminPassword: process.env.ADMIN_PASSWORD,
	adminName: process.env.ADMIN_NAME ?? 'Admin',
	/** Read-only demo account (username "test", password "test"). On unless set to false/no/0. */
	includeTestUser: !/^(false|no|0|off)$/i.test(process.env.INCLUDE_TEST_USER ?? 'true'),
	discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || null,
	publicUrl: (process.env.ORIGIN ?? '').replace(/\/$/, ''),
	maxAudioBytes: Number(process.env.MAX_AUDIO_MB ?? 500) * 1024 * 1024,
	maxImageBytes: 25 * 1024 * 1024,
	sessionDays: 30
};
