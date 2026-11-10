import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { defined, nullableStr, optStr, readJson } from '#lib/server/http.ts';
import { deleteImage } from '#lib/server/images.ts';
import { audioPath } from '#lib/server/audio.ts';

export async function PATCH({ params, request, locals }) {
	const body = await readJson(request);
	const needsOwner = body.discordWebhookUrl !== undefined;
	requireProjectAccess(locals.user, params.id, needsOwner ? 'owner' : 'editor');

	const statusId = nullableStr(body.statusId, 'Status');
	if (statusId) {
		const s = db.select().from(schema.statuses).where(and(eq(schema.statuses.id, statusId), eq(schema.statuses.scope, 'project'))).get();
		if (!s) error(400, 'Unknown status');
	}
	const webhook = nullableStr(body.discordWebhookUrl, 'Webhook URL', { max: 500 });
	if (webhook && !/^https:\/\/(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\//.test(webhook)) {
		error(400, 'That does not look like a Discord webhook URL');
	}
	const coverInspirationId = nullableStr(body.coverInspirationId, 'Cover');
	const update = defined({
		name: optStr(body.name, 'Name', { max: 120 }),
		description: optStr(body.description, 'Description', { max: 5000 }),
		statusId,
		discordWebhookUrl: webhook,
		coverInspirationId
	});
	if (update.name === '') error(400, 'Name is required');

	// Pinning an inspiration as cover replaces any uploaded cover.
	if (coverInspirationId !== undefined) {
		const p = db.select().from(schema.projects).where(eq(schema.projects.id, params.id)).get();
		await deleteImage(p?.coverFull);
		await deleteImage(p?.coverBackdrop);
		Object.assign(update, { coverFull: null, coverBackdrop: null });
	}
	if (Object.keys(update).length) {
		db.update(schema.projects).set(update).where(eq(schema.projects.id, params.id)).run();
	}
	return json({ ok: true });
}

export async function DELETE({ params, locals }) {
	requireProjectAccess(locals.user, params.id, 'owner');
	const p = db.select().from(schema.projects).where(eq(schema.projects.id, params.id)).get();
	const insp = db.select().from(schema.inspirations).where(eq(schema.inspirations.projectId, params.id)).all();
	const audio = db
		.select({ path: schema.audioFiles.path })
		.from(schema.audioFiles)
		.innerJoin(schema.tracks, eq(schema.tracks.id, schema.audioFiles.trackId))
		.where(eq(schema.tracks.projectId, params.id))
		.all();
	db.delete(schema.projects).where(eq(schema.projects.id, params.id)).run();
	// Remove files after the rows are gone.
	await deleteImage(p?.coverFull);
	await deleteImage(p?.coverBackdrop);
	for (const i of insp) {
		const d = i.data as { file?: string; thumb?: string };
		await deleteImage(d.file);
		await deleteImage(d.thumb);
	}
	for (const a of audio) await fs.rm(audioPath(a.path), { force: true });
	return json({ ok: true });
}
