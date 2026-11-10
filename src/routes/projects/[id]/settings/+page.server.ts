import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { imageUrl } from '#lib/server/images.ts';
import type { ImageData } from '#lib/server/db/schema.ts';

export async function load({ params, parent }) {
	await parent();
	const images = db
		.select({ id: schema.inspirations.id, data: schema.inspirations.data })
		.from(schema.inspirations)
		.where(and(eq(schema.inspirations.projectId, params.id), eq(schema.inspirations.type, 'image')))
		.orderBy(asc(schema.inspirations.createdAt))
		.all()
		.map((i) => ({ id: i.id, url: imageUrl((i.data as ImageData).file)! }));
	return { images };
}
