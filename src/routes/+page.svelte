<script lang="ts">
	import { resolve } from '$app/paths';
	import { baselineCombatProfile, campaigns } from '$lib/data';
	import type { PageServerData } from './$types';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { createPixlIntroSketch } from '$lib/p5/pixl-intro-sketch';

	let { data }: { data: PageServerData } = $props();

	const loginHref = resolve('/auth/login');
	const dashboardHref = resolve('/dashboard');
	const playHref = resolve('/campaigns');
	const campaignCount = Object.keys(campaigns).length;
	let persistedPixlState = $derived(data.gameState?.pixlState ?? null);
	const introSketch = (p: import('p5').default) =>
		createPixlIntroSketch({ pixlState: data.gameState?.pixlState ?? null })(p);
</script>

<svelte:head>
	<title>pixlvl</title>
</svelte:head>

<div class="page">
	<section class="shell">
		<div class="card copy">
			<p class="eyebrow">pixlvl</p>
			<h1>Pixl intro and baseline combat profile.</h1>
			<p class="lede">
				A clean intro surface for the `pixl` itself before stepping into a campaign run.
			</p>

			<div class="stats-grid">
				<div class="stat-tile">
					<span>Health</span>
					<strong>{persistedPixlState?.health ?? baselineCombatProfile.pixl.health}</strong>
				</div>
				<div class="stat-tile">
					<span>Attack speed</span>
					<strong>
						{(persistedPixlState?.attackSpeed ?? baselineCombatProfile.pixl.attackSpeed).toFixed(
							1
						)}/s
					</strong>
				</div>
				<div class="stat-tile">
					<span>Equipped</span>
					<strong>{persistedPixlState?.loadoutPlacements.length ?? 1}</strong>
				</div>
				<div class="stat-tile">
					<span>{persistedPixlState ? 'Level' : 'Campaigns'}</span>
					<strong>{persistedPixlState ? persistedPixlState.level : campaignCount}</strong>
				</div>
			</div>

			{#if data.user && data.session}
				<p class="lede">
					Signed in as <strong>{data.user.name || data.user.email}</strong>.
				</p>
				<p class="status">Session active</p>
				<div class="actions">
					<a class="primary" href={playHref}>Play</a>
					<a class="primary" href={dashboardHref}>Open dashboard</a>
					<form method="post" action="?/signOut">
						<button type="submit" class="secondary">Sign out</button>
					</form>
				</div>
			{:else}
				<p class="lede">
					This page showcases the base `pixl` loop without tying the preview to a full campaign run.
				</p>
				<div class="actions">
					<a class="primary" href={playHref}>Play</a>
					<a class="primary" href={loginHref}>Sign in to continue</a>
				</div>
			{/if}
		</div>

		<div class="card canvas-panel">
			<div class="canvas-copy">
				<h2>Pixl Preview</h2>
				<p>Centered white ring, red square shots, and looping placeholder glitches.</p>
			</div>
			<P5Canvas class="canvas-frame" sketch={introSketch} />
		</div>
	</section>
</div>

<style>
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

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.stat-tile {
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		gap: 0.35rem;
	}

	.stat-tile span {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #a3a3a3;
	}

	.stat-tile strong {
		font-size: 1.15rem;
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

		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
