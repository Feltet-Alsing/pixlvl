<script lang="ts">
	import { resolve } from '$app/paths';
	import { campaigns, getCampaignLevel } from '$lib/data';

	import type { PageProps } from './$types';

	interface LeaderboardRow {
		rank: number;
		userId: string;
		displayName: string;
		email: string;
		bestCampaignId: number;
		bestCampaignLevel: number;
		pixlLevel: number;
		totalXp: number;
		updatedAt: string;
	}

	let { data }: PageProps = $props();
	let topLeaders = $derived((data.topLeaders ?? []) as LeaderboardRow[]);

	function getProgressLabel(leader: LeaderboardRow) {
		if (leader.bestCampaignLevel <= 0) {
			return 'No cleared levels yet';
		}

		const campaign = campaigns[leader.bestCampaignId as keyof typeof campaigns];

		if (campaign?.mode === 'endless') {
			return `Endless wave ${leader.bestCampaignLevel}`;
		}

		const level = getCampaignLevel(leader.bestCampaignId, leader.bestCampaignLevel);

		return `Campaign ${leader.bestCampaignId} · Stage ${level.stage} · Level ${level.stageLevel}`;
	}
</script>

<svelte:head>
	<title>Leaderboards | pixlvl</title>
</svelte:head>

<div class="page">
	<section class="shell">
		<header class="hero panel">
			<div>
				<p class="eyebrow">Leaderboards</p>
				<h1>Top progression</h1>
				<p class="lede">
					The top five players by best recorded progression snapshot. Ranking prioritizes the
					furthest campaign reached, then best cleared level, then pixl level and total XP.
				</p>
			</div>
			<a class="back-link" href={resolve('/')}>Back to main</a>
		</header>

		<section class="panel leaderboard-panel">
			{#if topLeaders.length > 0}
				<div class="leaderboard-list">
					{#each topLeaders as leader (leader.userId)}
						<article class="leaderboard-row">
							<div class="leaderboard-rank">#{leader.rank}</div>
							<div class="leaderboard-copy">
								<strong>{leader.displayName}</strong>
								<span>{getProgressLabel(leader)}</span>
							</div>
							<div class="leaderboard-meta">
								<strong>Lv {leader.pixlLevel}</strong>
								<span>{leader.totalXp} XP</span>
								<small>Updated {new Date(leader.updatedAt).toLocaleDateString()}</small>
							</div>
						</article>
					{/each}
				</div>
			{:else}
				<p class="empty-copy">No leaderboard entries yet.</p>
			{/if}
		</section>
	</section>
</div>

<style>
	.page {
		min-height: 100vh;
		padding: 1.2rem;
		background:
			radial-gradient(circle at top left, rgba(117, 255, 174, 0.12), transparent 28%),
			radial-gradient(circle at top right, rgba(255, 215, 123, 0.08), transparent 24%), #030303;
	}

	.shell {
		width: min(100%, 72rem);
		margin: 0 auto;
		display: grid;
		gap: 1rem;
	}

	.panel {
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.35rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
		backdrop-filter: blur(12px);
	}

	.hero {
		padding: 1.1rem;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: end;
	}

	.leaderboard-panel {
		padding: 1rem;
	}

	.leaderboard-list {
		display: grid;
		gap: 0.7rem;
	}

	.leaderboard-row {
		padding: 0.95rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 0.85rem;
		align-items: center;
	}

	.leaderboard-rank {
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.82rem;
		font-weight: 800;
		background: rgba(117, 255, 174, 0.12);
		border: 1px solid rgba(117, 255, 174, 0.18);
		color: #ebffe7;
	}

	.leaderboard-copy,
	.leaderboard-meta {
		display: grid;
		gap: 0.16rem;
	}

	h1,
	p,
	strong,
	span,
	small {
		margin: 0;
	}

	.eyebrow,
	.leaderboard-copy small,
	.leaderboard-meta small {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #9ba09d;
	}

	h1 {
		font-size: clamp(2.2rem, 4vw, 3.5rem);
		line-height: 0.96;
	}

	.lede,
	.leaderboard-copy span,
	.leaderboard-meta span,
	.empty-copy {
		font-size: 0.96rem;
		line-height: 1.55;
		color: #c6c6cb;
	}

	.leaderboard-meta {
		text-align: right;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.7rem;
		padding: 0.75rem 1rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: #f5f5f5;
		font-weight: 700;
		text-decoration: none;
	}

	@media (max-width: 720px) {
		.hero,
		.leaderboard-row {
			grid-template-columns: 1fr;
		}

		.hero {
			display: grid;
			align-items: start;
		}

		.leaderboard-row {
			display: grid;
		}

		.leaderboard-meta {
			text-align: left;
		}
	}
</style>
