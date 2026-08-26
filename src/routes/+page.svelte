<script lang="ts">
	import {
		baselineCombatProfile,
		campaigns,
		getCampaignLevel,
		getLoadoutItemDefinition,
		starterWeaponId
	} from '$lib/data';
	import { getActiveLoadoutPlacements } from '$lib/game/loadout-slots';
	import {
		getPlacementMirrored,
		getPlacementRotation,
		transformWeaponShape
	} from '$lib/game/loadout-rotation';
	import type { WeaponRarity } from '$lib/data/types';
	import type { PageServerData } from './$types';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { createPixlIntroSketch } from '$lib/p5/pixl-intro-sketch';

	interface ActionCard {
		label: string;
		description: string;
		href: string;
		tone: 'primary' | 'neutral';
	}

	interface RecentPickup {
		instanceId: string;
		name: string;
		rarity: WeaponRarity;
		source: string;
		acquiredAt: string;
	}

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

	let { data }: { data: PageServerData } = $props();

	const loginHref = '/auth/login';
	const dashboardHref = '/dashboard';
	const campaignsHref = '/campaigns';
	const leaderboardsHref = '/leaderboards';
	const campaignCount = Object.keys(campaigns).length;
	let persistedPixlState = $derived(data.gameState?.pixlState ?? null);
	let campaignProgressRows = $derived(data.gameState?.campaignProgress ?? []);
	let topLeaders = $derived((data.topLeaders ?? []) as LeaderboardRow[]);
	const introSketch = (p: import('p5').default) =>
		createPixlIntroSketch({
			pixlState: data.gameState?.pixlState ?? null,
			showCrown: data.isTopLeader ?? false
		})(p);

	let primaryCampaignProgress = $derived.by(() => {
		return (
			[...campaignProgressRows].sort((left, right) => {
				const leftTime = new Date(left.lastPlayedAt).getTime();
				const rightTime = new Date(right.lastPlayedAt).getTime();

				if (rightTime !== leftTime) {
					return rightTime - leftTime;
				}

				return right.currentLevel - left.currentLevel || left.campaignId - right.campaignId;
			})[0] ?? null
		);
	});

	let primaryCampaignId = $derived(primaryCampaignProgress?.campaignId ?? 1);
	let primaryCampaign = $derived(
		campaigns[primaryCampaignId as keyof typeof campaigns] ?? Object.values(campaigns)[0]
	);
	let currentCampaignLevelData = $derived.by(() => {
		return getCampaignLevel(primaryCampaignId, primaryCampaignProgress?.currentLevel ?? 1);
	});
	let currentCampaignHref = $derived(`/campaigns/${primaryCampaignId}`);
	let currentLoadoutHref = $derived(`/campaigns/${primaryCampaignId}/loadout`);
	let currentShopHref = $derived(`/campaigns/${primaryCampaignId}/shop`);
	let currentManagementHref = $derived(`/campaigns/${primaryCampaignId}/management`);
	let currentStatsHref = $derived(`/campaigns/${primaryCampaignId}?stats=open`);

	let activeLoadoutPlacements = $derived(
		persistedPixlState ? getActiveLoadoutPlacements(persistedPixlState.loadoutPlacements) : []
	);
	let loadoutPreviewColumnCount = $derived(persistedPixlState?.loadoutColumns ?? 6);
	let loadoutPreviewCells = $derived.by(() => {
		const rows = persistedPixlState?.loadoutRows ?? 3;
		const columns = persistedPixlState?.loadoutColumns ?? 6;
		const occupied: Record<string, WeaponRarity> = {};

		for (const placement of activeLoadoutPlacements) {
			const ownedWeapon = persistedPixlState?.ownedWeapons.find(
				(weapon) => weapon.instanceId === placement.weaponInstanceId
			);

			if (!ownedWeapon) {
				continue;
			}

			const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);
			const shape = transformWeaponShape(
				definition.shape,
				getPlacementRotation(placement),
				getPlacementMirrored(placement)
			);

			for (const [shapeX, shapeY] of shape.cells) {
				occupied[`${placement.x + shapeX}:${placement.y + shapeY}`] = definition.rarity;
			}
		}

		return Array.from({ length: rows * columns }, (_, index) => {
			const x = index % columns;
			const y = Math.floor(index / columns);
			const key = `${x}:${y}`;

			return {
				key,
				rarity: occupied[key] ?? null
			};
		});
	});

	let equippedWeaponBadges = $derived.by(() => {
		return activeLoadoutPlacements
			.map((placement) => {
				const ownedWeapon = persistedPixlState?.ownedWeapons.find(
					(weapon) => weapon.instanceId === placement.weaponInstanceId
				);

				if (!ownedWeapon) {
					return null;
				}

				return {
					key: ownedWeapon.instanceId,
					name: getLoadoutItemDefinition(ownedWeapon.definitionId).name
				};
			})
			.filter((badge): badge is { key: string; name: string } => badge !== null)
			.slice(0, 4);
	});

	let duplicateOverflowCount = $derived.by(() => {
		if (!persistedPixlState) {
			return 0;
		}

		const counts: Record<string, number> = {};

		for (const weapon of persistedPixlState.ownedWeapons) {
			counts[weapon.definitionId] = (counts[weapon.definitionId] ?? 0) + 1;
		}

		return Object.values(counts).reduce((total, count) => total + Math.max(0, count - 1), 0);
	});

	let recentPickups = $derived.by(() => {
		if (!persistedPixlState) {
			return [] as RecentPickup[];
		}

		return [...persistedPixlState.ownedWeapons]
			.filter((weapon) => weapon.definitionId !== starterWeaponId)
			.sort(
				(left, right) => new Date(right.acquiredAt).getTime() - new Date(left.acquiredAt).getTime()
			)
			.slice(0, 4)
			.map((weapon) => {
				const definition = getLoadoutItemDefinition(weapon.definitionId);

				return {
					instanceId: weapon.instanceId,
					name: definition.name,
					rarity: definition.rarity,
					source: weapon.source,
					acquiredAt: weapon.acquiredAt
				};
			});
	});

	let commandCenterActions = $derived.by(() => {
		if (!persistedPixlState) {
			return [
				{
					label: 'Enter arena',
					description: 'Start a campaign run and see the live arena systems in motion.',
					href: campaignsHref,
					tone: 'primary'
				}
			] satisfies ActionCard[];
		}

		const actions: ActionCard[] = [];

		if (persistedPixlState.perkPoints > 0) {
			actions.push({
				label: `Spend ${persistedPixlState.perkPoints} perk point${persistedPixlState.perkPoints === 1 ? '' : 's'}`,
				description: 'Open the arena stats pane and invest permanent progression immediately.',
				href: currentStatsHref,
				tone: 'primary'
			});
		}

		if (duplicateOverflowCount > 0) {
			actions.push({
				label: `Scrap ${duplicateOverflowCount} duplicate${duplicateOverflowCount === 1 ? '' : 's'}`,
				description: 'Clean up overflow copies and turn them into Scrap for future purchases.',
				href: currentLoadoutHref,
				tone: 'neutral'
			});
		}

		if (recentPickups.length > 0) {
			actions.push({
				label: 'Review recent drops',
				description: 'Check the latest weapons and decide whether your loadout wants a rework.',
				href: currentLoadoutHref,
				tone: 'neutral'
			});
		}

		actions.push({
			label: `Push Campaign ${primaryCampaignId}`,
			description: `Continue at Stage ${currentCampaignLevelData.stage} · Level ${currentCampaignLevelData.stageLevel}.`,
			href: currentCampaignHref,
			tone: actions.length === 0 ? 'primary' : 'neutral'
		});

		if (persistedPixlState.scrap > 0) {
			actions.push({
				label: 'Check the shop',
				description: 'Spend Scrap on targeted upgrades or shop-exclusive answers to weak matchups.',
				href: currentShopHref,
				tone: 'neutral'
			});
		}

		return actions.slice(0, 4);
	});

	function navigateTo(path: string) {
		window.location.assign(path);
	}

	function getLeaderboardProgressLabel(leader: LeaderboardRow) {
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
	<title>pixlvl</title>
</svelte:head>

<div class="page">
	<section class="shell">
		{#if data.user && data.session && persistedPixlState && primaryCampaignProgress}
			<div class="hero-card panel signed-in-hero-card">
				<div class="hero-copy">
					<p class="eyebrow">Command center</p>
					<h1>Keep your `pixl` moving.</h1>
					<p class="lede">
						Campaign {primaryCampaignId} is live at Stage {currentCampaignLevelData.stage} · Level
						{currentCampaignLevelData.stageLevel}. Your next best move should be visible at a
						glance.
					</p>

					<div class="hero-actions">
						<button class="primary" type="button" onclick={() => navigateTo(currentCampaignHref)}>
							Continue run
						</button>
						<button class="secondary" type="button" onclick={() => navigateTo(currentLoadoutHref)}>
							Open loadout
						</button>
						<button class="secondary" type="button" onclick={() => navigateTo(currentShopHref)}>
							Open shop
						</button>
					</div>

					<div class="hero-pill-row">
						<span class="status-pill">Signed in as {data.user.name || data.user.email}</span>
						<span class="status-pill">{persistedPixlState.perkPoints} perk points</span>
						<span class="status-pill">{persistedPixlState.scrap} scrap</span>
					</div>
				</div>
			</div>

			<div class="overview-grid">
				<section class="panel recommendation-panel">
					<div class="section-head">
						<p class="eyebrow">Next actions</p>
						<h2>Recommended right now</h2>
					</div>

					<div class="action-list">
						{#each commandCenterActions as action, index (action.label)}
							<button
								class={`action-card ${action.tone}`}
								type="button"
								onclick={() => navigateTo(action.href)}
							>
								<div>
									<span class="action-index">{index + 1}</span>
									<strong>{action.label}</strong>
								</div>
								<p>{action.description}</p>
							</button>
						{/each}
					</div>
				</section>

				<section class="panel snapshot-panel">
					<div class="section-head">
						<p class="eyebrow">Progress snapshot</p>
						<h2>Campaign and build state</h2>
					</div>

					<div class="metrics-grid">
						<div class="metric-card accent-card">
							<span>Current level</span>
							<strong>{primaryCampaignProgress.currentLevel}</strong>
						</div>
						<div class="metric-card">
							<span>Highest cleared</span>
							<strong>{primaryCampaignProgress.highestClearedLevel}</strong>
						</div>
						<div class="metric-card">
							<span>Pixl level</span>
							<strong>{persistedPixlState.level}</strong>
						</div>
						<div class="metric-card">
							<span>Equipped</span>
							<strong>{activeLoadoutPlacements.length}</strong>
						</div>
						<div class="metric-card">
							<span>Loadout size</span>
							<strong>{persistedPixlState.loadoutRows} × {persistedPixlState.loadoutColumns}</strong
							>
						</div>
						<div class="metric-card">
							<span>Owned weapons</span>
							<strong>{persistedPixlState.ownedWeapons.length}</strong>
						</div>
					</div>

					<div class="route-actions">
						<button
							class="secondary"
							type="button"
							onclick={() => navigateTo(currentManagementHref)}
						>
							Campaign overview
						</button>
						<button class="secondary" type="button" onclick={() => navigateTo(currentStatsHref)}>
							Open stats pane
						</button>
						<button class="secondary" type="button" onclick={() => navigateTo(dashboardHref)}>
							Account dashboard
						</button>
					</div>
				</section>

				<section class="panel build-panel">
					<div class="section-head">
						<p class="eyebrow">Build snapshot</p>
						<h2>Current loadout</h2>
					</div>

					<div
						class="build-preview-grid"
						style={`--preview-columns: ${loadoutPreviewColumnCount};`}
					>
						{#each loadoutPreviewCells as cell (cell.key)}
							<div
								class={`preview-cell ${cell.rarity ? `filled rarity-${cell.rarity}` : ''}`}
							></div>
						{/each}
					</div>

					{#if equippedWeaponBadges.length > 0}
						<div class="build-tags">
							{#each equippedWeaponBadges as badge (badge.key)}
								<span class="build-tag">{badge.name}</span>
							{/each}
						</div>
					{:else}
						<p class="muted-copy">No active loadout saved yet.</p>
					{/if}
				</section>

				<section class="panel loot-panel">
					<div class="section-head">
						<p class="eyebrow">Recent rewards</p>
						<h2>Latest pickups</h2>
					</div>

					{#if recentPickups.length > 0}
						<div class="pickup-list">
							{#each recentPickups as pickup (pickup.instanceId)}
								<div class={`pickup-row rarity-${pickup.rarity}`}>
									<div>
										<strong>{pickup.name}</strong>
										<span>{pickup.source}</span>
									</div>
									<time>{new Date(pickup.acquiredAt).toLocaleDateString()}</time>
								</div>
							{/each}
						</div>
					{:else}
						<p class="muted-copy">
							No drops yet. Push into the arena to start building a real weapon bench.
						</p>
					{/if}
				</section>

				<section class="panel leaderboard-panel">
					<div class="section-head">
						<p class="eyebrow">Top progression</p>
						<h2>Current leaders</h2>
					</div>

					{#if topLeaders.length > 0}
						<div class="leaderboard-list">
							{#each topLeaders as leader (leader.userId)}
								<div class="leaderboard-row">
									<div class="leaderboard-rank">#{leader.rank}</div>
									<div class="leaderboard-copy">
										<strong>{leader.displayName}</strong>
										<span>{getLeaderboardProgressLabel(leader)}</span>
									</div>
									<div class="leaderboard-meta">
										<strong>Lv {leader.pixlLevel}</strong>
										<span>{leader.totalXp} XP</span>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="muted-copy">No leaderboard entries yet.</p>
					{/if}

					<div class="route-actions">
						<button class="secondary" type="button" onclick={() => navigateTo(leaderboardsHref)}>
							Open full leaderboard
						</button>
					</div>
				</section>
			</div>
		{:else}
			<div class="hero-card panel guest-hero">
				<div class="hero-copy">
					<p class="eyebrow">pixlvl</p>
					<h1>Build a self-running `pixl` and keep the arena under control.</h1>
					<p class="lede">
						Shape your loadout, chase drops, and steadily harden your pixl across {campaignCount}
						campaigns.
					</p>

					<div class="hero-actions">
						<button class="primary" type="button" onclick={() => navigateTo(campaignsHref)}>
							Enter arena
						</button>
						<button class="secondary" type="button" onclick={() => navigateTo(loginHref)}>
							Sign in to save progress
						</button>
					</div>
				</div>

				<div class="hero-visual panel inset-panel">
					<div class="hero-visual-copy">
						<h2>What carries forward</h2>
						<p>XP, perks, loadout growth, weapon collection, and your evolving build puzzle.</p>
					</div>
					<P5Canvas class="canvas-frame" sketch={introSketch} />
				</div>
			</div>

			<div class="overview-grid guest-grid">
				<section class="panel snapshot-panel">
					<div class="section-head">
						<p class="eyebrow">Baseline stats</p>
						<h2>Starting pixl</h2>
					</div>

					<div class="metrics-grid">
						<div class="metric-card accent-card">
							<span>Health</span>
							<strong>{baselineCombatProfile.pixl.health}</strong>
						</div>
						<div class="metric-card">
							<span>Attack speed</span>
							<strong>{baselineCombatProfile.pixl.attackSpeed.toFixed(1)}/s</strong>
						</div>
						<div class="metric-card">
							<span>Campaigns</span>
							<strong>{campaignCount}</strong>
						</div>
						<div class="metric-card">
							<span>Starter weapon</span>
							<strong>1</strong>
						</div>
					</div>
				</section>

				<section class="panel recommendation-panel">
					<div class="section-head">
						<p class="eyebrow">Why start here</p>
						<h2>Useful first steps</h2>
					</div>

					<div class="action-list">
						<button
							class="action-card primary"
							type="button"
							onclick={() => navigateTo(campaignsHref)}
						>
							<div>
								<span class="action-index">1</span>
								<strong>Enter the arena</strong>
							</div>
							<p>See the auto-combat loop immediately and start collecting real drops.</p>
						</button>
						<button class="action-card neutral" type="button" onclick={() => navigateTo(loginHref)}>
							<div>
								<span class="action-index">2</span>
								<strong>Sign in for persistence</strong>
							</div>
							<p>Keep XP, weapons, and loadout progress instead of treating runs as a preview.</p>
						</button>
					</div>
				</section>

				<section class="panel leaderboard-panel">
					<div class="section-head">
						<p class="eyebrow">Top progression</p>
						<h2>Current leaders</h2>
					</div>

					{#if topLeaders.length > 0}
						<div class="leaderboard-list">
							{#each topLeaders as leader (leader.userId)}
								<div class="leaderboard-row">
									<div class="leaderboard-rank">#{leader.rank}</div>
									<div class="leaderboard-copy">
										<strong>{leader.displayName}</strong>
										<span>{getLeaderboardProgressLabel(leader)}</span>
									</div>
									<div class="leaderboard-meta">
										<strong>Lv {leader.pixlLevel}</strong>
										<span>{leader.totalXp} XP</span>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="muted-copy">No leaderboard entries yet.</p>
					{/if}

					<div class="route-actions">
						<button class="secondary" type="button" onclick={() => navigateTo(leaderboardsHref)}>
							Open full leaderboard
						</button>
					</div>
				</section>
			</div>
		{/if}
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
		width: min(100%, 84rem);
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

	.hero-card {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(19rem, 0.8fr);
		gap: 1rem;
		padding: 1rem;
	}

	.signed-in-hero-card {
		grid-template-columns: minmax(0, 1fr);
	}

	.hero-copy {
		padding: 1.1rem;
		display: grid;
		align-content: center;
		gap: 1rem;
	}

	.hero-visual {
		padding: 0.9rem;
		display: grid;
		gap: 0.75rem;
	}

	.inset-panel {
		background: rgba(255, 255, 255, 0.02);
	}

	.hero-visual-copy {
		display: grid;
		gap: 0.25rem;
		padding: 0.35rem 0.35rem 0;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
		gap: 1rem;
		align-items: start;
	}

	.guest-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.recommendation-panel,
	.snapshot-panel,
	.build-panel,
	.loot-panel,
	.leaderboard-panel {
		padding: 1rem;
		display: grid;
		gap: 0.9rem;
	}

	.build-panel,
	.loot-panel,
	.leaderboard-panel {
		min-height: 100%;
	}

	.section-head {
		display: grid;
		gap: 0.25rem;
	}

	.section-head h2,
	.section-head p,
	.hero-visual-copy h2,
	.hero-visual-copy p,
	.lede,
	h1,
	time,
	.muted-copy,
	.status-pill,
	.action-card p,
	.action-card strong,
	.pickup-row strong,
	.pickup-row span {
		margin: 0;
	}

	.eyebrow {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #9ba09d;
	}

	h1 {
		font-size: clamp(2.4rem, 4vw, 4.4rem);
		line-height: 0.94;
		max-width: 12ch;
	}

	h2 {
		font-size: 1.08rem;
		margin: 0;
	}

	.lede,
	.section-head p,
	.hero-visual-copy p,
	.muted-copy,
	.action-card p,
	.pickup-row span,
	time {
		font-size: 0.95rem;
		line-height: 1.55;
		color: #c6c6cb;
	}

	.hero-actions,
	.route-actions,
	.build-tags,
	.hero-pill-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.hero-pill-row {
		gap: 0.55rem;
	}

	button {
		font: inherit;
	}

	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.85rem;
		padding: 0.8rem 1.1rem;
		border-radius: 999px;
		font-weight: 700;
		cursor: pointer;
	}

	.primary {
		background: #e9ffd7;
		color: #0b110a;
	}

	.secondary {
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.05);
		color: #f5f5f5;
	}

	.status-pill,
	.build-tag {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 1.8rem;
		padding: 0 0.7rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
		font-size: 0.78rem;
		font-weight: 600;
		color: #f2f2f4;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.7rem;
	}

	.metric-card {
		padding: 0.85rem 0.95rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		gap: 0.28rem;
	}

	.metric-card span {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9fa3a9;
	}

	.metric-card strong {
		font-size: 1.12rem;
	}

	.accent-card {
		background: linear-gradient(180deg, rgba(117, 255, 174, 0.12), rgba(255, 255, 255, 0.03));
		border-color: rgba(117, 255, 174, 0.22);
	}

	.action-list,
	.pickup-list,
	.leaderboard-list {
		display: grid;
		gap: 0.7rem;
	}

	.action-card {
		padding: 0.95rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.09);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		gap: 0.35rem;
		color: #f5f5f5;
		font: inherit;
		cursor: pointer;
		text-align: left;
	}

	.action-card > div {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.action-card.primary {
		border-color: rgba(117, 255, 174, 0.26);
		background: linear-gradient(180deg, rgba(117, 255, 174, 0.12), rgba(255, 255, 255, 0.04));
	}

	.action-index {
		width: 1.55rem;
		height: 1.55rem;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.76rem;
		font-weight: 800;
		background: rgba(255, 255, 255, 0.08);
		color: #f5f5f5;
	}

	.build-preview-grid {
		display: grid;
		grid-template-columns: repeat(var(--preview-columns, 6), minmax(0, 1fr));
		gap: 0.2rem;
		padding: 0.7rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.02);
	}

	.preview-cell {
		aspect-ratio: 1;
		border-radius: 0.35rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.04);
	}

	.preview-cell.filled.rarity-normal {
		background: rgba(226, 226, 231, 0.28);
	}

	.preview-cell.filled.rarity-magic {
		background: rgba(117, 156, 255, 0.42);
	}

	.preview-cell.filled.rarity-rare {
		background: rgba(255, 215, 123, 0.55);
	}

	.preview-cell.filled.rarity-exotic {
		background: rgba(255, 140, 92, 0.58);
	}

	.preview-cell.filled.rarity-legendary {
		background: rgba(140, 255, 154, 0.54);
	}

	.pickup-row {
		padding: 0.85rem 0.95rem;
		border-radius: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.65rem;
		align-items: center;
	}

	.leaderboard-row {
		padding: 0.85rem 0.95rem;
		border-radius: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 0.75rem;
		align-items: center;
	}

	.leaderboard-rank {
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.78rem;
		font-weight: 800;
		background: rgba(117, 255, 174, 0.12);
		border: 1px solid rgba(117, 255, 174, 0.18);
		color: #ebffe7;
	}

	.leaderboard-copy,
	.leaderboard-meta {
		display: grid;
		gap: 0.14rem;
	}

	.leaderboard-copy strong,
	.leaderboard-meta strong {
		margin: 0;
	}

	.leaderboard-copy span,
	.leaderboard-meta span {
		font-size: 0.9rem;
		line-height: 1.45;
		color: #c6c6cb;
	}

	.leaderboard-meta {
		text-align: right;
	}

	.pickup-row > div {
		display: grid;
		gap: 0.12rem;
	}

	.pickup-row.rarity-normal strong {
		color: #f1f1f1;
	}

	.pickup-row.rarity-magic strong {
		color: #9ec2ff;
	}

	.pickup-row.rarity-rare strong {
		color: #ffe08f;
	}

	.pickup-row.rarity-exotic strong {
		color: #ffb08f;
	}

	.pickup-row.rarity-legendary strong {
		color: #c2ffb6;
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

	@media (max-width: 980px) {
		.hero-card,
		.overview-grid,
		.guest-grid {
			grid-template-columns: 1fr;
		}

		.metrics-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.page {
			padding: 0.9rem;
		}

		.hero-copy,
		.recommendation-panel,
		.snapshot-panel,
		.build-panel,
		.loot-panel {
			padding: 0.9rem;
		}

		h1 {
			font-size: 2rem;
		}

		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.pickup-row {
			grid-template-columns: 1fr;
		}

		.leaderboard-row {
			grid-template-columns: auto minmax(0, 1fr);
		}

		.leaderboard-meta {
			grid-column: 2;
			text-align: left;
		}

		.route-actions,
		.hero-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.primary,
		.secondary {
			width: 100%;
		}
	}
</style>
