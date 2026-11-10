import { error, json } from '@sveltejs/kit';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireAdmin } from '#lib/server/access.ts';
import { saveCover } from '#lib/server/images.ts';
import { setBackgroundSetting } from '#lib/server/backgrounds.ts';

/** Upload a background (compressed like covers) and make it the global background. */
export async function POST({ request, locals }) {
	const admin = requireAdmin(locals.user);
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'No file uploaded');
	const { full, backdrop } = await saveCover(Buffer.from(await file.arrayBuffer()));
	const id = newId();
	db.insert(schema.backgrounds).values({ id, full: full.file, backdrop: backdrop.file, uploadedBy: admin.id, createdAt: Date.now() }).run();
	setBackgroundSetting({ mode: 'fixed', id });
	return json({ id }, { status: 201 });
}
