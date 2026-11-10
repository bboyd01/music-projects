import { sql } from 'drizzle-orm';
import {
	sqliteTable,
	text,
	integer,
	real,
	primaryKey,
	index
} from 'drizzle-orm/sqlite-core';

const now = sql`(unixepoch() * 1000)`;
const createdAt = () => integer('created_at', { mode: 'number' }).notNull().default(now);

export type UserSettings = {
	theme?: 'system' | 'dark' | 'light';
	motion?: 'on' | 'mobile-off' | 'off';
	musicService?: 'apple' | 'spotify';
	/** Player timeline style: a waveform (default) or the plain line. */
	timeline?: 'line' | 'waveform';
	/** "Open in DAW": on unless turned off; needs folder + extension to show the button. */
	dawEnabled?: boolean;
	/** e.g. /Users/me/Documents/REAPER Media/PROJECTS/ */
	projectFolder?: string;
	/** e.g. .rpp */
	projectExt?: string;
};

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	/** Optional: the read-only test account has none. Sign-in accepts email or username. */
	email: text('email').unique(),
	username: text('username').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	/** Read-only accounts can view every project but change nothing. */
	readOnly: integer('read_only', { mode: 'boolean' }).notNull().default(false),
	discordUserId: text('discord_user_id'),
	settings: text('settings', { mode: 'json' }).$type<UserSettings>().notNull().default({}),
	createdAt: createdAt()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'number' }).notNull()
});

export const statuses = sqliteTable(
	'statuses',
	{
		id: text('id').primaryKey(),
		scope: text('scope', { enum: ['project', 'track'] }).notNull(),
		name: text('name').notNull(),
		color: text('color').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		isDone: integer('is_done', { mode: 'boolean' }).notNull().default(false)
	},
	(t) => [index('statuses_scope_idx').on(t.scope, t.sortOrder)]
);

export const projects = sqliteTable('projects', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	statusId: text('status_id').references(() => statuses.id, { onDelete: 'set null' }),
	ownerId: text('owner_id')
		.notNull()
		.references(() => users.id),
	coverInspirationId: text('cover_inspiration_id'),
	coverFull: text('cover_full'),
	coverBackdrop: text('cover_backdrop'),
	discordWebhookUrl: text('discord_webhook_url'),
	createdAt: createdAt()
});

export const projectMembers = sqliteTable(
	'project_members',
	{
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['owner', 'editor', 'viewer'] }).notNull()
	},
	(t) => [primaryKey({ columns: [t.projectId, t.userId] })]
);

export type ProjectView = 'table' | 'list' | 'board';
export const projectViewPrefs = sqliteTable(
	'project_view_prefs',
	{
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		view: text('view', { enum: ['table', 'list', 'board'] }).notNull().default('table'),
		visibleFields: text('visible_fields', { mode: 'json' }).$type<string[]>()
	},
	(t) => [primaryKey({ columns: [t.projectId, t.userId] })]
);

export const tracks = sqliteTable(
	'tracks',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		icon: text('icon'),
		statusId: text('status_id').references(() => statuses.id, { onDelete: 'set null' }),
		startDate: text('start_date'),
		dueDate: text('due_date'),
		description: text('description').notNull().default(''),
		sortOrder: real('sort_order').notNull().default(0),
		createdAt: createdAt()
	},
	(t) => [index('tracks_project_idx').on(t.projectId, t.sortOrder)]
);

export const audioFiles = sqliteTable('audio_files', {
	id: text('id').primaryKey(),
	trackId: text('track_id')
		.notNull()
		.unique()
		.references(() => tracks.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	path: text('path').notNull(),
	mime: text('mime').notNull(),
	duration: real('duration'),
	size: integer('size').notNull(),
	/** Waveform peaks (JSON array of 0–255), computed once after upload. Null = not available. */
	peaks: text('peaks', { mode: 'json' }).$type<number[]>(),
	uploadedAt: createdAt()
});

export const comments = sqliteTable(
	'comments',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		trackId: text('track_id')
			.notNull()
			.references(() => tracks.id, { onDelete: 'cascade' }),
		authorId: text('author_id')
			.notNull()
			.references(() => users.id),
		body: text('body').notNull(),
		timestampSec: real('timestamp_sec'),
		resolvedAt: integer('resolved_at', { mode: 'number' }),
		resolvedBy: text('resolved_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: createdAt()
	},
	(t) => [
		index('comments_track_idx').on(t.trackId, t.createdAt),
		index('comments_created_idx').on(t.createdAt)
	]
);

export const commentMentions = sqliteTable(
	'comment_mentions',
	{
		commentId: text('comment_id')
			.notNull()
			.references(() => comments.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.commentId, t.userId] })]
);

