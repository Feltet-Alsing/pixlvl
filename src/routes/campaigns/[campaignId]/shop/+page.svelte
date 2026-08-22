<script lang="ts">
	import CampaignItemCard from '$lib/components/campaigns/CampaignItemCard.svelte';
	import { formatDisplayNumber } from '$lib/number-format';
	import type { LoadoutItemDefinition } from '$lib/data/types';
	import type { PageProps } from './$types';

	type OfferCard = NonNullable<PageProps['data']['shopState']>['offers'][number] & {
		definition: LoadoutItemDefinition | null;
		originLabel: string;
	};

	let { data, form }: PageProps = $props();

	const shopTimeFormatter = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	});

	let scrapBalance = $derived(data.gameState?.pixlState.scrap ?? 0);
	let shopDefinitionsById = $derived(
		data.weaponDefinitionsById as Record<string, LoadoutItemDefinition>
	);
	let offerCards = $derived.by((): OfferCard[] =>
		(data.shopState?.offers ?? []).map((offer) => {
			const definition = shopDefinitionsById[offer.definitionId] ?? null;

			return {
				...offer,
				definition,
				originLabel: getOfferOriginLabel(offer.definitionId, offer.campaignId)
			};
		})
	);

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

		return `Campaign ${originCampaignId} stock`;
	}
</script>

<svelte:head>
	<title>Shop | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="route-page">
	<div class="shell">
		<section class="hero panel">
			<p class="eyebrow">Campaign {data.campaign.campaign}</p>
			<h1>Shop</h1>
			<p class="lede">Collect the current rotation before the stock cycles out.</p>
		</section>

		<section class="grid">
			<div class="panel shop-panel">
				<div class="section-head">
					<h2>Rotating stock</h2>
					<p>Definition-driven cards show the shape, rarity, and route origin at a glance.</p>
				</div>

				<div class="shop-balance-card stat-card">
					<span>Scrap balance</span>
					<strong>{formatDisplayNumber(scrapBalance)}</strong>
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

					{#if offerCards.length}
						<div class="shop-offer-grid">
							{#each offerCards as offer (offer.definitionId)}
								<form class="shop-offer" method="post" action="?/buyShopItem">
									<input type="hidden" name="definitionId" value={offer.definitionId} />
									<input
										type="hidden"
										name="refreshStartedAt"
										value={data.shopState.refreshStartedAt}
									/>
									{#if offer.definition}
										<CampaignItemCard definition={offer.definition} size="regular">
											{#snippet footer()}
												<div class="shop-card-footer">
													<div class="shop-meta-grid">
														<div>
															<span>Price</span>
															<strong>{formatDisplayNumber(offer.price)} Scrap</strong>
														</div>
														<div>
															<span>Origin</span>
															<strong>{offer.originLabel}</strong>
														</div>
													</div>
													<button class="shop-buy-button" type="submit">
														Buy for {formatDisplayNumber(offer.price)} Scrap
													</button>
												</div>
											{/snippet}
										</CampaignItemCard>
									{:else}
										<div class="feedback neutral">Missing item definition for {offer.name}.</div>
									{/if}
								</form>
							{/each}
						</div>
					{:else}
						<p class="feedback neutral">No shop offers are available in this rotation.</p>
					{/if}
				{/if}
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

	.grid {
		display: grid;
		gap: 1rem;
	}

	.panel,
	.feedback,
	.shop-buy-button,
	.shop-offer {
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
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
	.stat-card span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	.lede,
	.section-head p {
		margin: 0;
		color: #c4c4c4;
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
		grid-template-columns: repeat(auto-fit, minmax(17.5rem, 1fr));
		align-content: start;
	}

	.shop-offer {
		padding: 0.45rem;
		display: grid;
		align-content: start;
	}

	.shop-card-footer {
		display: grid;
		gap: 0.75rem;
	}

	.shop-meta-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		align-items: start;
	}

	.shop-meta-grid div {
		padding: 0.7rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.04);
	}

	.shop-meta-grid span {
		color: #c4c4c4;
		font-size: 0.84rem;
	}

	.shop-meta-grid strong {
		display: block;
	}

	.shop-buy-button {
		min-height: 3rem;
		padding: 0 0.95rem;
		color: #f5f5f5;
		font: inherit;
		font-size: 0.94rem;
		font-weight: 600;
		cursor: pointer;
		background: linear-gradient(135deg, rgba(250, 250, 250, 0.16), rgba(255, 255, 255, 0.08));
		border-color: rgba(255, 255, 255, 0.14);
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

	@media (max-width: 980px) {
		.shop-refresh-row,
		.shop-meta-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.shop-offer-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
