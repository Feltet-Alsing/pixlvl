<script lang="ts">
	import { weaponDefinitions } from '$lib/data';
	import type { WeaponRarity } from '$lib/data/types';
	import type { LoadoutItemDefinition, WeaponShape } from '$lib/data/types';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type OpenedPackSummary = NonNullable<NonNullable<PageProps['form']>['openedPack']>;
	type OpenedCardSummary = OpenedPackSummary['cards'][number];
	type OpenedPackBatchSummary = NonNullable<NonNullable<PageProps['form']>['openedPackBatch']>;

	const rarityAccentById = {
		normal: '#f0f4f8',
		magic: '#aaceff',
		rare: '#ffe899',
		exotic: '#ffaaaa',
		legendary: '#e09c5c'
	} as const satisfies Record<WeaponRarity, string>;

	const formatCompactDate = (value: Date | string | null) => {
		if (!value) {
			return 'Not opened';
		}

		const parsed = value instanceof Date ? value : new Date(value);

		if (Number.isNaN(parsed.getTime())) {
			return value instanceof Date ? value.toISOString() : value;
		}

		return parsed.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	};

	const formatLabel = (value: string) =>
		value
			.split(/[-\s]+/)
			.filter(Boolean)
			.map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
			.join(' ');

	const getRarityAccent = (rarity: WeaponRarity) => rarityAccentById[rarity];

	const createIndexArray = (length: number) => Array.from({ length }, (_, index) => index);

	const isShapeCellFilled = (shape: WeaponShape, x: number, y: number) =>
		shape.cells.some(([cellX, cellY]) => cellX === x && cellY === y);

	type ShapeThumbnailTone = 'revealCard' | 'summary';

	const getShapeThumbnailStyle = (shape: WeaponShape, tone: ShapeThumbnailTone) => {
		const preset =
			tone === 'revealCard'
				? {
						frameWidth: 180,
						frameHeight: 160,
						paddingX: 14,
						paddingY: 14,
						gap: 6,
						minCell: 12,
						maxCell: 28
					}
				: {
						frameWidth: 56,
						frameHeight: 56,
						paddingX: 8,
						paddingY: 8,
						gap: 3,
						minCell: 5,
						maxCell: 12
					};

		const widthAvailable = Math.max(18, preset.frameWidth - preset.paddingX * 2);
		const heightAvailable = Math.max(18, preset.frameHeight - preset.paddingY * 2);
		const widthCell = Math.floor(
			(widthAvailable - preset.gap * Math.max(0, shape.width - 1)) / shape.width
		);
		const heightCell = Math.floor(
			(heightAvailable - preset.gap * Math.max(0, shape.height - 1)) / shape.height
		);
		const cellSize = Math.max(preset.minCell, Math.min(preset.maxCell, widthCell, heightCell));
		const width = shape.width * cellSize + preset.gap * Math.max(0, shape.width - 1);
		const height = shape.height * cellSize + preset.gap * Math.max(0, shape.height - 1);

		return [
			`grid-template-columns: repeat(${shape.width}, ${cellSize}px)`,
			`grid-template-rows: repeat(${shape.height}, ${cellSize}px)`,
			`gap: ${preset.gap}px`,
			`width: ${width}px`,
			`height: ${height}px`
		].join('; ');
	};

	const getItemDefinition = (definitionId: string): LoadoutItemDefinition | null =>
		weaponDefinitions[definitionId] ?? null;

	const getItemShape = (definitionId: string): WeaponShape | null =>
		getItemDefinition(definitionId)?.shape ?? null;

	const getShapeThumbnail = (definitionId: string, tone: ShapeThumbnailTone) => {
		const shape = getItemShape(definitionId);

		if (!shape) {
			return null;
		}

		return {
			shape,
			style: getShapeThumbnailStyle(shape, tone)
		};
	};

	const toAlphaColor = (color: string, alpha: number) => {
		if (/^#[0-9a-f]{6}$/i.test(color)) {
			const red = Number.parseInt(color.slice(1, 3), 16);
			const green = Number.parseInt(color.slice(3, 5), 16);
			const blue = Number.parseInt(color.slice(5, 7), 16);
			return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
		}

		if (/^#[0-9a-f]{3}$/i.test(color)) {
			const expanded = color
				.slice(1)
				.split('')
				.map((channel) => channel + channel)
				.join('');
			return toAlphaColor(`#${expanded}`, alpha);
		}

		return `rgba(255, 255, 255, ${alpha})`;
	};

	const getRevealCardStyle = (card: OpenedCardSummary) => {
		const accent = getRarityAccent(card.rarity);

		return [
			`--card-accent: ${accent}`,
			`--card-accent-soft: ${toAlphaColor(accent, 0.16)}`,
			`--card-accent-glow: ${toAlphaColor(accent, card.isGuaranteedSlot ? 0.5 : 0.3)}`
		].join('; ');
	};

	let rewardPacks = $derived(data.gameState?.rewardPacks ?? []);
	let unopenedPacks = $derived(rewardPacks.filter((pack) => pack.status === 'unopened'));
	let openedPacks = $derived(rewardPacks.filter((pack) => pack.status === 'opened'));
	let hasAnyPacks = $derived(rewardPacks.length > 0);
	let selectedPackIds = $state<string[]>([]);

	function getPackKindLabel(pack: (typeof rewardPacks)[number]) {
		if (pack.kind === 'special') {
			return 'Special pack';
		}

		if (pack.kind === 'rare') {
			return 'Rare pack';
		}

		return 'Reward pack';
	}

	function getPackKindBadge(pack: (typeof rewardPacks)[number]) {
		if (pack.kind === 'special') {
			return 'special pack';
		}

		if (pack.kind === 'rare') {
			return 'rare pack';
		}

		return 'reward pack';
	}

	let openedPackBatch = $derived(form?.openedPackBatch as OpenedPackBatchSummary | undefined);
	let openedPack = $derived(form?.openedPack as OpenedPackSummary | undefined);
	let revealStep = $derived(openedPack ? 0 : -1);
	let revealCardCount = $derived(openedPack?.cards.length ?? 0);
	let currentRevealCard = $derived(
		openedPack && revealStep >= 0 && revealStep < revealCardCount
			? openedPack.cards[revealStep]
			: null
	);
	let currentRevealThumbnail = $derived(
		currentRevealCard ? getShapeThumbnail(currentRevealCard.definitionId, 'revealCard') : null
	);
	let isRevealSummary = $derived(openedPack ? revealStep >= revealCardCount : false);
	let nextRevealButtonLabel = $derived.by(() => {
		if (!openedPack || isRevealSummary) {
			return 'Done';
		}

		if (revealStep === revealCardCount - 1) {
			return 'Finish reveal';
		}

		return openedPack.cards[revealStep + 1]?.isGuaranteedSlot
			? 'Reveal guaranteed card'
			: 'Reveal next card';
	});
	let selectedPackCount = $derived(selectedPackIds.length);
	let allUnopenedSelected = $derived(
		unopenedPacks.length > 0 && selectedPackIds.length === unopenedPacks.length
	);

	function advanceReveal() {
		if (!openedPack || revealStep >= revealCardCount) {
			return;
		}

		revealStep += 1;
	}

	function restartReveal() {
		if (!openedPack) {
			return;
		}

		revealStep = 0;
	}

	function isPackSelected(packId: string) {
		return selectedPackIds.includes(packId);
	}

	function togglePackSelection(packId: string) {
		selectedPackIds = isPackSelected(packId)
			? selectedPackIds.filter((selectedPackId) => selectedPackId !== packId)
			: [...selectedPackIds, packId];
	}

	function selectAllPacks() {
		selectedPackIds = unopenedPacks.map((pack) => pack.id);
	}

	function deselectAllPacks() {
		selectedPackIds = [];
	}