export const checklists = sqliteTable('checklists', {
	id: text('id').primaryKey(),
	trackId: text('track_id')
		.notNull()
		.references(() => tracks.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	sortOrder: real('sort_order').notNull().default(0),
	createdAt: createdAt()
});

export const todos = sqliteTable(
	'todos',
	{
		id: text('id').primaryKey(),
		checklistId: text('checklist_id')
			.notNull()
			.references(() => checklists.id, { onDelete: 'cascade' }),
		text: text('text').notNull(),
		done: integer('done', { mode: 'boolean' }).notNull().default(false),
		timestampSec: real('timestamp_sec'),
		sourceCommentId: text('source_comment_id').references(() => comments.id, {
			onDelete: 'set null'
		}),
		createdAt: createdAt()
	},
	(t) => [index('todos_checklist_idx').on(t.checklistId)]
);

export type TextData = { text: string };
export type ImageData = { file: string; width: number; height: number };
export type AudioData = {
	title: string;
	artist?: string;
	album?: string;
	appleUrl?: string;
	spotifyUrl?: string;
	thumb?: string;
};
export type InspirationData = TextData | ImageData | AudioData;

export const inspirations = sqliteTable(
	'inspirations',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		// null = belongs to the project canvas; set = belongs to that track only.
		trackId: text('track_id').references(() => tracks.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['text', 'image', 'audio'] }).notNull(),
		data: text('data', { mode: 'json' }).$type<InspirationData>().notNull(),
		x: real('x').notNull().default(40),
		y: real('y').notNull().default(40),
		w: real('w').notNull().default(240),
		h: real('h').notNull().default(160),
		z: integer('z').notNull().default(0),
		createdAt: createdAt()
	},
	(t) => [index('inspirations_project_idx').on(t.projectId), index('inspirations_track_idx').on(t.trackId)]
);

export type ConnectionSide = 'top' | 'right' | 'bottom' | 'left';
export type ConnectionStyle = 'line' | 'dotted' | 'arrow' | 'both';

/** Lines drawn between items on the project inspiration canvas. */
export const connections = sqliteTable(
	'connections',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		fromId: text('from_id')
			.notNull()
			.references(() => inspirations.id, { onDelete: 'cascade' }),
		fromSide: text('from_side', { enum: ['top', 'right', 'bottom', 'left'] }).notNull(),
		toId: text('to_id')
			.notNull()
			.references(() => inspirations.id, { onDelete: 'cascade' }),
		toSide: text('to_side', { enum: ['top', 'right', 'bottom', 'left'] }).notNull(),
		style: text('style', { enum: ['line', 'dotted', 'arrow', 'both'] }).notNull().default('line'),
		createdAt: createdAt()
	},
	(t) => [index('connections_project_idx').on(t.projectId)]
);

/** Uploaded background photos (compressed: 1600px full + 480px backdrop). */
export const backgrounds = sqliteTable('backgrounds', {
	id: text('id').primaryKey(),
	full: text('full').notNull(),
	backdrop: text('backdrop').notNull(),
	uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
	createdAt: createdAt()
});

/** App-wide key/value settings (e.g. the global background). */
export const appSettings = sqliteTable('app_settings', {
	key: text('key').primaryKey(),
	value: text('value', { mode: 'json' }).notNull()
});

/** Personal API tokens (scripts like the REAPER uploader). Only a hash is stored. */
export const apiTokens = sqliteTable(
	'api_tokens',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		tokenHash: text('token_hash').notNull().unique(),
		createdAt: createdAt(),
		lastUsedAt: integer('last_used_at', { mode: 'number' })
	},
	(t) => [index('api_tokens_user_idx').on(t.userId)]
);

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Status = typeof statuses.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Checklist = typeof checklists.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type Inspiration = typeof inspirations.$inferSelect;
export type AudioFile = typeof audioFiles.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Role = 'owner' | 'editor' | 'viewer';
