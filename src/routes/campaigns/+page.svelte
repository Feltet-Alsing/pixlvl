<script lang="ts">
	import { resolve } from '$app/paths';
	import { campaigns } from '$lib/data';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const campaignList = Object.values(campaigns);
</script>

<svelte:head>
	<title>Campaigns | pixlvl</title>
</svelte:head>

<div class="page">
	<section class="shell">
		<header class="header">
			<p class="eyebrow">pixlvl</p>
			<h1>Choose a campaign</h1>
			<p class="lede">
				Select a campaign run. The combat preview lives here without the intro surface.
			</p>
		</header>

		<div class="grid">
			{#each campaignList as campaign (campaign.campaign)}
				{@const progress = data.progressByCampaign[campaign.campaign]}
				<a class="campaign-card" href={resolve(`/campaigns/${campaign.campaign}`)}>
					<p class="label">Campaign {campaign.campaign}</p>
					<h2>Stage-based survival draft</h2>
					<p>
						{campaign.stages} stages · {campaign.totalLevels} levels · profile {campaign.combatProfile}
					</p>
					{#if progress}
						<p class="progress">
							Saved at level {progress.currentLevel} · cleared {progress.highestClearedLevel}
						</p>
					{/if}
					<span>Run campaign</span>
				</a>
			{/each}
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
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 28%), #020202;
	}

	.shell {
		width: min(100%, 72rem);
		margin: 0 auto;
		display: grid;
		gap: 1.5rem;
	}

	.header,
	.campaign-card {
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.25rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
	}

	.header {
		padding: 1.75rem;
		display: grid;
		gap: 0.75rem;
	}

	.eyebrow,
	.label,
	p,
	h1,
	h2,
	span {
		margin: 0;
	}

	.eyebrow,
	.label {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #a3a3a3;
	}

	h1 {
		font-size: clamp(2rem, 4vw, 3.4rem);
		line-height: 0.98;
	}

	.lede,
	.campaign-card p {
		color: #c4c4c4;
		line-height: 1.6;
	}

	.progress {
		color: #ffffff;
	}

	.grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
	}

	.campaign-card {
		padding: 1.5rem;
		display: grid;
		gap: 0.75rem;
		text-decoration: none;
		color: inherit;
		transition:
			transform 160ms ease,
			border-color 160ms ease;
	}

	.campaign-card:hover {
		transform: translateY(-2px);
		border-color: rgba(255, 255, 255, 0.18);
	}

	h2 {
		font-size: 1.2rem;
	}

	span {
		color: #ffffff;
		font-weight: 600;
	}

	@media (max-width: 860px) {
		.page {
			padding: 1rem;
		}
	}
</style>
