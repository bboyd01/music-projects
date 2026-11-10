import type { SafeUser } from '#lib/server/auth.ts';

declare global {
	namespace App {
		interface Locals {
			user: SafeUser | null;
		}
		// interface PageState {}
	}
}

export {};
