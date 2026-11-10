<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { api } from '#lib/api.ts';
	import { setMotion, setTheme } from '#lib/state/ui.svelte.ts';
	import StatusManager from '#lib/components/settings/StatusManager.svelte';
	import type { Status } from '#lib/server/db/schema.ts';

	let { data, form } = $props();
	const me = $derived(page.data.user!);
	const statuses = $derived((page.data.statuses ?? []) as Status[]);
	const settings = $derived(me.settings ?? {});

	async function save(patch: Record<string, string>) {
		if (patch.theme) setTheme(patch.theme as 'system');
		if (patch.motion) setMotion(patch.motion as 'on');
		await api('PATCH', '/api/me/settings', patch);
		invalidateAll();
	}

	const themes = [
		{ value: 'system', label: 'System', icon: Monitor },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'light', label: 'Light', icon: Sun }
	];
	const motions = [
		{ value: 'on', label: 'On' },
		{ value: 'mobile-off', label: 'Off on mobile' },
		{ value: 'off', label: 'Off' }
	];
	const services = [
		{ value: 'apple', label: 'Apple Music' },
		{ value: 'spotify', label: 'Spotify' }
	];

	const fmtBytes = (b: number) =>
		b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : b < 1024 ** 3 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024 ** 3).toFixed(2)} GB`;

	const msg = (section: string) => (form?.section === section ? form : null);
	const submit = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<svelte:head><title>Settings · Music Projects</title></svelte:head>

{#snippet segmented(options: { value: string; label: string; icon?: typeof Monitor }[], value: string, onpick: (v: string) => void, label: string)}
	<div class="glass inline-flex flex-wrap rounded-lg p-0.5" role="radiogroup" aria-label={label}>
		{#each options as o (o.value)}
			<button
				type="button"
				role="radio"
				aria-checked={value === o.value}
				class="flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium {value === o.value ? 'bg-hover text-fg' : 'text-fg-3 hover:text-fg-2'}"
				onclick={() => onpick(o.value)}
			>
				{#if o.icon}<o.icon size={14} />{/if}{o.label}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet status(section: string)}
	{@const m = msg(section)}
	{#if m}
		<p class="text-[13px] {m.message ? 'text-danger' : 'text-fg-2'}">{m.message ?? m.ok}</p>
	{/if}
{/snippet}

<div class="mx-auto max-w-3xl px-4 pt-8 sm:px-8 md:pt-12">
	<header class="enter mb-8">
		<p class="eyebrow mb-2">Preferences</p>
		<h1 class="serif text-4xl sm:text-5xl">Settings</h1>
	</header>

	<div class="space-y-6">
		<section class="card enter p-5">
			<h2 class="serif mb-4 text-2xl">Appearance</h2>
			<div class="space-y-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p class="font-medium">Theme</p>
						<p class="text-[12.5px] text-fg-3">System follows your device.</p>
					</div>
					{@render segmented(themes, settings.theme ?? 'system', (v) => save({ theme: v }), 'Theme')}
				</div>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p class="font-medium">Animations</p>
						<p class="text-[12.5px] text-fg-3">Subtle motion on panels and views (130ms max).</p>
					</div>
					{@render segmented(motions, settings.motion ?? 'on', (v) => save({ motion: v }), 'Animations')}
				</div>
			</div>
		</section>

		<section class="card enter p-5">
			<h2 class="serif mb-4 text-2xl">Music links</h2>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p class="font-medium">Open audio inspirations in</p>
					<p class="text-[12.5px] text-fg-3">Falls back to a search when a direct link isn’t available.</p>
				</div>
				{@render segmented(services, settings.musicService ?? 'apple', (v) => save({ musicService: v }), 'Music service')}
			</div>
		</section>

		{#if me.readOnly}
			<section class="card enter p-5">
				<h2 class="serif mb-1 text-2xl">Read-only account</h2>
				<p class="text-[13px] text-fg-2">You can browse and listen to every project, but not change anything. Appearance and music-link settings above still apply to you.</p>
			</section>
		{:else}
		<section class="card enter p-5">
			<h2 class="serif mb-4 text-2xl">Profile</h2>
			<form method="POST" action="?/profile" class="grid gap-3 sm:grid-cols-2" use:enhance={submit}>
				<label class="block"><span class="mb-1 block text-[12px] text-fg-2">Name</span><input class="input" name="name" value={me.name} required /></label>
				<label class="block"><span class="mb-1 block text-[12px] text-fg-2">Username (for @mentions)</span><input class="input" name="username" value={me.username} required /></label>
				<label class="block"><span class="mb-1 block text-[12px] text-fg-2">Email</span><input class="input" type="email" name="email" value={me.email ?? ''} required /></label>
				<label class="block">
					<span class="mb-1 block text-[12px] text-fg-2">Discord user ID <span class="text-fg-3">(optional)</span></span>
					<input class="input" name="discordUserId" value={me.discordUserId ?? ''} inputmode="numeric" placeholder="Pings you on Discord when mentioned" />
				</label>
				<div class="flex items-center gap-3 sm:col-span-2">
					<button class="btn btn-primary">Save profile</button>
					{@render status('profile')}
				</div>
			</form>
		</section>

		<section class="card enter p-5">
			<h2 class="serif mb-4 text-2xl">Password</h2>
			<form method="POST" action="?/password" class="grid gap-3 sm:grid-cols-2" use:enhance>
				<label class="block"><span class="mb-1 block text-[12px] text-fg-2">Current password</span><input class="input" type="password" name="current" autocomplete="current-password" required /></label>
				<label class="block"><span class="mb-1 block text-[12px] text-fg-2">New password</span><input class="input" type="password" name="next" autocomplete="new-password" minlength="8" required /></label>
				<div class="flex items-center gap-3 sm:col-span-2">
					<button class="btn btn-outline">Change password</button>
					{@render status('password')}
				</div>
			</form>
		</section>
		{/if}

		{#if me.isAdmin}
			<section class="card enter p-5">
				<h2 class="serif mb-1 text-2xl">Statuses</h2>
				<p class="mb-4 text-[12.5px] text-fg-3">Shared by all projects. Colors come from a muted palette so everything stays harmonious.</p>
				<div class="grid gap-6 md:grid-cols-2">
					<div>
						<h3 class="eyebrow mb-2">Project statuses</h3>
						<StatusManager scope="project" {statuses} />
					</div>
					<div>
						<h3 class="eyebrow mb-2">Track statuses</h3>
						<StatusManager scope="track" {statuses} />
					</div>
				</div>
			</section>

			<section class="card enter p-5">
				<h2 class="serif mb-1 text-2xl">People</h2>
				<p class="mb-4 text-[12.5px] text-fg-3">Create accounts here, then add people to projects from each project’s Settings tab.</p>
				<ul class="mb-5 divide-y divide-line">
					{#each data.users as u (u.id)}
						<li class="flex flex-wrap items-center gap-3 py-2.5">
							<span class="flex size-8 items-center justify-center rounded-full bg-hover text-[12px] font-semibold">{u.name[0]?.toUpperCase()}</span>
							<div class="min-w-0 flex-1 leading-tight">
								<p class="truncate font-medium">
									{u.name}
									{#if u.isAdmin}<span class="chip ml-1 h-5 text-[11px]">Admin</span>{/if}
									{#if u.readOnly}<span class="chip ml-1 h-5 text-[11px]">Read-only</span>{/if}
								</p>
								<p class="truncate text-[12px] text-fg-3">@{u.username}{u.email ? ` · ${u.email}` : ''}{u.readOnly ? ' · password “test” · INCLUDE_TEST_USER' : ''}</p>
							</div>
							{#if u.id !== me.id && !u.readOnly}
								<form
									method="POST"
									action="?/resetPassword"
									use:enhance={({ formData, cancel }) => {
										const p = prompt(`New password for ${u.name} (min 8 characters):`);
										if (!p) return cancel();
										formData.set('password', p);
										return submit();
									}}
								>
									<input type="hidden" name="id" value={u.id} />
									<button class="icon-btn" title="Reset password" aria-label="Reset password for {u.name}"><KeyRound size={15} /></button>
								</form>
								<form
									method="POST"
									action="?/deleteUser"
									use:enhance={({ cancel }) => {
										if (!confirm(`Delete ${u.name}?`)) return cancel();
										return submit();
									}}
								>
									<input type="hidden" name="id" value={u.id} />
									<button class="icon-btn hover:text-danger" title="Delete user" aria-label="Delete {u.name}"><Trash2 size={15} /></button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
				<h3 class="eyebrow mb-2">Add a person</h3>
				<form method="POST" action="?/createUser" class="grid gap-3 sm:grid-cols-2" use:enhance>
					<input class="input" name="name" placeholder="Name" required />
					<input class="input" name="username" placeholder="username" required pattern="[a-z0-9_]{'{'}2,32{'}'}" />
					<input class="input" type="email" name="email" placeholder="Email" required />
					<input class="input" type="password" name="password" placeholder="Temporary password" minlength="8" required autocomplete="new-password" />
					<label class="flex items-center gap-2 text-[13px] text-fg-2"><input type="checkbox" name="isAdmin" class="accent-[var(--accent)]" /> Admin</label>
					<div class="flex items-center gap-3 sm:justify-end">
						{@render status('users')}
						<button class="btn btn-primary">Create account</button>
					</div>
				</form>
			</section>

			{#if data.storage}
				{@const s = data.storage}
				<section class="card enter p-5">
					<h2 class="serif mb-4 text-2xl">Storage</h2>
					<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{#each [{ label: 'Audio', bytes: s.audio.bytes, note: `${s.audio.files} ${s.audio.files === 1 ? 'file' : 'files'}` }, { label: 'Images', bytes: s.images.bytes, note: `${s.images.files} ${s.images.files === 1 ? 'file' : 'files'}` }, { label: 'Database', bytes: s.database, note: 'comments, todos…' }, { label: 'Total', bytes: s.audio.bytes + s.images.bytes + s.database, note: 'in /data' }] as row (row.label)}
							<div class="rounded-xl bg-hover p-3">
								<dt class="eyebrow mb-1">{row.label}</dt>
								<dd class="tabular text-xl font-semibold">{fmtBytes(row.bytes)}</dd>
								<dd class="text-[12px] text-fg-3">{row.note}</dd>
							</div>
						{/each}
					</dl>
				</section>
			{/if}

			<section class="card enter p-5">
				<h2 class="serif mb-1 text-2xl">Discord</h2>
				<p class="text-[13px] text-fg-2">
					New comments are posted to Discord through a webhook. Set one per project in its Settings tab{data.globalWebhook
						? '; the server-wide DISCORD_WEBHOOK_URL is used as a fallback.'
						: ', or set DISCORD_WEBHOOK_URL on the server as a fallback for all projects.'}
				</p>
			</section>
		{/if}

		<form method="POST" action="/logout" class="pb-4 md:hidden">
			<button class="btn btn-outline w-full"><LogOut size={15} /> Sign out</button>
		</form>
	</div>
</div>
