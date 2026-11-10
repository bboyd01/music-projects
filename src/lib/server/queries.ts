import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from './db';
import { imageUrl } from './images';
import { fallbackForProject } from './backgrounds';
import type { AudioData, ImageData, Role, TextData } from './db/schema';

export type Backdrop = { backdrop: string; full: string; source: 'cover' | 'inspiration' | 'default' };

/** Pinned cover → pinned inspiration → first image inspiration → default B&W background. */
export function projectBackdrop(project: schema.Project): Backdrop {
	if (project.coverBackdrop && project.coverFull) {
		return { backdrop: imageUrl(project.coverBackdrop)!, full: imageUrl(project.coverFull)!, source: 'cover' };
	}
	const imgs = db
		.select({ id: schema.inspirations.id, data: schema.inspirations.data })
		.from(schema.inspirations)
		.where(
			and(
				eq(schema.inspirations.projectId, project.id),
				isNull(schema.inspirations.trackId),
				eq(schema.inspirations.type, 'image')
			)
		)
		.orderBy(asc(schema.inspirations.createdAt))
		.all();
	const pinned = project.coverInspirationId ? imgs.find((i) => i.id === project.coverInspirationId) : undefined;
	const pick = pinned ?? imgs[0];
	if (pick) {
		const url = imageUrl((pick.data as ImageData).file)!;
		return { backdrop: url, full: url, source: 'inspiration' };
	}
	return { ...fallbackForProject(project.id), source: 'default' };
}

export function listProjects(userId: string) {
	const readOnly = !!db.select({ r: schema.users.readOnly }).from(schema.users).where(eq(schema.users.id, userId)).get()?.r;
	const rows = readOnly
		? db
				.select({ project: schema.projects })
				.from(schema.projects)
				.orderBy(desc(schema.projects.createdAt))
				.all()
				.map((r) => ({ project: r.project, role: 'viewer' as const }))
		: db
				.select({ project: schema.projects, role: schema.projectMembers.role })
				.from(schema.projectMembers)
				.innerJoin(schema.projects, eq(schema.projects.id, schema.projectMembers.projectId))
				.where(eq(schema.projectMembers.userId, userId))
				.orderBy(desc(schema.projects.createdAt))
				.all();
	const ids = rows.map((r) => r.project.id);
	const counts = ids.length
		? db
				.select({ projectId: schema.tracks.projectId, n: sql<number>`count(*)` })
				.from(schema.tracks)
				.where(inArray(schema.tracks.projectId, ids))
				.groupBy(schema.tracks.projectId)
				.all()
		: [];
	const countMap = new Map(counts.map((c) => [c.projectId, c.n]));
	return rows.map(({ project, role }) => ({
		id: project.id,
		name: project.name,
		description: project.description,
		statusId: project.statusId,
		role,
		trackCount: countMap.get(project.id) ?? 0,
		backdrop: projectBackdrop(project).backdrop,
		createdAt: project.createdAt
	}));
}

export function projectMembers(projectId: string) {
	return db
		.select({
			id: schema.users.id,
			name: schema.users.name,
			username: schema.users.username,
			role: schema.projectMembers.role
		})
		.from(schema.projectMembers)
		.innerJoin(schema.users, eq(schema.users.id, schema.projectMembers.userId))
		.where(eq(schema.projectMembers.projectId, projectId))
		.orderBy(asc(schema.users.name))
		.all();
}

export type TrackRow = {
	id: string;
	title: string;
	icon: string | null;
	statusId: string | null;
	startDate: string | null;
	dueDate: string | null;
	description: string;
	sortOrder: number;
	audio: { filename: string; duration: number | null } | null;
	commentCount: number;
	todoDone: number;
	todoTotal: number;
	inspirationCount: number;
	createdAt: number;
};

