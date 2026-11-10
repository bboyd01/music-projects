import { fail, redirect } from '@sveltejs/kit';
import { count, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { createSession, hashPassword, verifyPassword } from '#lib/server/auth.ts';

export function load({ locals }) {
	if (locals.user) redirect(303, '/projects');
	const [{ n }] = db.select({ n: count() }).from(schema.users).all();
	return { noUsers: n === 0 };
}

// Always run a real hash verify so response timing doesn't reveal which emails exist.
let dummyHash: Promise<string> | undefined;

export const actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');
		if (!email || !password) return fail(400, { email, message: 'Enter your email and password.' });

		const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
		dummyHash ??= hashPassword('not-a-real-password');
		const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash), password);
		if (!user || !ok) return fail(400, { email, message: 'That email and password don’t match.' });

		createSession(user.id, cookies, url.protocol === 'https:');
		const next = url.searchParams.get('next');
		redirect(303, next && next.startsWith('/') && !next.startsWith('//') ? next : '/projects');
	}
};