</script>

<svelte:head>
	<title>Packs | Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<div class="route-page">
	<div class="shell">
		<section class="hero panel">
			<p class="eyebrow">Campaign {data.campaign.campaign}</p>
			<h1>Reward packs</h1>
			<p class="lede">
				Choose a sealed pack or revisit the pulls you have already opened across your whole account.
			</p>
		</section>

		{#if form?.openPackError}
			<p class="feedback error">{form.openPackError}</p>
		{:else if form?.openPackSuccess}
			<p class="feedback success">{form.openPackSuccess}</p>
		{/if}

		{#if openedPackBatch}
			<section class="panel opened-pack-summary">
				<div class="section-head compact-section-head">
					<h2>Bulk opening summary</h2>
					<div class="summary-strip" aria-label="Bulk opening summary">
						<span class="summary-pill">{openedPackBatch.packCount} packs</span>
						<span class="summary-pill">{openedPackBatch.openedCardCount} cards</span>
						<span class="summary-pill">{openedPackBatch.newCardCount} new</span>
					</div>
				</div>

				<div class="reveal-panel">
					<div class="reveal-progress-header">
						<div>
							<p class="reveal-phase-label">Top 10 pulls</p>
							<p class="reveal-phase-copy">
								New cards are always shown first, then the rarest pulls.
							</p>
						</div>
					</div>

					<div
						class="opened-cards-list"
						role="list"
						aria-label="Bulk opened pack top cards summary"
					>
						{#each openedPackBatch.topCards as card, cardIndex (`${card.packId}:${card.definitionId}:${card.slotIndex}:${cardIndex}`)}
							{@const summaryThumbnail = getShapeThumbnail(card.definitionId, 'summary')}
							<div
								class={`opened-card-row summary-card-row rarity-${card.rarity} ${card.isGuaranteedSlot ? 'guaranteed-card' : ''}`}
								role="listitem"
								style={getRevealCardStyle(card)}
							>
								<div class="opened-card-main">
									{#if summaryThumbnail}
										<div class="summary-shape-stage" aria-hidden="true">
											<div class="summary-shape-grid" style={summaryThumbnail.style}>
												{#each createIndexArray(summaryThumbnail.shape.height) as shapeY (`bulk-summary:${card.definitionId}:${shapeY}`)}
													{#each createIndexArray(summaryThumbnail.shape.width) as shapeX (`bulk-summary:${card.definitionId}:${shapeY}:${shapeX}`)}
														<div
															class="summary-shape-cell"
															class:filled={isShapeCellFilled(
																summaryThumbnail.shape,
																shapeX,
																shapeY
															)}
														></div>
													{/each}
												{/each}
											</div>
										</div>
									{/if}
									<div>
										<p class="opened-card-name">{card.name}</p>
										<p class="opened-card-rarity">
											{formatLabel(card.rarity)} · Pack #{card.packId.slice(0, 8)}
										</p>
									</div>
								</div>
								<div class="opened-card-flags">
									{#if card.isGuaranteedSlot}
										<span class="card-flag guaranteed">Guaranteed</span>
									{/if}
									{#if card.isNew}
										<span class="card-flag new">New</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
		{:else if openedPack}
			<section class="panel opened-pack-summary">
				<div class="section-head compact-section-head">
					<h2>Latest opening</h2>
					<div class="summary-strip" aria-label="Latest opening summary">
						<span class="summary-pill">Pack #{openedPack.id.slice(0, 8)}</span>
						<span class="summary-pill">{openedPack.cards.length} cards</span>
						<span class="summary-pill">Opened {formatCompactDate(openedPack.openedAt)}</span>
					</div>
				</div>

				{#if revealCardCount > 0}
					<div class="reveal-panel">
						<div class="reveal-progress-header">
							<div>
								<p class="reveal-phase-label">
									{#if isRevealSummary}
										Pack summary
									{:else}
										Card {revealStep + 1} of {revealCardCount}
									{/if}
								</p>
								<p class="reveal-phase-copy">
									{#if isRevealSummary}
										All pulls are visible in pack order.
									{:else if currentRevealCard?.isGuaranteedSlot}
										Guaranteed pull.
									{:else}
										One card at a time.
									{/if}
								</p>
							</div>
							{#if !isRevealSummary}
								<button class="reveal-action-button" type="button" onclick={advanceReveal}>
									{nextRevealButtonLabel}
								</button>
							{:else}
								<button
									class="reveal-action-button secondary"
									type="button"
									onclick={restartReveal}
								>
									Replay reveal
								</button>
							{/if}
						</div>

						<div class="reveal-progress-track" aria-hidden="true">
							{#each openedPack.cards as card, cardIndex (`${openedPack.id}:${card.definitionId}:${cardIndex}`)}
								<div
									class={`reveal-progress-node rarity-${card.rarity} ${card.isGuaranteedSlot ? 'guaranteed-node' : ''} ${cardIndex < revealStep || isRevealSummary ? 'is-revealed' : ''} ${cardIndex === revealStep && !isRevealSummary ? 'is-active' : ''}`}
								></div>
							{/each}
						</div>

						{#if currentRevealCard}
							<div class="reveal-stage">
								<article
									class={`reveal-card reveal-pack-face rarity-${currentRevealCard.rarity} ${currentRevealCard.isGuaranteedSlot ? 'guaranteed-card' : ''}`}
									style={getRevealCardStyle(currentRevealCard)}
								>
									<div class="reveal-card-topline">
										<p class="reveal-card-kicker">
											{currentRevealCard.isGuaranteedSlot ? 'Guaranteed slot' : 'Revealed card'}
										</p>
										<span class="reveal-rarity-pill">{formatLabel(currentRevealCard.rarity)}</span>
									</div>

									<div class="reveal-pack-branding">
										<p class="reveal-pack-series">pixlvl reward drop</p>
										<h3>{currentRevealCard.name}</h3>
										<p class="reveal-pack-subtitle">
											Pack #{openedPack.id.slice(0, 8)}
											{#if currentRevealCard.isGuaranteedSlot}
												• featured pull
											{:else}
												• sealed pack reveal
											{/if}
										</p>
									</div>

									{#if currentRevealThumbnail}
										<div class="reveal-pack-thumbnail" aria-hidden="true">
											<div class="reveal-thumbnail-grid" style={currentRevealThumbnail.style}>
												{#each createIndexArray(currentRevealThumbnail.shape.height) as shapeY (`reveal-thumb:${currentRevealCard.definitionId}:${shapeY}`)}
													{#each createIndexArray(currentRevealThumbnail.shape.width) as shapeX (`reveal-thumb:${currentRevealCard.definitionId}:${shapeY}:${shapeX}`)}
														<div
															class="reveal-thumbnail-cell"
															class:filled={isShapeCellFilled(
																currentRevealThumbnail.shape,
																shapeX,
																shapeY
															)}
														></div>
													{/each}
												{/each}
											</div>
										</div>
									{:else}
										<div class="reveal-pack-emblem" aria-hidden="true">
											<div class="reveal-pack-orbit reveal-pack-orbit-outer"></div>
											<div class="reveal-pack-orbit reveal-pack-orbit-inner"></div>
											<div class="reveal-pack-core"></div>
										</div>
									{/if}

									<div class="opened-card-flags reveal-flags">
										{#if currentRevealCard.isGuaranteedSlot}
											<span class="card-flag guaranteed">Guaranteed</span>
										{/if}
										{#if currentRevealCard.isNew}
											<span class="card-flag new">New</span>
										{/if}
									</div>

									<div class="reveal-pack-footer">
										<span>Pack #{openedPack.id.slice(0, 8)}</span>
										<span>{revealStep + 1} / {revealCardCount}</span>
									</div>
								</article>
							</div>
						{:else}
							<div class="opened-cards-list" role="list" aria-label="Opened pack cards summary">
								{#each openedPack.cards as card, cardIndex (`${openedPack.id}:${card.definitionId}:${cardIndex}`)}
									{@const summaryThumbnail = getShapeThumbnail(card.definitionId, 'summary')}
									<div
										class={`opened-card-row summary-card-row rarity-${card.rarity} ${card.isGuaranteedSlot ? 'guaranteed-card' : ''}`}
										role="listitem"
										style={getRevealCardStyle(card)}
									>
										<div class="opened-card-main">
											{#if summaryThumbnail}
												<div class="summary-shape-stage" aria-hidden="true">
													<div class="summary-shape-grid" style={summaryThumbnail.style}>
														{#each createIndexArray(summaryThumbnail.shape.height) as shapeY (`summary:${card.definitionId}:${shapeY}`)}
															{#each createIndexArray(summaryThumbnail.shape.width) as shapeX (`summary:${card.definitionId}:${shapeY}:${shapeX}`)}
																<div
																	class="summary-shape-cell"
																	class:filled={isShapeCellFilled(
																		summaryThumbnail.shape,
																		shapeX,
																		shapeY
																	)}
																></div>
															{/each}
														{/each}
													</div>
												</div>
											{/if}
											<div>
												<p class="opened-card-name">{card.name}</p>
												<p class="opened-card-rarity">{formatLabel(card.rarity)}</p>
											</div>
										</div>
										<div class="opened-card-flags">
											{#if card.isGuaranteedSlot}
												<span class="card-flag guaranteed">Guaranteed</span>
											{/if}
											{#if card.isNew}
												<span class="card-flag new">New</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</section>
		{/if}

		{#if hasAnyPacks}
			<section class="section-block">
				<div class="section-head">
					<h2>Unopened</h2>
					<p>Select sealed packs from the shelf, then open them in one batch.</p>
				</div>

				{#if unopenedPacks.length > 0}
					<form method="post" action="?/openSelectedPacks" class="bulk-pack-form">
						<div class="pack-bulk-toolbar">
							<div class="pack-bulk-copy">
								<p class="pack-bulk-count">{selectedPackCount} selected</p>
								<p class="pack-note">
									Open a batch and get a top 10 summary weighted toward new and rare pulls.
								</p>
							</div>
							<div class="pack-bulk-actions">
								<button
									type="button"
									class="bulk-control-button secondary"
									onclick={selectAllPacks}
									disabled={allUnopenedSelected}
								>
									Select all
								</button>
								<button
									type="button"
									class="bulk-control-button secondary"
									onclick={deselectAllPacks}
									disabled={selectedPackCount === 0}
								>
									Deselect all
								</button>
								<button
									type="submit"
									class="bulk-control-button primary"
									disabled={selectedPackCount === 0}
								>
									Open selected packs
								</button>
							</div>
						</div>

						{#each selectedPackIds as packId (`selected:${packId}`)}
							<input type="hidden" name="packId" value={packId} />
						{/each}

						<div class="pack-grid">
							{#each unopenedPacks as pack (pack.id)}
								<button
									type="button"
									class={[
										'pack-shelf-item',
										'pack-card-hitarea',
										'sealed',
										isPackSelected(pack.id) && 'is-selected',
										unopenedPacks.length > 1 && 'has-stack'
									]}
									onclick={() => togglePackSelection(pack.id)}
									aria-pressed={isPackSelected(pack.id)}
									aria-label={`${isPackSelected(pack.id) ? 'Deselect' : 'Select'} sealed pack ${pack.id.slice(0, 8)} from source level ${pack.sourceCampaignLevel}`}
								>
									<div class="pack-stack-stage" aria-hidden="true">
										{#if unopenedPacks.length > 1}
											<span class="pack-stack-backdrop pack-stack-backdrop-far"></span>
											<span class="pack-stack-backdrop pack-stack-backdrop-near"></span>
										{/if}
										<div class="pack-face-preview sealed-preview">
											<div class="pack-selection-indicator">
												{isPackSelected(pack.id) ? 'Selected' : 'Select'}
											</div>
											<div class="pack-face-header">
												<span>{getPackKindLabel(pack)}</span>
												<span>Lv {pack.sourceCampaignLevel}</span>
											</div>
											<div class="pack-face-badge">{getPackKindBadge(pack)}</div>
											<div class="pack-face-emblem">
												<div class="pack-face-orbit pack-face-orbit-outer"></div>
												<div class="pack-face-orbit pack-face-orbit-inner"></div>
												<div class="pack-face-core"></div>
											</div>
											<div class="pack-face-footer">
												<span>Pack #{pack.id.slice(0, 8)}</span>
												<span>{pack.cardCount} cards</span>
											</div>
										</div>
									</div>
								</button>
							{/each}
						</div>
					</form>
				{:else}
					<div class="panel empty-state">
						<h3>No sealed packs</h3>
						<p>Clear more campaign levels to earn new reward packs.</p>
					</div>
				{/if}
			</section>

			<section class="section-block">
				<div class="section-head">
					<h2>Opened</h2>
					<p>Past pulls, still shelved like packs.</p>
				</div>

				{#if openedPacks.length > 0}
					<div class="pack-grid">
						{#each openedPacks as pack (pack.id)}
							<form method="post" action="?/openPack" class="pack-card-form">
								<input type="hidden" name="packId" value={pack.id} />
								<button
									type="submit"
									class={[
										'pack-shelf-item',
										'pack-card-hitarea',
										'opened',
										openedPacks.length > 1 && 'has-stack'
									]}
									aria-label={`Reopen pack ${pack.id.slice(0, 8)} from source level ${pack.sourceCampaignLevel}`}
								>
									<div class="pack-stack-stage" aria-hidden="true">
										{#if openedPacks.length > 1}
											<span class="pack-stack-backdrop pack-stack-backdrop-far"></span>
											<span class="pack-stack-backdrop pack-stack-backdrop-near"></span>
										{/if}
										<div class="pack-face-preview opened-preview">
											<div class="pack-face-header">
												<span>Opened {getPackKindLabel(pack).toLowerCase()}</span>
												<span>Lv {pack.sourceCampaignLevel}</span>
											</div>
											<div class="pack-face-badge">opened {getPackKindBadge(pack)}</div>
											<div class="pack-face-emblem">
												<div class="pack-face-orbit pack-face-orbit-outer"></div>
												<div class="pack-face-orbit pack-face-orbit-inner"></div>
												<div class="pack-face-core"></div>
											</div>
											<div class="pack-face-footer">
												<span>Pack #{pack.id.slice(0, 8)}</span>
												<span>{pack.cardCount} cards</span>
											</div>
										</div>
									</div>
								</button>
							</form>
						{/each}
					</div>
				{:else}
					<div class="panel empty-state">
						<h3>No opened packs yet</h3>
						<p>Your opened pack history will show up here after you open your first pack.</p>
					</div>
				{/if}
			</section>
		{:else}
			<section class="panel empty-state full-width">
				<h2>No reward packs yet</h2>
				<p>Reward packs will appear here after they drop anywhere in your runs.</p>
			</section>
		{/if}
	</div>
</div>

<style>
	.route-page {
		min-height: 100vh;
		background: #050505;
	}

	.shell {
		max-width: 1120px;
		margin: 0 auto;
		padding: 1rem;
		display: grid;
		gap: 1rem;
	}

	.feedback,
	.pack-action-button {
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
	}

	.panel {
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
		padding: 1rem;
		display: grid;
		gap: 0.85rem;
	}

	.hero h1,
	.section-head h2,
	.empty-state h2,
	.empty-state h3 {
		margin: 0;
	}

	.hero h1 {
		font-size: 2rem;
	}

	.eyebrow {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	.lede,
	.section-head p,
	.empty-state p,
	.pack-note {
		margin: 0;
		color: #c4c4c4;
	}

	.feedback {
		margin: 0;
		padding: 0.85rem 1rem;
	}

	.feedback.error {
		border-color: rgba(255, 107, 107, 0.3);
		color: #ffb2b2;
	}

	.feedback.success {
		border-color: rgba(103, 217, 111, 0.3);
		color: #b6f5ba;
	}

	.section-block {
		display: grid;
		gap: 0.75rem;
	}

	.opened-pack-summary {
		gap: 1rem;
	}

	.compact-section-head {
		gap: 0.75rem;
	}

	.summary-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.summary-pill,
	.pack-context-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 1.75rem;
		padding: 0 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.05);
		color: #e9e9e9;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.reveal-panel {
		display: grid;
		gap: 1rem;
	}

	.reveal-stage {
		display: grid;
		place-items: center;
		padding: 0.5rem 0 0.25rem;
	}

	.reveal-progress-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.85rem;
		align-items: start;
	}

	.reveal-phase-label,
	.reveal-phase-copy,
	.reveal-card-kicker,
	.reveal-card-copy h3,
	.reveal-card-copy p {
		margin: 0;
	}

	.reveal-phase-label,
	.reveal-card-kicker {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #d8d8d8;
	}

	.reveal-phase-copy,
	.reveal-card-copy p {
		color: #c4c4c4;
	}

	.reveal-action-button {
		min-height: 2.75rem;
		padding: 0.75rem 1rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.06);
		color: #f4f4f4;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.reveal-action-button:hover {
		border-color: rgba(255, 214, 102, 0.35);
	}

	.reveal-action-button.secondary {
		background: rgba(10, 10, 10, 0.92);
	}

	.reveal-progress-track {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
		gap: 0.55rem;
	}

	.reveal-progress-node {
		height: 0.55rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.06);
		opacity: 0.5;
		transition:
			opacity 120ms ease,
			transform 120ms ease,
			border-color 120ms ease,
			background 120ms ease;
	}

	.reveal-progress-node.is-active,
	.reveal-progress-node.is-revealed {
		opacity: 1;
	}

	.reveal-progress-node.is-active {
		transform: scaleY(1.25);
	}

	.reveal-progress-node.guaranteed-node {
		box-shadow: 0 0 0 1px rgba(255, 214, 102, 0.18);
	}

	.reveal-card,
	.summary-card-row {
		--card-accent: #f0f4f8;
		--card-accent-soft: rgba(240, 244, 248, 0.16);
		--card-accent-glow: rgba(240, 244, 248, 0.3);
	}

	.reveal-card {
		padding: 1rem;
		border-radius: 1rem;
		border: 1px solid color-mix(in srgb, var(--card-accent) 32%, rgba(255, 255, 255, 0.08));
		background: linear-gradient(180deg, var(--card-accent-soft), rgba(10, 10, 10, 0.92));
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
		display: grid;
		gap: 0.9rem;
		animation: reveal-rise 180ms ease;
	}

	.reveal-card.guaranteed-card {
		box-shadow:
			0 0 0 1px rgba(255, 214, 102, 0.18),
			0 24px 60px rgba(0, 0, 0, 0.28);
	}

	.reveal-pack-face {
		position: relative;
		isolation: isolate;
		width: min(100%, 26rem);
		min-height: 34rem;
		padding: 1.1rem 1.1rem 1.25rem;
		grid-template-rows: auto auto 1fr auto auto;
		overflow: hidden;
		border-radius: 1.8rem;
		background:
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.09) 0 4px, transparent 4px 10px) top /
				100% 1rem no-repeat,
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0 4px, transparent 4px 10px)
				bottom / 100% 1rem no-repeat,
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--card-accent) 22%, rgba(255, 255, 255, 0.08)) 0%,
				rgba(9, 11, 16, 0.96) 38%,
				rgba(4, 5, 8, 0.98) 100%
			);
		box-shadow:
			0 24px 80px rgba(0, 0, 0, 0.42),
			0 0 50px color-mix(in srgb, var(--card-accent) 26%, transparent);
	}

	.reveal-pack-face::before,
	.reveal-pack-face::after,
	.pack-face-preview::before,
	.pack-face-preview::after {
		content: '';
		position: absolute;
		pointer-events: none;
	}

	.reveal-pack-face::before {
		content: none;
	}

	.reveal-pack-face::after {
		inset: 0;
		background: linear-gradient(
			115deg,
			rgba(255, 255, 255, 0.28) 0%,
			rgba(255, 255, 255, 0.02) 26%,
			transparent 48%
		);
		mix-blend-mode: screen;
		opacity: 0.9;
	}

	.reveal-card-topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		position: relative;
		z-index: 1;
	}

	.reveal-rarity-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 1.8rem;
		padding: 0 0.75rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--card-accent) 38%, white);
		background: color-mix(in srgb, var(--card-accent) 12%, transparent);
		color: color-mix(in srgb, var(--card-accent) 72%, white);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.reveal-card-copy {
		display: grid;
		gap: 0.45rem;
	}

	.reveal-pack-branding {
		display: grid;
		gap: 0.5rem;
		justify-items: center;
		text-align: center;
		padding: 1.25rem 0 0.35rem;
		position: relative;
		z-index: 1;
	}

	.reveal-pack-series,
	.reveal-pack-subtitle,
	.reveal-pack-footer,
	.pack-face-header,
	.pack-face-badge {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.14em;
	}

	.reveal-pack-series {
		font-size: 0.72rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--card-accent) 44%, #ebe7ff);
	}

	.reveal-pack-branding h3 {
		margin: 0;
		font-size: clamp(2.3rem, 5vw, 3.6rem);
		line-height: 0.94;
		max-width: 8ch;
		text-wrap: balance;
		color: #fff7fc;
		text-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
	}

	.reveal-pack-subtitle {
		font-size: 0.72rem;
		font-weight: 600;
		color: rgba(244, 244, 244, 0.72);
	}

	.reveal-pack-emblem {
		position: relative;
		align-self: center;
		justify-self: center;
		width: min(100%, 16.5rem);
		aspect-ratio: 1 / 1.16;
		display: grid;
		place-items: center;
		z-index: 1;
	}

	.reveal-pack-orbit {
		position: absolute;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--card-accent) 54%, rgba(255, 255, 255, 0.36));
		background: transparent;
		box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.08);
	}

	.reveal-pack-orbit-outer {
		inset: 0;
		transform: rotate(10deg);
	}

	.reveal-pack-orbit-inner {
		inset: 16%;
		transform: rotate(-14deg);
	}

	.reveal-pack-core::before,
	.reveal-pack-core::after,
	.summary-shape-stage::before {
		content: '';
		position: absolute;
		pointer-events: none;
	}

	.reveal-pack-core {
		position: relative;
		width: min(100%, 12.75rem);
		aspect-ratio: 1 / 1.18;
		border-radius: 1.9rem;
		border: 1px solid color-mix(in srgb, var(--card-accent) 24%, rgba(255, 255, 255, 0.16));
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.34),
			rgba(255, 255, 255, 0.1) 26%,
			rgba(255, 255, 255, 0.03) 100%
		);
		box-shadow:
			0 18px 44px rgba(0, 0, 0, 0.28),
			inset 0 0 0 1px rgba(255, 255, 255, 0.08),
			0 0 48px color-mix(in srgb, var(--card-accent) 18%, transparent);
	}

	.reveal-pack-core::before {
		inset: 11% 16%;
		border-radius: 1.4rem;
		border: 1px solid color-mix(in srgb, var(--card-accent) 18%, rgba(255, 255, 255, 0.1));
		opacity: 0.8;
	}

	.reveal-pack-core::after {
		content: none;
	}

	.reveal-pack-thumbnail {
		display: grid;
		place-items: center;
		justify-self: center;
		width: min(100%, 16.5rem);
		min-height: 11.75rem;
		padding: 1rem;
		border-radius: 2rem;
		border: 1px solid color-mix(in srgb, var(--card-accent) 26%, rgba(255, 255, 255, 0.16));
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.08),
			rgba(255, 255, 255, 0.03) 28%,
			rgba(8, 8, 12, 0.56) 100%
		);
		box-shadow:
			0 18px 44px rgba(0, 0, 0, 0.28),
			inset 0 0 0 1px rgba(255, 255, 255, 0.08),
			0 0 48px color-mix(in srgb, var(--card-accent) 18%, transparent);
		position: relative;
		z-index: 1;
	}

	.summary-shape-stage {
		position: relative;
		display: grid;
		place-items: center;
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.1),
			rgba(255, 255, 255, 0.03) 34%,
			rgba(8, 8, 12, 0.34) 100%
		);
		border: 1px solid color-mix(in srgb, var(--card-accent) 22%, rgba(255, 255, 255, 0.08));
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
	}

	.summary-shape-stage::before {
		inset: auto 18% 12% 18%;
		height: 28%;
		border-radius: 999px;

		filter: blur(8px);
		opacity: 0.72;
	}

	.reveal-thumbnail-grid,
	.summary-shape-grid {
		position: relative;
		display: grid;
		justify-content: center;
		align-content: center;
	}

	.reveal-thumbnail-grid {
		filter: drop-shadow(0 0 10px color-mix(in srgb, var(--card-accent) 28%, transparent));
	}

	.summary-shape-cell {
		box-sizing: border-box;
		border-radius: 0.45rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.reveal-thumbnail-cell {
		box-sizing: border-box;
		border-radius: 0.45rem;
		border: 1px solid transparent;
		background: transparent;
	}

	.reveal-thumbnail-cell.filled {
		border-color: color-mix(in srgb, var(--card-accent) 84%, rgba(255, 255, 255, 0.52));
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--card-accent) 92%, white),
			color-mix(in srgb, var(--card-accent) 72%, rgba(18, 24, 34, 0.96)) 62%,
			rgba(10, 12, 18, 0.94) 100%
		);
		box-shadow:
			0 0 18px color-mix(in srgb, var(--card-accent) 44%, transparent),
			inset 0 0 0 1px rgba(255, 255, 255, 0.22),
			inset 0 0 20px rgba(255, 255, 255, 0.22);
	}

	.summary-shape-stage {
		flex: 0 0 auto;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 0.95rem;
	}

	.summary-shape-cell {
		border-radius: 0.28rem;
	}

	.summary-shape-cell.filled {
		border-color: color-mix(in srgb, var(--card-accent) 76%, rgba(255, 255, 255, 0.44));
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--card-accent) 86%, white),
			color-mix(in srgb, var(--card-accent) 68%, rgba(15, 20, 28, 0.94)) 62%,
			rgba(10, 12, 18, 0.92) 100%
		);
		box-shadow:
			0 0 10px color-mix(in srgb, var(--card-accent) 30%, transparent),
			inset 0 0 0 1px rgba(255, 255, 255, 0.16);
	}

	.reveal-card-copy h3 {
		font-size: clamp(1.6rem, 3vw, 2.25rem);
		line-height: 1;
		color: #f4f4f4;
	}

	.reveal-flags {
		justify-content: center;
		position: relative;
		z-index: 1;
	}

	.reveal-pack-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding-top: 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
		color: rgba(244, 244, 244, 0.72);
		position: relative;
		z-index: 1;
	}

	.pack-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1.5rem 1rem;
		align-items: start;
	}

	.bulk-pack-form {
		display: grid;
		gap: 1rem;
	}

	.pack-bulk-toolbar {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.9rem;
		align-items: end;
		padding: 0.95rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.pack-bulk-copy {
		display: grid;
		gap: 0.2rem;
	}

	.pack-bulk-count {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #f4f4f4;
	}

	.pack-bulk-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.6rem;
	}

	.bulk-control-button {
		min-height: 2.5rem;
		padding: 0.7rem 1rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.bulk-control-button.primary {
		background: rgba(255, 214, 102, 0.14);
		border-color: rgba(255, 214, 102, 0.26);
		color: #fff0c2;
	}

	.bulk-control-button.secondary {
		background: rgba(255, 255, 255, 0.05);
		color: #f4f4f4;
	}

	.bulk-control-button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.pack-shelf-item {
		display: grid;
		gap: 0.85rem;
		position: relative;
		justify-items: center;
		align-content: start;
	}

	.pack-card-form {
		width: min(100%, 14rem);
	}

	.pack-card-hitarea {
		width: 100%;
		padding: 0;
		margin: 0;
		appearance: none;
		background: transparent;
		border: 0;
		color: inherit;
		font: inherit;
		text-align: inherit;
		cursor: pointer;
	}

	.pack-card-hitarea:focus-visible {
		outline: none;
	}

	.pack-card-hitarea.is-selected .pack-face-preview {
		transform: translateY(-6px) scale(1.01);
		border-color: rgba(255, 214, 102, 0.42);
		box-shadow:
			0 30px 64px rgba(0, 0, 0, 0.42),
			0 0 0 1px rgba(255, 214, 102, 0.16),
			0 0 52px rgba(255, 214, 102, 0.12);
	}

	.pack-stack-stage {
		position: relative;
		width: min(100%, 14.5rem);
		padding: 0.4rem 0.9rem 0.45rem;
		display: grid;
		place-items: center;
	}

	.pack-stack-backdrop {
		position: absolute;
		top: 0.65rem;
		width: min(100%, 13rem);
		aspect-ratio: 13 / 19;
		border-radius: 1.55rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background:
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 4px, transparent 4px 10px) top /
				100% 0.8rem no-repeat,
			linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(8, 8, 10, 0.76));
		box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
		pointer-events: none;
	}

	.pack-shelf-item.sealed .pack-stack-backdrop {
		background:
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 4px, transparent 4px 10px) top /
				100% 0.8rem no-repeat,
			linear-gradient(180deg, rgba(160, 255, 193, 0.18), rgba(8, 11, 9, 0.8));
	}

	.pack-shelf-item.opened .pack-stack-backdrop {
		background:
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 4px, transparent 4px 10px) top /
				100% 0.8rem no-repeat,
			linear-gradient(180deg, rgba(162, 214, 255, 0.14), rgba(8, 9, 13, 0.82));
	}

	.pack-stack-backdrop-far {
		transform: translate(-0.9rem, 0.45rem) rotate(-9deg) scale(0.98);
		opacity: 0.42;
	}

	.pack-stack-backdrop-near {
		transform: translate(0.9rem, 0.15rem) rotate(7deg) scale(0.99);
		opacity: 0.65;
	}

	.pack-face-preview {
		position: relative;
		justify-self: center;
		width: min(100%, 13rem);
		min-height: 19rem;
		border-radius: 1.55rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		overflow: hidden;
		padding: 1rem 0.95rem 1.1rem;
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		background:
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0 4px, transparent 4px 10px) top /
				100% 0.8rem no-repeat,
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 4px, transparent 4px 10px)
				bottom / 100% 0.8rem no-repeat,
			linear-gradient(
				180deg,
				rgba(255, 255, 255, 0.14),
				rgba(255, 255, 255, 0.03) 22%,
				rgba(8, 8, 10, 0.7) 100%
			);
		box-shadow:
			0 26px 54px rgba(0, 0, 0, 0.36),
			0 0 36px rgba(255, 255, 255, 0.05);
		z-index: 1;
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}

	.pack-card-hitarea:hover .pack-face-preview,
	.pack-card-hitarea:focus-visible .pack-face-preview {
		transform: translateY(-6px) scale(1.01);
		border-color: rgba(255, 255, 255, 0.2);
		box-shadow:
			0 30px 64px rgba(0, 0, 0, 0.42),
			0 0 46px rgba(255, 255, 255, 0.08);
	}

	.pack-card-hitarea:focus-visible .pack-face-preview {
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.14),
			0 0 0 4px rgba(255, 214, 102, 0.18),
			0 30px 64px rgba(0, 0, 0, 0.42);
	}

	.pack-face-preview::before {
		content: none;
	}

	.pack-face-preview::after {
		inset: 0;
		background: linear-gradient(
			120deg,
			rgba(255, 255, 255, 0.24),
			transparent 26%,
			transparent 64%,
			rgba(255, 255, 255, 0.06)
		);
		mix-blend-mode: screen;
	}

	.sealed-preview {
		background: linear-gradient(
			180deg,
			rgba(160, 255, 193, 0.22),
			rgba(255, 255, 255, 0.04) 24%,
			rgba(10, 13, 11, 0.82) 100%
		);
	}

	.opened-preview {
		background: linear-gradient(
			180deg,
			rgba(162, 214, 255, 0.18),
			rgba(255, 255, 255, 0.04) 24%,
			rgba(10, 11, 15, 0.86) 100%
		);
	}

	.pack-face-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.65rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.72);
		position: relative;
		z-index: 1;
	}

	.pack-face-badge {
		justify-self: center;
		padding-top: 0.9rem;
		font-size: 0.78rem;
		font-weight: 800;
		color: #fff9ff;
		position: relative;
		z-index: 1;
	}

	.pack-selection-indicator {
		justify-self: end;
		padding: 0.35rem 0.6rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(0, 0, 0, 0.28);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.82);
		position: relative;
		z-index: 1;
	}

	.pack-card-hitarea.is-selected .pack-selection-indicator {
		background: rgba(255, 214, 102, 0.16);
		border-color: rgba(255, 214, 102, 0.3);
		color: #fff0c2;
	}

	.pack-face-emblem {
		position: relative;
		align-self: center;
		justify-self: center;
		width: min(100%, 8.75rem);
		aspect-ratio: 1 / 1.24;
		display: grid;
		place-items: center;
		z-index: 1;
	}

	.pack-face-orbit {
		position: absolute;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.22);
		background: transparent;
		box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.08);
	}

	.pack-face-orbit-outer {
		inset: 0;
		transform: rotate(8deg);
	}

	.pack-face-orbit-inner {
		inset: 16%;
		transform: rotate(-12deg);
	}

	.pack-face-core {
		justify-self: center;
		align-self: center;
		width: min(100%, 6.8rem);
		aspect-ratio: 1 / 1.18;
		border-radius: 1.4rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.34),
			rgba(255, 255, 255, 0.08) 28%,
			rgba(255, 255, 255, 0.02) 100%
		);
		box-shadow:
			0 16px 36px rgba(0, 0, 0, 0.22),
			inset 0 0 0 1px rgba(255, 255, 255, 0.08);
		position: relative;
		z-index: 1;
	}

	.pack-face-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.68rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.74);
		position: relative;
		z-index: 1;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.pack-context-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
	}

	.pack-shelf-meta {
		width: min(100%, 14.5rem);
		display: grid;
		gap: 0.55rem;
		justify-items: center;
		text-align: center;
	}

	.pack-note {
		font-size: 0.88rem;
		line-height: 1.35;
		text-align: center;
	}

	@media (max-width: 760px) {
		.pack-bulk-toolbar {
			grid-template-columns: 1fr;
		}

		.pack-bulk-actions {
			justify-content: stretch;
		}

		.bulk-control-button {
			flex: 1 1 100%;
		}
	}

	.opened-cards-list {
		display: grid;
		gap: 0.75rem;
	}

	.opened-card-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.8rem 0.9rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.summary-card-row {
		background:
			linear-gradient(180deg, var(--card-accent-soft), rgba(255, 255, 255, 0.03)),
			rgba(255, 255, 255, 0.03);
		border-color: color-mix(in srgb, var(--card-accent) 24%, rgba(255, 255, 255, 0.08));
	}

	.summary-card-row.guaranteed-card {
		box-shadow: inset 0 0 0 1px rgba(255, 214, 102, 0.18);
	}

	.opened-card-main {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		min-width: 0;
	}

	.opened-card-name,
	.opened-card-rarity {
		margin: 0;
	}

	.opened-card-name {
		color: #f4f4f4;
		font-weight: 600;
	}

	.opened-card-rarity {
		margin-top: 0.2rem;
		color: #a5a5a5;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.opened-card-flags {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.45rem;
	}

	.card-flag {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 1.65rem;
		padding: 0 0.65rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.card-flag.guaranteed {
		background: rgba(255, 214, 102, 0.16);
		color: #ffd975;
	}

	.card-flag.new {
		background: rgba(103, 217, 111, 0.18);
		color: #9cf5a2;
	}

	.reveal-card.rarity-normal,
	.summary-card-row.rarity-normal,
	.reveal-progress-node.rarity-normal.is-active,
	.reveal-progress-node.rarity-normal.is-revealed {
		--card-accent: #f0f4f8;
		--card-accent-soft: rgba(240, 244, 248, 0.14);
		--card-accent-glow: rgba(240, 244, 248, 0.26);
		background-color: rgba(240, 244, 248, 0.2);
	}

	.reveal-card.rarity-magic,
	.summary-card-row.rarity-magic,
	.reveal-progress-node.rarity-magic.is-active,
	.reveal-progress-node.rarity-magic.is-revealed {
		--card-accent: #aaceff;
		--card-accent-soft: rgba(170, 206, 255, 0.16);
		--card-accent-glow: rgba(170, 206, 255, 0.32);
		background-color: rgba(170, 206, 255, 0.24);
	}

	.reveal-card.rarity-rare,
	.summary-card-row.rarity-rare,
	.reveal-progress-node.rarity-rare.is-active,
	.reveal-progress-node.rarity-rare.is-revealed {
		--card-accent: #ffe899;
		--card-accent-soft: rgba(255, 232, 153, 0.18);
		--card-accent-glow: rgba(255, 232, 153, 0.34);
		background-color: rgba(255, 232, 153, 0.24);
	}

	.reveal-card.rarity-exotic,
	.summary-card-row.rarity-exotic,
	.reveal-progress-node.rarity-exotic.is-active,
	.reveal-progress-node.rarity-exotic.is-revealed {
		--card-accent: #ffaaaa;
		--card-accent-soft: rgba(255, 170, 170, 0.18);
		--card-accent-glow: rgba(255, 170, 170, 0.34);
		background-color: rgba(255, 170, 170, 0.24);
	}

	.reveal-card.rarity-legendary,
	.summary-card-row.rarity-legendary,
	.reveal-progress-node.rarity-legendary.is-active,
	.reveal-progress-node.rarity-legendary.is-revealed {
		--card-accent: #e09c5c;
		--card-accent-soft: rgba(224, 156, 92, 0.18);
		--card-accent-glow: rgba(224, 156, 92, 0.36);
		background-color: rgba(224, 156, 92, 0.24);
	}

	@keyframes reveal-rise {
		from {
			opacity: 0;
			transform: translateY(0.4rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.empty-state {
		place-items: start;
	}

	.full-width {
		min-height: 12rem;
		align-content: center;
	}

	@media (max-width: 640px) {
		.reveal-progress-header {
			grid-template-columns: 1fr;
		}

		.reveal-pack-face {
			min-height: 30rem;
			width: 100%;
		}

		.reveal-pack-footer,
		.pack-face-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.reveal-action-button {
			width: 100%;
		}

		.summary-strip,
		.pack-context-row {
			gap: 0.4rem;
		}

		.pack-card-topline {
			align-items: flex-start;
			flex-direction: column;
		}

		.pack-stack-stage {
			padding-inline: 0.35rem;
		}

		.pack-stack-backdrop-far {
			transform: translate(-0.55rem, 0.35rem) rotate(-7deg) scale(0.99);
		}

		.pack-stack-backdrop-near {
			transform: translate(0.55rem, 0.1rem) rotate(5deg) scale(1);
		}

		.pack-face-preview,
		.reveal-pack-face {
			clip-path: polygon(
				8% 0,
				92% 0,
				97% 4.5%,
				100% 10%,
				100% 90%,
				97% 95.5%,
				92% 100%,
				8% 100%,
				3% 95.5%,
				0 90%,
				0 10%,
				3% 4.5%
			);
		}

		.opened-card-row {
			flex-direction: column;
		}

		.opened-card-main {
			width: 100%;
		}

		.reveal-card-topline {
			align-items: flex-start;
			flex-direction: column;
		}

		.opened-card-flags {
			justify-content: flex-start;
		}
	}
</style>