export function listTracks(projectId: string): TrackRow[] {
	const tracks = db
		.select({ track: schema.tracks, audio: schema.audioFiles })
		.from(schema.tracks)
		.leftJoin(schema.audioFiles, eq(schema.audioFiles.trackId, schema.tracks.id))
		.where(eq(schema.tracks.projectId, projectId))
		.orderBy(asc(schema.tracks.sortOrder), asc(schema.tracks.createdAt))
		.all();
	const ids = tracks.map((t) => t.track.id);
	if (!ids.length) return [];

	const commentCounts = new Map(
		db
			.select({ id: schema.comments.trackId, n: sql<number>`count(*)` })
			.from(schema.comments)
			.where(inArray(schema.comments.trackId, ids))
			.groupBy(schema.comments.trackId)
			.all()
			.map((r) => [r.id, r.n])
	);
	const todoCounts = new Map(
		db
			.select({
				id: schema.checklists.trackId,
				total: sql<number>`count(${schema.todos.id})`,
				done: sql<number>`coalesce(sum(${schema.todos.done}), 0)`
			})
			.from(schema.checklists)
			.innerJoin(schema.todos, eq(schema.todos.checklistId, schema.checklists.id))
			.where(inArray(schema.checklists.trackId, ids))
			.groupBy(schema.checklists.trackId)
			.all()
			.map((r) => [r.id, r])
	);
	const inspCounts = new Map(
		db
			.select({ id: schema.inspirations.trackId, n: sql<number>`count(*)` })
			.from(schema.inspirations)
			.where(inArray(schema.inspirations.trackId, ids))
			.groupBy(schema.inspirations.trackId)
			.all()
			.map((r) => [r.id, r.n])
	);

	return tracks.map(({ track, audio }) => ({
		id: track.id,
		title: track.title,
		icon: track.icon,
		statusId: track.statusId,
		startDate: track.startDate,
		dueDate: track.dueDate,
		description: track.description,
		sortOrder: track.sortOrder,
		audio: audio ? { filename: audio.filename, duration: audio.duration } : null,
		commentCount: commentCounts.get(track.id) ?? 0,
		todoDone: todoCounts.get(track.id)?.done ?? 0,
		todoTotal: todoCounts.get(track.id)?.total ?? 0,
		inspirationCount: inspCounts.get(track.id) ?? 0,
		createdAt: track.createdAt
	}));
}

export type CommentView = {
	id: string;
	trackId: string;
	projectId: string;
	body: string;
	timestampSec: number | null;
	createdAt: number;
	author: { id: string; name: string; username: string };
	hasTodo: boolean;
	resolvedAt: number | null;
	resolvedBy: string | null;
};

export function trackComments(trackId: string): CommentView[] {
	const rows = db
		.select({
			c: schema.comments,
			author: { id: schema.users.id, name: schema.users.name, username: schema.users.username }
		})
		.from(schema.comments)
		.innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
		.where(eq(schema.comments.trackId, trackId))
		.orderBy(desc(schema.comments.createdAt), desc(sql`comments.rowid`))
		.all();
	const resolverIds = [...new Set(rows.map((r) => r.c.resolvedBy).filter((x): x is string => !!x))];
	const resolvers = new Map(
		resolverIds.length
			? db
					.select({ id: schema.users.id, name: schema.users.name })
					.from(schema.users)
					.where(inArray(schema.users.id, resolverIds))
					.all()
					.map((u) => [u.id, u.name])
			: []
	);
	const ids = rows.map((r) => r.c.id);
	const withTodo = new Set(
		ids.length
			? db
					.select({ id: schema.todos.sourceCommentId })
					.from(schema.todos)
					.where(inArray(schema.todos.sourceCommentId, ids))
					.all()
					.map((r) => r.id)
			: []
	);
	return rows.map(({ c, author }) => ({
		id: c.id,
		trackId: c.trackId,
		projectId: c.projectId,
		body: c.body,
		timestampSec: c.timestampSec,
		createdAt: c.createdAt,
		author,
		hasTodo: withTodo.has(c.id),
		resolvedAt: c.resolvedAt,
		resolvedBy: c.resolvedBy ? (resolvers.get(c.resolvedBy) ?? 'someone') : null
	}));
}

export type ChecklistView = {
	id: string;
	title: string;
	todos: {
		id: string;
		text: string;
		done: boolean;
		timestampSec: number | null;
		sourceCommentId: string | null;
		createdAt: number;
	}[];
};

