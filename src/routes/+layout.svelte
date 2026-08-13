<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';
	import type { LayoutServerData } from './$types';

	let { data, children }: { data: LayoutServerData; children: Snippet } = $props();
	let currentPath = $derived(`${page.url.pathname}${page.url.search}`);
	let isAuthRoute = $derived(page.url.pathname.startsWith('/auth'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<div class="app-auth-bar">
		<a class="app-link ghost" href={resolve('/')}>Home</a>
		<a class="app-link ghost" href={resolve('/campaigns')}>Campaigns</a>

		{#if data.user && data.session}
			<a class="app-link ghost" href={resolve('/dashboard')}>Dashboard</a>
			<p class="app-user">{data.user.name || data.user.email}</p>
			<form method="post" action={resolve('/auth/logout')}>
				<input type="hidden" name="next" value={currentPath} />
				<button class="app-link solid" type="submit">Log out</button>
			</form>
		{:else if !isAuthRoute}
			<form method="get" action={resolve('/auth/login')}>
				<input type="hidden" name="next" value={currentPath} />
				<button class="app-link solid" type="submit">Sign in</button>
			</form>
		{/if}
	</div>

	{@render children()}
</div>

<style>
	.app-shell {
		min-height: 100vh;
	}

	.app-auth-bar {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 50;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.6rem;
		max-width: min(100vw - 2rem, 40rem);
	}

	.app-auth-bar form,
	.app-user {
		margin: 0;
	}

	.app-link,
	.app-user {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.35rem;
		padding: 0 0.9rem;
		border-radius: 999px;
		backdrop-filter: blur(10px);
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.app-link {
		border: 1px solid rgba(255, 255, 255, 0.14);
		text-decoration: none;
		cursor: pointer;
	}

	.app-link.ghost,
	.app-user {
		background: rgba(10, 10, 10, 0.72);
		color: #f5f5f5;
	}

	.app-link.solid {
		background: #f5f5f5;
		color: #050505;
	}

	@media (max-width: 640px) {
		.app-auth-bar {
			top: 0.75rem;
			right: 0.75rem;
			left: 0.75rem;
			max-width: none;
		}

		.app-user {
			width: 100%;
		}
	}
</style>
