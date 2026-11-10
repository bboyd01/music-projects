import { json } from '@sveltejs/kit';
import { db, schema } from '#lib/server/db/index.ts';

export function GET() {
	db.select({ id: schema.statuses.id }).from(schema.statuses).limit(1).all();
	return json({ ok: true });
}
