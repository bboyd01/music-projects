<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Download from '@lucide/svelte/icons/download';
	import { api } from '#lib/api.ts';
	import { relativeTime } from '#lib/time.ts';

	type Token = { id: string; name: string; createdAt: number; lastUsedAt: number | null };
	let { tokens }: { tokens: Token[] } = $props();

	const origin = $derived(page.url.origin);
	const scriptName = 'Music Projects - Render region and upload.lua';
	const scriptUrl = `/reascripts/${encodeURIComponent(scriptName)}`;
	const curlExample = $derived(
		`curl -X POST -H "Authorization: Bearer mp_…" -H "Content-Type: audio/mpeg" \\\n  --data-binary @"New Sketch 14.mp3" \\\n  "${origin}/api/v1/audio?filename=New%20Sketch%2014.mp3"`
	);

	let name = $state('REAPER');
	let created = $state<{ name: string; token: string } | null>(null);
	let copied = $state('');

	async function create() {
		const r = await api<{ id: string; name: string; token: string }>('POST', '/api/me/tokens', { name: name.trim() || 'REAPER' });
		created = { name: r.name, token: r.token };
		await invalidateAll();
	}

	async function copy(text: string, what: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = what;
			setTimeout(() => (copied = ''), 1600);
		} catch {
			/* the text is selectable */
		}
	}

	// Two-tap revoke, like comment delete.
	let armed = $state<string | null>(null);
	let disarm: ReturnType<typeof setTimeout> | undefined;
	async function revoke(t: Token) {
		clearTimeout(disarm);
		if (armed !== t.id) {
			armed = t.id;
			disarm = setTimeout(() => (armed = null), 5000);
			return;
		}
		armed = null;
		await api('DELETE', `/api/me/tokens/${t.id}`);
		await invalidateAll();
	}
</script>

<section class="card enter p-5">
	<h2 class="serif mb-1 text-2xl">API & REAPER</h2>
	<p class="mb-4 text-[13.5px] text-fg-3">
		Upload renders straight from REAPER (or any script). A file named like a track — e.g. “New Sketch 14.mp3” — replaces that track’s audio.
	</p>

	<div class="space-y-5">
		<div>
			<h3 class="mb-2 text-[14px] font-medium">API tokens</h3>
			{#if created}
				<div class="mb-3 rounded-xl border border-accent/40 bg-accent-soft p-3">
					<p class="mb-1.5 text-[13.5px] text-fg">Copy “{created.name}” now — it won’t be shown again.</p>
					<div class="flex items-stretch gap-2">
						<code class="min-w-0 flex-1 overflow-x-auto rounded-lg bg-[var(--glass-solid)] px-3 py-2 font-mono text-[13px] whitespace-nowrap">{created.token}</code>
						<button class="btn btn-outline h-auto" onclick={() => copy(created!.token, 'token')}>{copied === 'token' ? 'Copied' : 'Copy'}</button>
					</div>
				</div>
			{/if}
			{#if tokens.length}
				<ul class="mb-3 divide-y divide-line">
					{#each tokens as t (t.id)}
						{@const isArmed = armed === t.id}
						<li class="flex items-center gap-3 py-2">
							<KeyRound size={15} class="shrink-0 text-fg-3" />
							<div class="min-w-0 flex-1 leading-tight">
								<p class="truncate text-[14px] font-medium">{t.name}</p>
								<p class="text-[13px] text-fg-3">Created {relativeTime(t.createdAt)} · {t.lastUsedAt ? `last used ${relativeTime(t.lastUsedAt)}` : 'never used'}</p>
							</div>
							{#if isArmed}<span class="text-[12.5px] text-danger">Tap again to revoke</span>{/if}
							<button
								type="button"
								class="icon-btn size-8 {isArmed ? '!text-danger bg-[color-mix(in_srgb,var(--danger)_16%,transparent)]' : 'hover:text-danger'}"
								aria-label={isArmed ? 'Tap again to revoke' : `Revoke ${t.name}`}
								onclick={() => revoke(t)}><Trash2 size={14} /></button
							>
						</li>
					{/each}
				</ul>
			{/if}
			<form
				class="flex flex-wrap gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					create();
				}}
			>
				<input class="input h-9 max-w-56" bind:value={name} placeholder="Token name" maxlength="60" aria-label="Token name" />
				<button class="btn btn-primary">Create token</button>
			</form>
		</div>

		<div>
			<h3 class="mb-1 text-[14px] font-medium">REAPER script</h3>
			<p class="mb-2 text-[13.5px] text-fg-3">Renders the region under the edit cursor and uploads it to the track named like your project.</p>
			<a class="btn btn-outline mb-2" href={scriptUrl} download={scriptName}><Download size={14} /> Download ReaScript</a>
			<ol class="list-decimal space-y-0.5 pl-5 text-[13.5px] text-fg-2">
				<li>In REAPER: Actions → Show action list → New action → Load ReaScript… and pick the file.</li>
				<li>File → Render…: choose MP3 (or WAV) once. Save it in your project template so new projects have it.</li>
				<li>Put the edit cursor in a region and run the action. The first time, enter <span class="font-mono">{origin}</span> and a token.</li>
			</ol>
		</div>

		<div>
			<h3 class="mb-1 text-[14px] font-medium">Other tools</h3>
			<p class="mb-2 text-[13.5px] text-fg-3">
				POST the raw file (WAV or MP3) to <span class="font-mono">/api/v1/audio?filename=…</span>. Add <span class="font-mono">&amp;project=…</span> if the same track name exists in several projects.
			</p>
			<div class="flex items-stretch gap-2">
				<pre class="min-w-0 flex-1 overflow-x-auto rounded-lg bg-[var(--glass-solid)] px-3 py-2 font-mono text-[12.5px] leading-relaxed">{curlExample}</pre>
				<button class="btn btn-outline h-auto" onclick={() => copy(curlExample.replace(/\\\n\s+/g, ''), 'curl')}>{copied === 'curl' ? 'Copied' : 'Copy'}</button>
			</div>
		</div>
	</div>
</section>
