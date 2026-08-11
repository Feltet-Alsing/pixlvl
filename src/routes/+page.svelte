<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageServerData } from './$types';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { pulseSketch } from '$lib/p5/pulse-sketch';

	let { data }: { data: PageServerData } = $props();

	const loginHref = resolve('/auth/login');
	const dashboardHref = resolve('/dashboard');
</script>

<svelte:head>
	<title>pixlvl</title>
</svelte:head>

<div class="page">
	<section class="shell">
		<div class="card copy">
			<p class="eyebrow">pixlvl</p>
			<h1>Generative motion studies with a lightweight auth flow.</h1>

			{#if data.user && data.session}
				<p class="lede">
					Signed in as <strong>{data.user.name || data.user.email}</strong>.
				</p>
				<p class="status">Session active</p>
				<div class="actions">
					<a class="primary" href={dashboardHref}>Open dashboard</a>
					<form method="post" action="?/signOut">
						<button type="submit" class="secondary">Sign out</button>
					</form>
				</div>
			{:else}
				<p class="lede">
					pixlvl pairs a compact SvelteKit app with a live p5 sketch for experimenting with visual
					systems and authenticated tools.
				</p>
				<div class="actions">
					<a class="primary" href={loginHref}>Sign in to continue</a>
				</div>
			{/if}
		</div>

		<div class="card canvas-panel">
			<div class="canvas-copy">
				<h2>Live sketch</h2>
				<p>The landing page keeps the current pulse study in view as part of the front page.</p>
			</div>
			<P5Canvas class="canvas-frame" sketch={pulseSketch} />
		</div>
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f8f5ef;
		color: #111827;
		font-family: 'IBM Plex Sans', 'Avenir Next', sans-serif;
	}

	.page {
		min-height: 100vh;
		padding: 2rem;
		display: grid;
		place-items: center;
	}

	.shell {
		width: min(100%, 72rem);
		display: grid;
		gap: 1.25rem;
		grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
		align-items: stretch;
	}

	.card {
		background: rgba(255, 255, 255, 0.82);
		border: 1px solid rgba(148, 163, 184, 0.28);
		border-radius: 1.25rem;
		box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
		backdrop-filter: blur(12px);
	}

	.copy {
		padding: 2rem;
		display: grid;
		align-content: center;
		gap: 1rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #475569;
	}

	h1,
	h2,
	.lede,
	.status,
	.canvas-copy p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2rem, 4vw, 3.4rem);
		line-height: 0.98;
		max-width: 12ch;
	}

	.lede,
	.canvas-copy p {
		font-size: 1rem;
		line-height: 1.6;
		color: #475569;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		width: fit-content;
		padding: 0.45rem 0.75rem;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.1);
		color: #1d4ed8;
		font-weight: 600;
	}

	.status::before {
		content: '';
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: currentColor;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
		align-items: center;
	}

	.actions form {
		margin: 0;
	}

	a,
	button {
		font: inherit;
	}

	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.9rem;
		padding: 0.8rem 1.1rem;
		border-radius: 999px;
		font-weight: 600;
		text-decoration: none;
	}

	.primary {
		background: #111827;
		color: #ffffff;
	}

	.secondary {
		border: 1px solid rgba(15, 23, 42, 0.14);
		background: #ffffff;
		color: #111827;
		cursor: pointer;
	}

	.canvas-panel {
		padding: 1rem;
		display: grid;
		gap: 0.9rem;
	}

	.canvas-copy {
		padding: 0.75rem 0.75rem 0;
		display: grid;
		gap: 0.35rem;
	}

	h2 {
		font-size: 1rem;
	}

	:global(.canvas-frame) {
		overflow: hidden;
		border-radius: 1rem;
		border: 1px solid rgba(148, 163, 184, 0.24);
		background: #f4f1eb;
	}

	:global(.canvas-frame canvas) {
		display: block;
		width: 100%;
		height: auto;
	}

	@media (max-width: 860px) {
		.page {
			padding: 1rem;
		}

		.shell {
			grid-template-columns: 1fr;
		}

		.copy {
			padding: 1.5rem;
		}
	}
</style>
