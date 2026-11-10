export type Role = 'owner' | 'editor' | 'viewer';

const rank: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 };

/** True when `actual` meets or exceeds `needed`. */
export function roleAllows(actual: Role | null | undefined, needed: Role) {
	return actual != null && rank[actual] >= rank[needed];
}
