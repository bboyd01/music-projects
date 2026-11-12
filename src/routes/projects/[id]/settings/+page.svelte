<script lang="ts">
	import { autogrow } from '#lib/actions.ts';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Upload from '@lucide/svelte/icons/upload';
	import Check from '@lucide/svelte/icons/check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import X from '@lucide/svelte/icons/x';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import { api, uploadWithProgress } from '#lib/api.ts';
	import { toast } from '#lib/state/ui.svelte.ts';
	import { player } from '#lib/state/player.svelte.ts';
	import StatusSelect from '#lib/components/StatusSelect.svelte';

	let { data } = $props();
	const isOwner = $derived(data.role === 'owner');
	const canEdit = $derived(data.role !== 'viewer');
	const me = $derived(page.data.user!);
	const pid = $derived(data.project.id);

	let description = $state('');
	let webhook = $state('');
	$effect(() => {
		description = data.project.description;
		webhook = data.project.discordWebhookUrl ?? '';
	});

	let coverInput = $state<HTMLInputElement>()!;
	let uploading = $state(false);
	let handle = $state('');
	let newRole = $state<'editor' | 'viewer' | 'owner'>('editor');

	const coverMode = $derived(data.project.hasUploadedCover ? 'upload' : data.project.coverInspirationId ? 'pinned' : 'auto');

	async function patch(p: Record<string, unknown>, msg?: string) {
		await api('PATCH', `/api/projects/${pid}`, p);
		if (msg) toast(msg);
		invalidateAll();
	}

	async function uploadCover(file: File | undefined) {
		if (!file) return;
		uploading = true;
		const form = new FormData();
		form.append('file', file);
		try {
			await uploadWithProgress('POST', `/api/projects/${pid}/cover`, form, {}, () => {});
			toast('Cover updated');
			invalidateAll();
		} catch {
			/* toast shown */
		} finally {
			uploading = false;
			coverInput.value = '';
		}
	}

	async function clearCover() {
		await api('DELETE', `/api/projects/${pid}/cover`);
		invalidateAll();
	}

	async function addMember() {
		if (!handle.trim()) return;
		await api('POST', `/api/projects/${pid}/members`, { handle: handle.trim(), role: newRole });
		handle = '';
		toast('Member added');
		invalidateAll();
	}
	async function setRole(userId: string, role: string) {
		await api('POST', `/api/projects/${pid}/members`, { userId, role });
		invalidateAll();
	}
	async function removeMember(userId: string, name: string) {
		const self = userId === me.id;
		if (!confirm(self ? 'Leave this project?' : `Remove ${name} from this project?`)) return;
		await api('DELETE', `/api/projects/${pid}/members?userId=${userId}`);
		if (self) {
			await goto('/projects');
			invalidateAll();
		} else invalidateAll();
	}

	async function del() {
		const typed = prompt(`This deletes “${data.project.name}”, its tracks, audio, comments and inspirations. Type the project name to confirm:`);
		if (typed?.trim() !== data.project.name) return;
		await api('DELETE', `/api/projects/${pid}`);
		if (player.project?.id === pid) player.stop();
		await goto('/projects');
		invalidateAll();
	}
</script>

