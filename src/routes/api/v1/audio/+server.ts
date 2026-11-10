import { error, json } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireTrackAccess, requireUser } from '#lib/server/access.ts';
import { storeTrackAudio } from '#lib/server/audio.ts';
import { audioKind, matchTracks } from '#lib/match.ts';
import { config } from '#lib/server/config.ts';

/**
 * Upload a WAV or MP3 to the track whose title matches the file name.
 *
 *   curl -X POST -H "Authorization: Bearer mp_…" -H "Content-Type: audio/mpeg" \
 *        --data-binary @"New Sketch 14.mp3" \
 *        "https://server/api/v1/audio?filename=New%20Sketch%2014.mp3"
 *
 * Optional: &project=<name or id> when the same title exists in several projects.
 */
export async function POST({ request, url, locals }) {
	const user = requireUser(locals.user);
	const ctype = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	if (ctype.startsWith('multipart/') || ctype === 'application/x-www-form-urlencoded') {
		error(415, 'Send the file as the raw request body (curl --data-binary @file) with Content-Type: audio/mpeg, audio/wav or application/octet-stream');
	}
	const filename = decodeURIComponent(url.searchParams.get('filename') ?? request.headers.get('x-filename') ?? '').trim();
	if (!filename) error(400, 'Add ?filename=<Track Name>.mp3');
	const kind = audioKind(filename);
	if (!kind) error(415, 'Only .wav and .mp3 files can be uploaded');
	if (!request.body) error(400, 'No file in the request body');

	// Candidates: tracks in projects where this user can edit.
	const projectIds = db
		.select({ id: schema.projectMembers.projectId })
		.from(schema.projectMembers)
		.where(and(eq(schema.projectMembers.userId, user.id), inArray(schema.projectMembers.role, ['owner', 'editor'])))
		.all()
		.map((r) => r.id);
	const candidates = projectIds.length
		? db
				.select({ trackId: schema.tracks.id, title: schema.tracks.title, projectId: schema.projects.id, projectName: schema.projects.name })
				.from(schema.tracks)
				.innerJoin(schema.projects, eq(schema.projects.id, schema.tracks.projectId))
				.where(inArray(schema.tracks.projectId, projectIds))
				.all()
		: [];

	const project = url.searchParams.get('project');
	const matches = matchTracks(filename, candidates, project);
	if (matches.length === 0) {
		error(404, `No track named “${filename.replace(/\.(wav|mp3)$/i, '')}”${project ? ` in “${project}”` : ''} in projects you can edit`);
	}
	if (matches.length > 1) {
		// Projects can share a name, so list ids too when needed.
		const sameName = new Set(matches.map((m) => m.projectName)).size < matches.length;
		const names = matches.map((m) => (sameName ? `${m.projectName} (${m.projectId})` : m.projectName)).join(', ');
		error(409, `Several tracks match: ${names}. Add &project=<${sameName ? 'id' : 'name'}> to choose.`);
	}

	const m = matches[0];
	requireTrackAccess(user, m.trackId, 'editor');
	const type = kind === 'mp3' ? { ext: 'mp3', mime: 'audio/mpeg' } : { ext: 'wav', mime: 'audio/wav' };
	const stored = await storeTrackAudio(m.trackId, request.body, filename, type, { require: [kind] });
	const path = `/projects/${m.projectId}/tracks/${m.trackId}`;
	return json({
		ok: true,
		project: { id: m.projectId, name: m.projectName },
		track: { id: m.trackId, title: m.title },
		filename,
		duration: stored.duration,
		peaks: stored.peaks,
		url: config.publicUrl ? config.publicUrl + path : path
	});
}
