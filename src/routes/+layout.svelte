<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';
	import type { LayoutServerData } from './$types';

	let { data, children }: { data: LayoutServerData; children: Snippet } = $props();
	let isAuthRoute = $derived(page.url.pathname.startsWith('/auth'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<header class="app-header">
		<div class="app-header-shell">
			<a class="app-brand" href={resolve('/')}>pixlvl</a>

			<nav class="app-nav" aria-label="Primary">
				<a class="app-nav-link" href={resolve('/')}>Main</a>
				<a class="app-nav-link" href={resolve('/campaigns')}>Play</a>
				<a class="app-nav-link" href={resolve('/shop')}>Shop</a>
				{#if data.user && data.session}
					<a class="app-nav-link" href={resolve('/dashboard')}>Dashboard</a>
				{:else}
					<a class="app-nav-link" href={resolve('/auth/login')}>Profile</a>
				{/if}
			</nav>

			<div class="app-session">
				{#if data.user && data.session}
					<p class="app-user">{data.user.name || data.user.email}</p>
				{:else if !isAuthRoute}
					<form method="get" action={resolve('/auth/login')}>
						<input type="hidden" name="next" value={`${page.url.pathname}${page.url.search}`} />
						<button class="app-session-button" type="submit">Sign in</button>
					</form>
				{/if}
			</div>
		</div>
	</header>

	<div class="app-content">
		{@render children()}
	</div>
</div>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		min-height: 100%;
	}

	:global(html) {
		height: 100%;
		background: #020202;
	}

	:global(body) {
		height: 100%;
		background: #020202;
		color: #f5f5f5;
		font-family: 'IBM Plex Sans', 'Avenir Next', sans-serif;
	}

	.app-shell {
		height: 100dvh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.app-content {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.app-header {
		position: sticky;
		top: 0;
		z-index: 60;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		background:
			linear-gradient(180deg, rgba(6, 6, 6, 0.96), rgba(6, 6, 6, 0.9)),
			radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 30%);
		backdrop-filter: blur(14px);
	}

	.app-header-shell {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.9rem 1rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.app-brand,
	.app-nav-link,
	.app-session-button,
	.app-user {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.5rem;
		border-radius: 999px;
		font: inherit;
		font-size: 0.88rem;
		font-weight: 600;
	}

	.app-brand {
		padding: 0 0.9rem;
		text-decoration: none;
		color: #f5f5f5;
		font-size: 1rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.app-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.65rem;
	}

	.app-nav-link,
	.app-session-button,
	.app-user {
		padding: 0 1rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: #f5f5f5;
	}

	.app-nav-link {
		text-decoration: none;
	}

	.app-session {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.65rem;
		align-items: center;
	}

	.app-session form,
	.app-user {
		margin: 0;
	}

	.app-session-button {
		cursor: pointer;
		background: #f5f5f5;
		color: #050505;
	}

	@media (max-width: 640px) {
		.app-header-shell {
			padding: 0.75rem 0.8rem;
			gap: 0.7rem;
			align-items: flex-start;
		}

		.app-nav,
		.app-session {
			width: 100%;
			justify-content: flex-start;
		}

		.app-nav {
			flex-wrap: nowrap;
			overflow-x: auto;
			scrollbar-width: none;
			padding-bottom: 0.1rem;
		}

		.app-nav::-webkit-scrollbar {
			display: none;
		}

		.app-brand,
		.app-nav-link,
		.app-session-button,
		.app-user {
			min-height: 2.15rem;
			font-size: 0.8rem;
		}

		.app-nav-link,
		.app-session-button,
		.app-user {
			padding: 0 0.8rem;
			white-space: nowrap;
		}

		.app-user {
			max-width: 100%;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	@media (max-width: 480px) {
		.app-header-shell {
			padding: 0.6rem 0.65rem;
			gap: 0.55rem;
		}

		.app-brand,
		.app-nav-link,
		.app-session-button,
		.app-user {
			min-height: 1.95rem;
			font-size: 0.74rem;
		}

		.app-brand {
			padding: 0 0.7rem;
			font-size: 0.86rem;
			letter-spacing: 0.1em;
		}

		.app-nav {
			gap: 0.45rem;
		}

		.app-nav-link,
		.app-session-button,
		.app-user {
			padding: 0 0.68rem;
		}
	}
</style>