<div class="max-w-3xl space-y-6">
	<section class="card p-5">
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 class="serif text-2xl">About</h2>
			<StatusSelect scope="project" value={data.project.statusId} disabled={!canEdit} onchange={(statusId) => patch({ statusId })} />
		</div>
		<textarea
			class="input min-h-20"
			use:autogrow={description}
			placeholder="What is this project? Brief, client, deadline, notes…"
			bind:value={description}
			disabled={!canEdit}
			onblur={() => description !== data.project.description && patch({ description }, 'Saved')}
		></textarea>
	</section>

	<section class="card p-5">
		<h2 class="serif mb-1 text-2xl">Cover & background</h2>
		<p class="mb-4 text-[13.5px] text-fg-3">
			Shown blurred behind the project and in the fullscreen player.
			{coverMode === 'auto' ? 'Currently automatic: the first image inspiration, or a default backdrop.' : coverMode === 'pinned' ? 'Pinned to an image inspiration.' : 'Using an uploaded cover.'}
		</p>
		<div class="flex flex-wrap items-start gap-4">
			<img src={data.backdrop.full} alt="Current cover" class="h-28 w-44 rounded-xl border border-line object-cover" />
			{#if canEdit}
				<div class="flex flex-col gap-2">
					<input bind:this={coverInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="hidden" onchange={(e) => uploadCover(e.currentTarget.files?.[0])} />
					<button class="btn btn-outline" disabled={uploading} onclick={() => coverInput.click()}><Upload size={14} /> {uploading ? 'Uploading…' : 'Upload cover'}</button>
					{#if coverMode !== 'auto'}
						<button class="btn btn-ghost" onclick={clearCover}><Sparkles size={14} /> Back to automatic</button>
					{/if}
				</div>
			{/if}
		</div>
		{#if canEdit && data.images.length}
			<p class="eyebrow mt-5 mb-2">Or pin an image inspiration</p>
			<div class="flex flex-wrap gap-2">
				{#each data.images as img (img.id)}
					{@const active = data.project.coverInspirationId === img.id}
					<button
						class="relative size-16 overflow-hidden rounded-lg border-2 {active ? 'border-accent' : 'border-transparent hover:border-line-strong'}"
						aria-label="Use as cover"
						aria-pressed={active}
						onclick={() => patch({ coverInspirationId: img.id }, 'Cover pinned')}
					>
						<img src={img.url} alt="" class="h-full w-full object-cover" />
						{#if active}<span class="absolute right-1 bottom-1 flex size-4 items-center justify-center rounded-full bg-accent text-on-accent"><Check size={10} strokeWidth={3} /></span>{/if}
					</button>
				{/each}
			</div>
		{/if}
	</section>

	<section class="card p-5">
		<h2 class="serif mb-4 text-2xl">Members</h2>
		<ul class="mb-4 divide-y divide-line">
			{#each data.members as m (m.id)}
				<li class="flex items-center gap-3 py-2.5">
					<span class="flex size-8 items-center justify-center rounded-full bg-hover text-[13px] font-semibold">{m.name[0]?.toUpperCase()}</span>
					<div class="min-w-0 flex-1 leading-tight">
						<p class="truncate font-medium">{m.name}{m.id === me.id ? ' (you)' : ''}</p>
						<p class="truncate text-[13px] text-fg-3">@{m.username}</p>
					</div>
					{#if isOwner}
						<select class="input h-8 w-auto" value={m.role} onchange={(e) => setRole(m.id, e.currentTarget.value)} aria-label="Role for {m.name}">
							<option value="owner">Owner</option>
							<option value="editor">Editor</option>
							<option value="viewer">Viewer</option>
						</select>
					{:else}
						<span class="chip capitalize">{m.role}</span>
					{/if}
					{#if isOwner || m.id === me.id}
						<button class="icon-btn hover:text-danger" title={m.id === me.id ? 'Leave project' : 'Remove'} aria-label="Remove {m.name}" onclick={() => removeMember(m.id, m.name)}><X size={15} /></button>
					{/if}
				</li>
			{/each}
		</ul>
		{#if isOwner}
			<form
				class="flex flex-wrap gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					addMember();
				}}
			>
				<input class="input h-9 min-w-48 flex-1" placeholder="Username or email" bind:value={handle} />
				<select class="input h-9 w-auto" bind:value={newRole} aria-label="Role">
					<option value="editor">Editor</option>
					<option value="viewer">Viewer (can comment)</option>
					<option value="owner">Owner</option>
				</select>
				<button class="btn btn-primary" disabled={!handle.trim()}><UserPlus size={14} /> Add</button>
			</form>
			<p class="mt-2 text-[13px] text-fg-3">Editors can change tracks and todos. Viewers can listen and comment.</p>
		{/if}
	</section>

	{#if isOwner}
		<section class="card p-5">
			<h2 class="serif mb-1 text-2xl">Discord</h2>
			<p class="mb-3 text-[13.5px] text-fg-3">
				New comments are posted to this channel webhook (Discord → Channel settings → Integrations → Webhooks). People who set their Discord user ID get pinged when @mentioned.
			</p>
			<form
				class="flex flex-wrap gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					patch({ discordWebhookUrl: webhook.trim() || null }, webhook.trim() ? 'Webhook saved' : 'Webhook removed');
				}}
			>
				<input class="input h-9 min-w-64 flex-1" type="url" placeholder="https://discord.com/api/webhooks/…" bind:value={webhook} />
				<button class="btn btn-outline">Save</button>
			</form>
		</section>

		<section class="card border-danger/30 p-5">
			<h2 class="serif mb-1 text-2xl">Delete project</h2>
			<p class="mb-3 text-[13.5px] text-fg-3">Permanently removes all tracks, audio files, comments, todos and inspirations.</p>
			<button class="btn btn-danger border border-current/30" onclick={del}>Delete project…</button>
		</section>
	{/if}
</div>
