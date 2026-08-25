<script lang="ts">
	import { resolve } from '$app/paths';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { campaign5CombatProfile } from '$lib/data';
	import { createEndlessTestLevel, endlessTestCampaign } from '$lib/game/endless-test';
	import { createArenaCombatSketch } from '$lib/p5/arena-combat-sketch';

	import type { PageProps } from './$types';

	type EndlessCombatState = Parameters<
		NonNullable<NonNullable<Parameters<typeof createArenaCombatSketch>[2]>['onCombatStateChange']>
	>[0];

	let { data }: PageProps = $props();
	let combatState = $state.raw<EndlessCombatState | null>(null);

	let endlessSketch = $derived.by(() => {
		const pixlState = data.gameState?.pixlState ?? null;

		return createArenaCombatSketch(endlessTestCampaign, campaign5CombatProfile, {
			flowMode: 'endless',
			rewardsEnabled: false,
			pixlState,
			levelResolver: (levelIndex) => createEndlessTestLevel(levelIndex + 1),
			onCombatStateChange: (state) => {
				combatState = state;
			}
		});
	});

	let currentWave = $derived(combatState?.campaignLevel ?? 1);
	let currentBracket = $derived(Math.floor((currentWave - 1) / 25) + 1);
	let isBossWave = $derived(currentWave % 5 === 0);
	let isMajorBossWave = $derived(currentWave % 25 === 0);
	let wavePreview = $derived(createEndlessTestLevel(currentWave));
	let statusLabel = $derived.by(() => {
		if (!combatState) return 'Booting endless test';
		if (combatState.status === 'defeated') return 'Run failed. Restarting from wave 1.';
		if (combatState.status === 'cleared') return 'Wave cleared. Advancing.';
		return 'Run active';
	});
</script>

<svelte:head>
	<title>Endless Test</title>
</svelte:head>

<div class="page-shell">
	<header class="hero">
		<div>
			<p class="eyebrow">Prototype</p>
			<h1>Endless Test</h1>
			<p class="lede">
				Infinite-wave combat test with no unlock gating, no Glitch Essence, no shop hooks, and no
				endless persistence yet.
			</p>
		</div>
		<a class="back-link" href={resolve('/campaigns/5')}>Back to Campaign 5</a>
	</header>

	<section class="summary-grid" aria-label="Endless test status">
		<article>
			<span>Wave</span>
			<strong>{currentWave}</strong>
		</article>
		<article>
			<span>Bracket</span>
			<strong>{currentBracket}</strong>
		</article>
		<article>
			<span>Checkpoint</span>
			<strong>{isMajorBossWave ? 'Major boss' : isBossWave ? 'Boss wave' : 'Standard wave'}</strong>
		</article>
		<article>
			<span>Status</span>
			<strong>{statusLabel}</strong>
		</article>
	</section>

	<section class="test-layout">
		<div class="arena-panel">
			<P5Canvas sketch={endlessSketch} />
		</div>

		<aside class="detail-panel">
			<div class="panel-block">
				<h2>Run telemetry</h2>
				<p>Wave {currentWave} scales from wave 1 using the bible's endless multipliers.</p>
				<dl>
					<div>
						<dt>Health and damage</dt>
						<dd>{wavePreview.enemyHealthMultiplier?.toFixed(2)}x</dd>
					</div>
					<div>
						<dt>Spawn rate</dt>
						<dd>{wavePreview.spawnRatePerSecond.toFixed(2)}/s</dd>
					</div>
					<div>
						<dt>Enemies in wave</dt>
						<dd>{wavePreview.totalEnemies}</dd>
					</div>
					<div>
						<dt>Remaining right now</dt>
						<dd>{combatState?.remainingEnemies ?? wavePreview.totalEnemies}</dd>
					</div>
				</dl>
			</div>

			<div class="panel-block">
				<h2>Rules in this prototype</h2>
				<ul>
					<li>Every 5th wave spawns a boss checkpoint.</li>
					<li>Every 25th wave spawns a major hybrid boss checkpoint.</li>
					<li>Death restarts the test from wave 1.</li>
					<li>Reward packs, Glitch Essence, unlocks, and shop integration are disabled.</li>
				</ul>
			</div>

			<div class="panel-block">
				<h2>Loadout source</h2>
				<p>
					{#if data.user}
						This test uses your current saved pixl stats and loadout, but it does not persist
						endless-run progress.
					{:else}
						You are viewing the endless test with the anonymous baseline pixl state.
					{/if}
				</p>
			</div>
		</aside>
	</section>
</div>

<style>
	:global(body) {
		background:
			radial-gradient(circle at top, rgba(255, 140, 66, 0.16), transparent 34%),
			linear-gradient(180deg, #120f13 0%, #08070a 100%);
	}

	.page-shell {
		max-width: 1240px;
		margin: 0 auto;
		padding: 2rem 1.25rem 3rem;
		color: #f5f1ea;
	}

	.hero {
		display: flex;
		justify-content: space-between;
		gap: 1.5rem;
		align-items: end;
		margin-bottom: 1.5rem;
	}

	.eyebrow {
		margin: 0 0 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.72rem;
		color: #ffb36b;
	}

	h1,
	h2,
	strong {
		font-family: 'Avenir Next', 'Segoe UI', sans-serif;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.3rem, 4vw, 3.8rem);
	}

	.lede {
		margin: 0.75rem 0 0;
		max-width: 52rem;
		line-height: 1.55;
		color: rgba(245, 241, 234, 0.82);
	}

	.back-link {
		align-self: center;
		color: #ffd9a8;
		text-decoration: none;
		border: 1px solid rgba(255, 217, 168, 0.28);
		padding: 0.7rem 1rem;
		border-radius: 999px;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.85rem;
		margin-bottom: 1rem;
	}

	.summary-grid article,
	.panel-block,
	.arena-panel {
		background: rgba(17, 16, 21, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 22px;
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
		backdrop-filter: blur(14px);
	}

	.summary-grid article {
		padding: 1rem 1.1rem;
		display: grid;
		gap: 0.35rem;
	}

	.summary-grid span,
	dt {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(245, 241, 234, 0.58);
	}

	.summary-grid strong {
		font-size: 1.15rem;
	}

	.test-layout {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
		gap: 1rem;
		align-items: start;
		min-height: min(72vh, 820px);
	}

	.arena-panel {
		padding: 0.75rem;
		height: min(72vh, 820px);
		min-height: 520px;
		overflow: hidden;
	}

	.arena-panel :global(canvas) {
		display: block;
	}

	.detail-panel {
		display: grid;
		gap: 1rem;
	}

	.panel-block {
		padding: 1.1rem 1.15rem;
	}

	h2 {
		margin: 0 0 0.65rem;
		font-size: 1rem;
	}

	.panel-block p,
	li,
	dd {
		color: rgba(245, 241, 234, 0.82);
		line-height: 1.5;
	}

	dl {
		margin: 0;
		display: grid;
		gap: 0.8rem;
	}

	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	dd,
	dt {
		margin: 0;
	}

	ul {
		margin: 0;
		padding-left: 1.15rem;
		display: grid;
		gap: 0.5rem;
	}

	@media (max-width: 900px) {
		.hero {
			display: grid;
			align-items: start;
		}

		.test-layout {
			grid-template-columns: 1fr;
			min-height: auto;
		}

		.summary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.arena-panel {
			height: min(62vh, 680px);
			min-height: 420px;
		}
	}

	@media (max-width: 640px) {
		.page-shell {
			padding-inline: 0.85rem;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.arena-panel {
			height: min(56vh, 520px);
			min-height: 320px;
		}
	}
</style>
