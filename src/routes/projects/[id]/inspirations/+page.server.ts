import { redirect } from '@sveltejs/kit';

/** The canvas now lives on the project page; keep old links working. */
export function load({ params }) {
	redirect(308, `/projects/${params.id}#inspirations`);
}
