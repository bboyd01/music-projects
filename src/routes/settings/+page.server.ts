import { fail } from '@sveltejs/kit';
import { and, asc, eq, ne, or } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { destroyUserSessions, hashPassword, verifyPassword } from '#lib/server/auth.ts';
import { requireAdmin } from '#lib/server/access.ts';

export function load({ locals }) {
	const me = locals.user!;
	return {
		users: me.isAdmin
			? db
					.select({
						id: schema.users.id,
						name: schema.users.name,
						email: schema.users.email,
						username: schema.users.username,
						isAdmin: schema.users.isAdmin
					})
					.from(schema.users)
					.orderBy(asc(schema.users.name))
					.all()
			: [],
		globalWebhook: !!process.env.DISCORD_WEBHOOK_URL
	};
}

const USERNAME = /^[a-z0-9_]{2,32}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(form: FormData, key: string) {
	return String(form.get(key) ?? '').trim();
}

export const actions = {
	profile: async ({ request, locals }) => {
		const me = locals.user!;
		const form = await request.formData();
		const name = field(form, 'name');
		const username = field(form, 'username').toLowerCase().replace(/^@/, '');
		const email = field(form, 'email').toLowerCase();
		const discordUserId = field(form, 'discordUserId');
		if (!name) return fail(400, { section: 'profile', message: 'Name is required' });
		if (!USERNAME.test(username)) return fail(400, { section: 'profile', message: 'Username: 2–32 lowercase letters, numbers or _' });
		if (!EMAIL.test(email)) return fail(400, { section: 'profile', message: 'Enter a valid email' });
		if (discordUserId && !/^\d{15,22}$/.test(discordUserId)) {
			return fail(400, { section: 'profile', message: 'Discord user ID is a long number (enable Developer Mode → Copy User ID)' });
		}
		const clash = db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(and(eq(schema.users.email, email), ne(schema.users.id, me.id)))
			.get();
		if (clash) return fail(400, { section: 'profile', message: 'That email is already used' });
		const taken = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, username)).get();
		if (taken && taken.id !== me.id) return fail(400, { section: 'profile', message: 'That username is taken' });
		db.update(schema.users)
			.set({ name, username, email, discordUserId: discordUserId || null })
			.where(eq(schema.users.id, me.id))
			.run();
		return { section: 'profile', ok: 'Profile saved' };
	},

	password: async ({ request, locals }) => {
		const me = locals.user!;
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const row = db.select().from(schema.users).where(eq(schema.users.id, me.id)).get()!;
		if (!(await verifyPassword(row.passwordHash, current))) return fail(400, { section: 'password', message: 'Current password is wrong' });
		if (next.length < 8) return fail(400, { section: 'password', message: 'Use at least 8 characters' });
		db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, me.id)).run();
		return { section: 'password', ok: 'Password changed' };
	},

	createUser: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const name = field(form, 'name');
		const email = field(form, 'email').toLowerCase();
		const username = field(form, 'username').toLowerCase().replace(/^@/, '');
		const password = String(form.get('password') ?? '');
		if (!name || !EMAIL.test(email)) return fail(400, { section: 'users', message: 'Name and a valid email are required' });
		if (!USERNAME.test(username)) return fail(400, { section: 'users', message: 'Username: 2–32 lowercase letters, numbers or _' });
		if (password.length < 8) return fail(400, { section: 'users', message: 'Password must be at least 8 characters' });
		const exists = db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(or(eq(schema.users.email, email), eq(schema.users.username, username)))
			.get();
		if (exists) return fail(400, { section: 'users', message: 'Email or username already exists' });
		db.insert(schema.users)
			.values({ id: newId(), name, email, username, passwordHash: await hashPassword(password), isAdmin: form.get('isAdmin') === 'on' })
			.run();
		return { section: 'users', ok: `Created ${name}. Add them to projects from each project’s Settings.` };
	},

	resetPassword: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const id = field(form, 'id');
		const password = String(form.get('password') ?? '');
		if (password.length < 8) return fail(400, { section: 'users', message: 'Password must be at least 8 characters' });
		db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, id)).run();
		destroyUserSessions(id);
		return { section: 'users', ok: 'Password reset; they’ve been signed out everywhere' };
	},

	deleteUser: async ({ request, locals }) => {
		const admin = requireAdmin(locals.user);
		const form = await request.formData();
		const id = field(form, 'id');
		if (id === admin.id) return fail(400, { section: 'users', message: 'You can’t delete yourself' });
		const owned = db
			.select({ id: schema.projects.id })
			.from(schema.projects)
			.where(eq(schema.projects.ownerId, id))
			.all();
		if (owned.length) {
			return fail(400, { section: 'users', message: 'This user created projects. Transfer or delete those first.' });
		}
		const authored = db.select({ id: schema.comments.id }).from(schema.comments).where(eq(schema.comments.authorId, id)).get();
		if (authored) return fail(400, { section: 'users', message: 'This user has comments; remove them from projects instead.' });
		db.delete(schema.users).where(eq(schema.users.id, id)).run();
		return { section: 'users', ok: 'User deleted' };
	}
};
