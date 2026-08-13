<script lang="ts">
	import { resolve } from '$app/paths';
	import type { LoadoutItemDefinition } from '$lib/data/types';
	import type { PageProps } from './$types';

	interface ManagementStageSummary {
		stage: number;
		startLevel: number;
		endLevel: number;
		unlockedLevelCount: number;
		isCurrentStage: boolean;
		isCleared: boolean;
	}

	let { data, form }: PageProps = $props();
	const shopTimeFormatter = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	});

	let highestUnlockedLevel = $derived(data.campaignState?.highestUnlockedLevel ?? 1);
	let highestClearedLevel = $derived(data.campaignState?.highestClearedLevel ?? 0);
	let scrapBalance = $derived(data.gameState?.pixlState.scrap ?? 0);
	let shopDefinitionsById = $derived(
		data.weaponDefinitionsById as Record<string, LoadoutItemDefinition>
	);
	let unlockedStages = $derived.by(() => {
		return Array.from({ length: data.campaign.stages }, (_, index) => index + 1)
			.map((stage) => {
				const startLevel = (stage - 1) * data.campaign.levelsPerStage + 1;
				const endLevel = startLevel + data.campaign.levelsPerStage - 1;
				const unlockedLevelCount = Math.max(
					0,
					Math.min(highestUnlockedLevel - startLevel + 1, data.campaign.levelsPerStage)
				);

				return {
					stage,
					startLevel,
					endLevel,
					unlockedLevelCount,
					isCurrentStage: data.campaignState?.currentLevel
						? Math.ceil(data.campaignState.currentLevel / data.campaign.levelsPerStage) === stage
						: stage === 1,
					isCleared: highestClearedLevel >= endLevel
				} satisfies ManagementStageSummary;
			})
			.filter((stage) => stage.unlockedLevelCount > 0);
	});

	function formatLabel(value: string) {
		return value
			.split(/[-\s]+/)
			.filter(Boolean)
			.map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
			.join(' ');
	}

	function formatShopTime(value: string) {
		const timestamp = Date.parse(value);

		if (Number.isNaN(timestamp)) {
			return value;
		}

		return shopTimeFormatter.format(new Date(timestamp));
	}

	function getOfferOriginLabel(definitionId: string, fallbackCampaignId: number) {
		const definition = shopDefinitionsById[definitionId];
		const originCampaignId = definition?.shop?.campaignId ?? fallbackCampaignId;

		return `Campaign ${originCampaignId} tier stock`;
	}
</script>

