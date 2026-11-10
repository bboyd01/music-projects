<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Sign in · Music Projects</title></svelte:head>

<div class="flex min-h-dvh items-center justify-center p-6">
	<div class="enter w-full max-w-sm">
		<p class="eyebrow mb-3 text-center">Music Projects</p>
		<h1 class="serif mb-8 text-center text-4xl">Welcome back</h1>
		<form
			method="POST"
			class="glass-blur space-y-3 rounded-2xl p-5"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update();
					busy = false;
				};
			}}
		>
			<label class="block">
				<span class="mb-1.5 block text-[12px] text-fg-2">Email</span>
				<input class="input h-10" type="email" name="email" autocomplete="email" required value={form?.email ?? ''} />
			</label>
			<label class="block">
				<span class="mb-1.5 block text-[12px] text-fg-2">Password</span>
				<input class="input h-10" type="password" name="password" autocomplete="current-password" required />
			</label>
			{#if form?.message}<p class="text-[13px] text-danger">{form.message}</p>{/if}
			<button class="btn btn-primary h-10 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
		</form>
		{#if data.noUsers}
			<p class="mt-4 text-center text-[12px] text-fg-3">
				No accounts yet. Set <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> and restart to create the first admin.
			</p>
		{/if}
	</div>
</div>
