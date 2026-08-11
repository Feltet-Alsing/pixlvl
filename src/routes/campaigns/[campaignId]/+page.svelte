<script lang="ts">
	import { resolve } from '$app/paths';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { createCampaignSketch } from '$lib/p5/campaign-1-sketch';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let persistedPixlState = $derived(data.gameState?.pixlState ?? null);
	const campaignSketch = createCampaignSketch(data.campaign, data.combatProfile, {
		persistPath: '/api/game/state',
		pixlState: data.gameState?.pixlState ?? null,
		campaignState: data.campaignState ?? null
	});
</script>

<svelte:head>
	<title>Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="page">
	<section class="shell">
		<div class="topbar">
			<a class="back" href={resolve('/campaigns')}>All campaigns</a>
			<div class="meta">
				<p class="eyebrow">Campaign {data.campaign.campaign}</p>
				<p>
					{data.campaign.stages} stages · {data.campaign.totalLevels} levels · {data.campaign
						.combatProfile}
				</p>
			</div>
		</div>

		<div class="layout">
			<aside class="panel">
				<h1>Run surface</h1>
				<p class="lede">No intro copy here. This is the live campaign view.</p>
				<div class="stats">
					<div>
						<span>Pixl health</span>
						<strong>{persistedPixlState?.health ?? data.combatProfile.pixl.health}</strong>
					</div>
					<div>
						<span>Pixl damage</span>
						<strong>{persistedPixlState?.damage ?? data.combatProfile.pixl.damage}</strong>
					</div>
					<div>
						<span>Attack speed</span>
						<strong>
							{(persistedPixlState?.attackSpeed ?? data.combatProfile.pixl.attackSpeed).toFixed(
								1
							)}/s
						</strong>
					</div>
					<div>
						<span>{persistedPixlState ? 'Gold' : 'Projectile speed'}</span>
						<strong
							>{persistedPixlState
								? persistedPixlState.gold
								: data.combatProfile.projectileSpeed}</strong
						>
					</div>
					{#if data.campaignState}
						<div>
							<span>Saved progression</span>
							<strong>
								Level {data.campaignState.currentLevel} · cleared {data.campaignState
									.highestClearedLevel}
							</strong>
						</div>
					{/if}
				</div>
			</aside>

			<div class="canvas-panel">
				{#key data.campaignId}
					<P5Canvas class="canvas-frame" sketch={campaignSketch} />
				{/key}
			</div>
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
		padding: 1.5rem;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 28%), #020202;
	}

	.shell {
		width: min(100%, 82rem);
		margin: 0 auto;
		display: grid;
		gap: 1rem;
	}

	.topbar,
	.panel,
	.canvas-panel {
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.25rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
	}

	.topbar {
		padding: 1rem 1.25rem;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
	}

	.back {
		display: inline-flex;
		align-items: center;
		min-height: 2.7rem;
		padding: 0 1rem;
		border-radius: 999px;
		background: #ffffff;
		color: #020202;
		text-decoration: none;
		font-weight: 600;
	}

	.layout {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(18rem, 22rem) minmax(0, 1fr);
	}

	.panel {
		padding: 1.5rem;
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	.canvas-panel {
		padding: 1rem;
	}

	.eyebrow,
	p,
	h1,
	span,
	strong {
		margin: 0;
	}

	.eyebrow,
	.stats span {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #a3a3a3;
	}

	.topbar p:last-child,
	.lede {
		color: #c4c4c4;
	}

	h1 {
		font-size: 1.8rem;
	}

	.stats {
		display: grid;
		gap: 0.85rem;
	}

	.stats div {
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		gap: 0.35rem;
	}

	.stats strong {
		font-size: 1.15rem;
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

		.topbar,
		.layout {
			grid-template-columns: 1fr;
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
