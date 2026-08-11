<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageServerData } from './$types';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { campaign1Sketch } from '$lib/p5/campaign-1-sketch';

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
			<h1>Campaign 1 is now a live combat draft.</h1>

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
					The front page is now a first-pass `p5` combat preview: centered hollow `pixl`, red pixel
					shots, and placeholder `Glitches` running through `Campaign 1`.
				</p>
				<div class="actions">
					<a class="primary" href={loginHref}>Sign in to continue</a>
				</div>
			{/if}
		</div>

		<div class="card canvas-panel">
			<div class="canvas-copy">
				<h2>Campaign 1 Preview</h2>
				<p>Black field, white hollow `pixl`, red square shots, and temporary enemy silhouettes.</p>
			</div>
			<P5Canvas class="canvas-frame" sketch={campaign1Sketch} />
		</div>
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #020202;
		color: #f5f5f5;
		font-family: 'IBM Plex Sans', 'Avenir Next', sans-serif;
	}

	.page {
		min-height: 100vh;
		padding: 2rem;
		display: grid;
		place-items: center;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.06), transparent 30%), #020202;
	}

	.shell {
		width: min(100%, 72rem);
		display: grid;
		gap: 1.25rem;
		grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
		align-items: stretch;
	}

	.card {
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.25rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
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
		color: #a3a3a3;
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
		color: #c4c4c4;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		width: fit-content;
		padding: 0.45rem 0.75rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: #f5f5f5;
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
		background: #ffffff;
		color: #020202;
	}

	.secondary {
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: transparent;
		color: #f5f5f5;
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
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: #000000;
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
