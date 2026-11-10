import type { SafeUser } from '#lib/server/auth.ts';

declare global {
	namespace App {
		interface Locals {
			user: SafeUser | null;
			/** How this request was authenticated. */
			authVia: 'session' | 'token' | null;
		}
		// interface PageState {}
	}
}

export {};
