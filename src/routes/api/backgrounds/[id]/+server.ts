import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireAdmin } from '#lib/server/access.ts';
import { deleteImage } from '#lib/server/images.ts';
import { getBackgroundSetting, setBackgroundSetting } from '#lib/server/backgrounds.ts';

/** Delete an uploaded background; if it was selected, fall back to Random. */
export async function DELETE({ params, locals }) {
	requireAdmin(locals.user);
	const b = db.select().from(schema.backgrounds).where(eq(schema.backgrounds.id, params.id)).get();
	if (!b) error(404, 'Background not found');
	db.delete(schema.backgrounds).where(eq(schema.backgrounds.id, b.id)).run();
	const s = getBackgroundSetting();
	if (s.mode === 'fixed' && s.id === b.id) setBackgroundSetting({ mode: 'random' });
	await deleteImage(b.full);
	await deleteImage(b.backdrop);
	return json({ ok: true });
}