<svelte:head>
	<title>Management | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="route-page">
	<div class="shell">
		<section class="hero panel">
			<p class="eyebrow">Campaign {data.campaign.campaign}</p>
			<h1>Management</h1>
			<p class="lede">Pick stages, review unlocks, and head back into the arena.</p>
		</section>

		<section class="grid">
			<div class="primary-stack">
				<div class="panel">
					<div class="section-head">
						<h2>Stage selection</h2>
						<p>Unlocked stages can be replayed freely.</p>
					</div>

					{#if form?.stageError}
						<p class="feedback error">{form.stageError}</p>
					{:else if form?.stageSuccess}
						<p class="feedback success">{form.stageSuccess}</p>
					{/if}

					{#if data.campaignState}
						<div class="stage-grid">
							{#each unlockedStages as stage (stage.stage)}
								<form method="post" action="?/selectStage">
									<input type="hidden" name="stage" value={stage.stage} />
									<button class:active={stage.isCurrentStage} class="stage-card" type="submit">
										<span>Stage {stage.stage}</span>
										<strong
											>{stage.unlockedLevelCount} / {data.campaign.levelsPerStage} levels</strong
										>
										<small>
											Levels {stage.startLevel}-{stage.endLevel}
											{stage.isCleared ? ' · cleared' : ''}
										</small>
									</button>
								</form>
							{/each}
						</div>
					{:else}
						<p class="feedback neutral">Sign in to save stage progress.</p>
					{/if}
				</div>

				<div class="panel shop-panel">
					<div class="section-head">
						<h2>Shop</h2>
						<p>Spend Scrap on rotating campaign stock.</p>
					</div>

					<div class="shop-balance-card stat-card">
						<span>Scrap balance</span>
						<strong>{scrapBalance}</strong>
					</div>

					{#if form?.shopError}
						<p class="feedback error">{form.shopError}</p>
					{:else if form?.shopSuccess}
						<p class="feedback success">{form.shopSuccess}</p>
					{/if}

					{#if !data.shopState}
						<p class="feedback neutral">Sign in and finish a campaign to unlock the shop.</p>
					{:else if !data.shopState.isUnlocked}
						<p class="feedback neutral">Finish a campaign once to unlock the rotating shop.</p>
					{:else}
						<div class="shop-refresh-row">
							<div class="stat-card compact-stat">
								<span>Rotation started</span>
								<strong>{formatShopTime(data.shopState.refreshStartedAt)}</strong>
							</div>
							<div class="stat-card compact-stat">
								<span>Refreshes at</span>
								<strong>{formatShopTime(data.shopState.nextRefreshAt)}</strong>
							</div>
						</div>

						{#if data.shopState.offers.length}
							<div class="shop-offer-grid">
								{#each data.shopState.offers as offer (offer.definitionId)}
									<form class="shop-offer" method="post" action="?/buyShopItem">
										<input type="hidden" name="definitionId" value={offer.definitionId} />
										<input
											type="hidden"
											name="refreshStartedAt"
											value={data.shopState.refreshStartedAt}
										/>
										<div class="shop-offer-copy">
											<div class="shop-offer-head">
												<div>
													<strong>{offer.name}</strong>
													<p>{offer.role}</p>
												</div>
												<span class={`rarity-pill rarity-${offer.rarity}`}
													>{formatLabel(offer.rarity)}</span
												>
											</div>
											<div class="shop-meta-grid">
												<div>
													<span>Price</span>
													<strong>{offer.price} Scrap</strong>
												</div>
												<div>
													<span>Role</span>
													<strong>{offer.category} · {offer.role}</strong>
												</div>
												<div>
													<span>Origin</span>
													<strong
														>{getOfferOriginLabel(offer.definitionId, offer.campaignId)}</strong
													>
												</div>
											</div>
										</div>
										<button class="shop-buy-button" type="submit">Buy offer</button>
									</form>
								{/each}
							</div>
						{:else}
							<p class="feedback neutral">No shop offers are available in this rotation.</p>
						{/if}
					{/if}
				</div>
			</div>

			<div class="panel summary-stack">
				<div class="section-head">
					<h2>Run summary</h2>
					<p>Current persistent state for this campaign.</p>
				</div>
				<div class="stat-card">
					<span>Current level</span>
					<strong>{data.campaignState?.currentLevel ?? 1}</strong>
				</div>
				<div class="stat-card">
					<span>Highest unlocked</span>
					<strong>{highestUnlockedLevel}</strong>
				</div>
				<div class="stat-card">
					<span>Highest cleared</span>
					<strong>{highestClearedLevel}</strong>
				</div>
				<div class="route-links">
					<a class="jump" href={resolve(`/campaigns/${data.campaignId}`)}>Return to arena</a>
					<a class="jump" href={resolve(`/campaigns/${data.campaignId}/stats`)}>Open stats</a>
					<a class="jump" href={resolve(`/campaigns/${data.campaignId}/loadout`)}>Open loadout</a>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.route-page {
		min-height: 100vh;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 24%), #050505;
	}

	.shell {
		max-width: 1120px;
		margin: 0 auto;
		padding: 1rem;
		display: grid;
		gap: 1rem;
	}

	.primary-stack {
		display: grid;
		gap: 1rem;
	}

	.route-links,
	.stage-grid {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.panel,
	.stage-card,
	.jump,
	.feedback,
	.shop-buy-button,
	.shop-offer {
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
	}

	.jump {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.2rem;
		padding: 0 0.9rem;
		text-decoration: none;
		color: #f5f5f5;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.panel {
		padding: 1rem;
		display: grid;
		gap: 0.8rem;
	}

	.hero h1,
	.section-head h2 {
		margin: 0;
	}

	.hero h1 {
		font-size: 2rem;
	}

	.eyebrow,
	.stat-card span,
	.stage-card span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	.lede,
	.section-head p,
	.stage-card small {
		margin: 0;
		color: #c4c4c4;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(18rem, 24rem);
		gap: 1rem;
	}

	.stage-card {
		width: 100%;
		padding: 0.85rem;
		display: grid;
		gap: 0.3rem;
		text-align: left;
		color: #f5f5f5;
		font: inherit;
		cursor: pointer;
	}

	.stage-card.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.1);
	}

	.stat-card {
		padding: 0.85rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.25rem;
	}

	.stat-card strong {
		font-size: 1.1rem;
	}

	.shop-panel {
		align-content: start;
	}

	.shop-balance-card strong {
		font-size: 1.5rem;
	}

	.shop-refresh-row,
	.shop-meta-grid,
	.shop-offer-grid {
		display: grid;
		gap: 0.75rem;
	}

	.shop-refresh-row {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.compact-stat strong {
		font-size: 1rem;
	}

	.shop-offer-grid {
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.shop-offer {
		padding: 0.85rem;
		display: grid;
		gap: 0.85rem;
	}

	.shop-offer-copy,
	.shop-offer-head {
		display: grid;
		gap: 0.5rem;
	}

	.shop-offer-head {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
	}

	.shop-offer-head strong,
	.shop-meta-grid strong {
		display: block;
	}

	.shop-offer-head p,
	.shop-meta-grid span {
		margin: 0;
		color: #c4c4c4;
		font-size: 0.84rem;
	}

	.shop-meta-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.rarity-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem 0.65rem;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.06);
	}

	.rarity-normal {
		color: #f0f0f0;
	}

	.rarity-magic {
		color: #9fd5ff;
	}

	.rarity-rare {
		color: #7ef29a;
	}

	.rarity-exotic {
		color: #ffb36a;
	}

	.rarity-legendary {
		color: #ffe58a;
	}

	.shop-buy-button {
		min-height: 2.3rem;
		padding: 0 0.95rem;
		color: #f5f5f5;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		background: rgba(103, 217, 111, 0.14);
		border-color: rgba(103, 217, 111, 0.42);
	}

	.feedback {
		padding: 0.8rem 0.9rem;
	}

	.feedback.error {
		color: #ffb3b3;
		background: rgba(255, 96, 96, 0.08);
	}

	.feedback.success {
		background: rgba(103, 217, 111, 0.1);
	}

	.feedback.neutral {
		background: rgba(255, 255, 255, 0.05);
	}

	.summary-stack {
		align-content: start;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.shop-refresh-row,
		.shop-meta-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