export function trackChecklists(trackId: string): ChecklistView[] {
	const lists = db
		.select()
		.from(schema.checklists)
		.where(eq(schema.checklists.trackId, trackId))
		.orderBy(asc(schema.checklists.sortOrder), asc(schema.checklists.createdAt))
		.all();
	if (!lists.length) return [];
	const items = db
		.select()
		.from(schema.todos)
		.where(
			inArray(
				schema.todos.checklistId,
				lists.map((l) => l.id)
			)
		)
		.orderBy(asc(schema.todos.createdAt), asc(sql`todos.rowid`))
		.all();
	return lists.map((l) => ({
		id: l.id,
		title: l.title,
		todos: items
			.filter((t) => t.checklistId === l.id)
			.map((t) => ({
				id: t.id,
				text: t.text,
				done: t.done,
				timestampSec: t.timestampSec,
				sourceCommentId: t.sourceCommentId,
				createdAt: t.createdAt
			}))
	}));
}

export type InspirationView =
	| (Base & { type: 'text'; data: TextData })
	| (Base & { type: 'image'; data: ImageData & { url: string } })
	| (Base & { type: 'audio'; data: AudioData & { thumbUrl: string | null } });
type Base = {
	id: string;
	projectId: string;
	trackId: string | null;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	createdAt: number;
};

export function toInspirationView(i: schema.Inspiration): InspirationView {
	const base: Base = {
		id: i.id,
		projectId: i.projectId,
		trackId: i.trackId,
		x: i.x,
		y: i.y,
		w: i.w,
		h: i.h,
		z: i.z,
		createdAt: i.createdAt
	};
	if (i.type === 'image') {
		const d = i.data as ImageData;
		return { ...base, type: 'image', data: { ...d, url: imageUrl(d.file)! } };
	}
	if (i.type === 'audio') {
		const d = i.data as AudioData;
		return { ...base, type: 'audio', data: { ...d, thumbUrl: imageUrl(d.thumb) } };
	}
	return { ...base, type: 'text', data: i.data as TextData };
}

/** Project canvas items (trackId null) or one track's items — the two never mix. */
export function listInspirations(projectId: string, trackId?: string): InspirationView[] {
	const where = and(
		eq(schema.inspirations.projectId, projectId),
		trackId ? eq(schema.inspirations.trackId, trackId) : isNull(schema.inspirations.trackId)
	);
	return db
		.select()
		.from(schema.inspirations)
		.where(where)
		.orderBy(asc(schema.inspirations.z), asc(schema.inspirations.createdAt))
		.all()
		.map(toInspirationView);
}

export function listConnections(projectId: string) {
	return db
		.select({
			id: schema.connections.id,
			fromId: schema.connections.fromId,
			fromSide: schema.connections.fromSide,
			toId: schema.connections.toId,
			toSide: schema.connections.toSide,
			style: schema.connections.style
		})
		.from(schema.connections)
		.where(eq(schema.connections.projectId, projectId))
		.all();
}
export type ConnectionView = ReturnType<typeof listConnections>[number];

export function trackAudio(trackId: string) {
	const a = db.select().from(schema.audioFiles).where(eq(schema.audioFiles.trackId, trackId)).get();
	return a
		? { id: a.id, filename: a.filename, duration: a.duration, size: a.size, uploadedAt: a.uploadedAt, url: `/files/audio/${trackId}?v=${a.id}` }
		: null;
}

export type TrackDetail = ReturnType<typeof trackDetail>;

export function trackDetail(track: schema.Track, role: Role) {
	return {
		track,
		role,
		audio: trackAudio(track.id),
		comments: trackComments(track.id),
		checklists: trackChecklists(track.id),
		inspirations: listInspirations(track.projectId, track.id),
		members: projectMembers(track.projectId)
	};
}

/** Tracks with audio, in project order — the player queue. */
export function projectQueue(projectId: string) {
	return db
		.select({
			id: schema.tracks.id,
			title: schema.tracks.title,
			icon: schema.tracks.icon,
			filename: schema.audioFiles.filename,
			duration: schema.audioFiles.duration,
			audioId: schema.audioFiles.id
		})
		.from(schema.tracks)
		.innerJoin(schema.audioFiles, eq(schema.audioFiles.trackId, schema.tracks.id))
		.where(eq(schema.tracks.projectId, projectId))
		.orderBy(asc(schema.tracks.sortOrder), asc(schema.tracks.createdAt))
		.all()
		.map((t) => ({ ...t, url: `/files/audio/${t.id}?v=${t.audioId}` }));
}

export function listStatuses() {
	return db
		.select()
		.from(schema.statuses)
		.orderBy(asc(schema.statuses.scope), asc(schema.statuses.sortOrder))
		.all();
}
