import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db, schema } from './db';
import type { SafeUser } from './auth';
import { roleAllows, type Role } from '#lib/roles.ts';

export { roleAllows };

export function requireUser(user: SafeUser | null | undefined): SafeUser {
	if (!user) error(401, 'Not signed in');
	return user;
}

export function requireAdmin(user: SafeUser | null | undefined): SafeUser {
	const u = requireUser(user);
	if (!u.isAdmin) error(403, 'Admins only');
	return u;
}

export function projectRole(userId: string, projectId: string): Role | null {
	const row = db
		.select({ role: schema.projectMembers.role })
		.from(schema.projectMembers)
		.where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)))
		.get();
	return row?.role ?? null;
}

/** Throws 404 (not 403, to avoid leaking existence) unless the user has at least `needed` on the project. */
export function requireProjectAccess(
	user: SafeUser | null | undefined,
	projectId: string,
	needed: Role = 'viewer'
): { user: SafeUser; role: Role } {
	const u = requireUser(user);
	const role = projectRole(u.id, projectId);
	if (!role) error(404, 'Project not found');
	if (!roleAllows(role, needed)) error(403, 'You do not have permission to do that');
	return { user: u, role };
}

export function requireTrackAccess(
	user: SafeUser | null | undefined,
	trackId: string,
	needed: Role = 'viewer'
) {
	const track = db.select().from(schema.tracks).where(eq(schema.tracks.id, trackId)).get();
	if (!track) error(404, 'Track not found');
	const access = requireProjectAccess(user, track.projectId, needed);
	return { ...access, track };
}

export function accessibleProjectIds(userId: string): string[] {
	return db
		.select({ id: schema.projectMembers.projectId })
		.from(schema.projectMembers)
		.where(eq(schema.projectMembers.userId, userId))
		.all()
		.map((r) => r.id);
}
