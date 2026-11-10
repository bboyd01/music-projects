import FolderKanban from '@lucide/svelte/icons/folder-kanban';
import Headphones from '@lucide/svelte/icons/headphones';
import MessageSquare from '@lucide/svelte/icons/message-square';
import Settings from '@lucide/svelte/icons/settings';

export const navItems = [
	{ href: '/projects', label: 'Projects', icon: FolderKanban },
	{ href: '/listen', label: 'Listen', icon: Headphones },
	{ href: '/comments', label: 'Comments', icon: MessageSquare },
	{ href: '/settings', label: 'Settings', icon: Settings }
];

export function isActive(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(href + '/');
}
