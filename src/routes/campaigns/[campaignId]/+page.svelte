<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { fade } from 'svelte/transition';
	import ArenaStatsOverlay from '$lib/components/campaigns/ArenaStatsOverlay.svelte';
	import CampaignStageDrawer from '$lib/components/campaigns/CampaignStageDrawer.svelte';
	import CampaignRouteNav from '$lib/components/campaigns/CampaignRouteNav.svelte';
	import LevelResultsPopup from '$lib/components/campaigns/LevelResultsPopup.svelte';
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { applyPendingPixlvlSaveWipe } from '$lib/game/client-storage';
	import { getActiveLoadoutPlacements } from '$lib/game/loadout-slots';
	import {
		buildCurrentLoadoutRows,
		buildOverlayStatCards,
		buildRewardDropRows,
		buildRewardPackRows,
		buildUnlockedStages,
		createInitialCombatOverlay,
		type CombatOverlayState
	} from './arena-helpers';
	import {
		createArenaCombatSketch,
		createLoadoutSweepPreviewSketch,
		type ArenaCombatResumeState
	} from '$lib/p5/arena-combat-sketch';
	import {
		applyUpgradePurchase,
		createUpgradeablePixlState,
		createBaselineUpgradeablePixlState,
		getXpProgress,
		getUpgradeOptions,
		isUpgradeKey,
		resetUpgradeAllocations
	} from '$lib/game/upgrades';
	import type { LoadoutItemDefinition, PersistedRewardPack } from '$lib/data/types';
	import type { PageProps } from './$types';

	type LocalRunMode = 'management' | 'combat';

	type LivePixlState = NonNullable<NonNullable<PageProps['data']['gameState']>['pixlState']>;
	type LiveCampaignState = NonNullable<PageProps['data']['campaignState']>;
	type PixlStateOverride = Pick<
		LivePixlState,
		| 'xp'
		| 'level'
		| 'perkPoints'
		| 'defence'
		| 'agility'
		| 'health'
		| 'attackSpeed'
		| 'loadoutRows'
		| 'loadoutColumns'
		| 'ownedWeapons'
	>;
	type CampaignStateOverride = Pick<
		LiveCampaignState,
		'currentLevel' | 'highestUnlockedLevel' | 'highestClearedLevel' | 'completed'
	>;

	interface SketchStateUpdate {
		xp: number;
		level: number;
		perkPoints: number;
		defence: number;
		agility: number;
		health: number;
		attackSpeed: number;
		loadoutRows: number;
		loadoutColumns: number;
		ownedWeapons: LivePixlState['ownedWeapons'];
		rewardPacks: PersistedRewardPack[];
		currentLevel: number;
		highestUnlockedLevel: number;
		highestClearedLevel: number;
		completed: boolean;
	}

	interface ArenaResumeSnapshot {
		campaignId: number;
		xp: number;
		defence: number;
		agility: number;
		ownedWeapons: LivePixlState['ownedWeapons'];
		currentLevel: number;
		highestUnlockedLevel: number;
		highestClearedLevel: number;
		completed: boolean;
	}

	interface ChangeLogEntry {
		id: string;
		title: string;
		detail: string;
		timestamp: number;
		tone: 'neutral' | 'positive';
		rarity?: LoadoutItemDefinition['rarity'];
	}

	type CombatOverlayStateUpdate = Parameters<
		NonNullable<NonNullable<Parameters<typeof createArenaCombatSketch>[2]>['onCombatStateChange']>
	>[0] & { rewardPacks?: CombatOverlayState['rewardPacks'] };

	const MOBILE_LAYOUT_BREAKPOINT = 860;
	const MAX_CHANGE_LOG_ENTRIES = 12;
	const getArenaResumeStorageKey = (campaignId: number) => `pixlvl-arena-resume-${campaignId}`;
	const getArenaCombatResumeStorageKey = (campaignId: number) =>
		`pixlvl-arena-combat-resume-${campaignId}`;
	const getArenaUpgradeScrollStorageKey = (campaignId: number) =>
		`pixlvl-arena-upgrade-scroll-${campaignId}`;
	const getLoadoutChangeLogStorageKey = (campaignId: number) =>
		`pixlvl-loadout-change-log-${campaignId}`;

	let { data, form }: PageProps = $props();
	let innerWidth = $state<number | null>(null);
	let isMobileLayout = $derived(innerWidth !== null && innerWidth <= MOBILE_LAYOUT_BREAKPOINT);
	let runMode = $state<LocalRunMode>('combat');
	let showStatsOverlay = $state(false);
	let showStageDrawer = $state(false);
	let showLoadoutPreview = $state(true);
	let showChangeLogPopup = $state(false);
	let skipResultsSignal = $state(0);
	let combatResumeState = $state.raw<ArenaCombatResumeState | null>(null);
	let latestCombatResumeState = $state.raw<ArenaCombatResumeState | null>(null);
	let changeLogEntries = $state.raw<ChangeLogEntry[]>([]);
	let unreadChangeLogCount = $state(0);
	let livePackNotificationCount = $state(0);
	let pendingRewardPacks = $state.raw<PersistedRewardPack[]>([]);
	let latestLevelRewardPacks = $state.raw<PersistedRewardPack[]>([]);
	let hasLoadedChangeLogState = false;
	let lastPersistedChangeLogJson = '';
	let seenArenaDropInstanceIds = new Set<string>();
	let seenArenaRewardPackIds = new Set<string>();
	let hasInitializedArenaDropTracking = false;
	let pixlStateOverride = $state.raw<PixlStateOverride | null>(null);
	let campaignStateOverride = $state.raw<CampaignStateOverride | null>(null);
	let livePixlState: LivePixlState | null = $derived.by(() => {
		const basePixlState = data.gameState?.pixlState ?? null;

		if (!basePixlState) {
			return null;
		}

		return {
			...basePixlState,
			...(pixlStateOverride ?? {})
		};
	});
	let liveCampaignState: LiveCampaignState | null = $derived.by(() => {
		const baseCampaignState = data.campaignState ?? null;

		if (!baseCampaignState) {
			return null;
		}

		return {
			...baseCampaignState,
			...(campaignStateOverride ?? {})
		};
	});
	let combatOverlayOverride = $state<CombatOverlayState | null>(null);
	let combatOverlay = $derived(combatOverlayOverride ?? createInitialCombatOverlay(data));
	let upgradeState = $derived(
		livePixlState ?? data.gameState?.pixlState ?? createBaselineUpgradeablePixlState()
	);
	let overlayUpgradeOptions = $derived(getUpgradeOptions(upgradeState));
	let overlayStatCards = $derived(buildOverlayStatCards(upgradeState));
	let weaponDefinitionById = $derived(
		data.weaponDefinitionsById as Record<string, LoadoutItemDefinition>
	);
	let ownedWeapons = $derived(livePixlState?.ownedWeapons ?? []);
	let loadoutPlacements = $derived(
		getActiveLoadoutPlacements(
			livePixlState?.loadoutPlacements ?? { activeSlot: 0, slots: [[], [], []] }
		)
	);
	let isEndlessCampaign = $derived(data.campaign.mode === 'endless');
	let sketchCampaignLevel = $derived(
		liveCampaignState?.currentLevel ?? data.campaignState?.currentLevel ?? 1
	);
	let highestUnlockedLevel = $derived(
		liveCampaignState?.highestUnlockedLevel ?? data.campaignState?.highestUnlockedLevel ?? 1
	);
	let highestClearedLevel = $derived(
		liveCampaignState?.highestClearedLevel ?? data.campaignState?.highestClearedLevel ?? 0
	);
	let currentStage = $derived.by(() => {
		if (isEndlessCampaign) {
			return combatOverlay.stage;
		}

		return Math.ceil(sketchCampaignLevel / data.campaign.levelsPerStage);
	});
	let unlockedStages = $derived.by(() =>
		buildUnlockedStages(
			data.campaign.stages,
			data.campaign.levelsPerStage,
			highestUnlockedLevel,
			highestClearedLevel,
			currentStage
		)
	);
	let currentLoadoutRows = $derived.by(() =>
		buildCurrentLoadoutRows(ownedWeapons, loadoutPlacements, weaponDefinitionById)
	);
	let loadoutSignature = $derived(
		currentLoadoutRows
			.map((weapon) => `${weapon.weaponInstanceId}:${weapon.x}:${weapon.y}:${weapon.rotation}`)
			.join('|')
	);
	let previewPixlState = $derived(livePixlState ?? data.gameState?.pixlState ?? null);
	let progressionSignature = $derived(
		`${upgradeState.xp}:${upgradeState.defence}:${upgradeState.agility}:${upgradeState.health}:${upgradeState.attackSpeed}:${upgradeState.loadoutRows}:${upgradeState.loadoutColumns}`
	);
	let sketchRemountKey = $derived(
		`${data.campaignId}:${runMode}:${sketchCampaignLevel}:${loadoutSignature}:${progressionSignature}`
	);
	let loadoutPreviewRemountKey = $derived(
		`${data.campaignId}:${loadoutSignature}:${previewPixlState?.attackSpeed ?? 0}:${upgradeState.loadoutRows}:${upgradeState.loadoutColumns}`
	);
	let currentXpProgress = $derived(getXpProgress(upgradeState));
	let combatHealthRatio = $derived(
		combatOverlay.maxPixlHealth > 0 ? combatOverlay.pixlHealth / combatOverlay.maxPixlHealth : 0
	);
	let combatShieldRatio = $derived(
		combatOverlay.maxPixlHealth > 0
			? Math.min(1, combatOverlay.pixlShieldPool / combatOverlay.maxPixlHealth)
			: 0
	);
	let combatXpRatio = $derived(
		currentXpProgress.xpNeeded > 0
			? Math.min(1, Math.max(0, currentXpProgress.xpIntoLevel / currentXpProgress.xpNeeded))
			: 0
	);
	let combatXpLabel = $derived(
		`XP ${currentXpProgress.xpIntoLevel} / ${currentXpProgress.xpNeeded} · L${currentXpProgress.nextLevel} next`
	);
	let combatStatusLabel = $derived.by(() => {
		if (combatOverlay.status === 'running' || combatOverlay.status === 'cleared') return null;
		if (combatOverlay.status === 'defeated') return 'PIXL DOWN';
		if (combatOverlay.status === 'complete') return null;
		return null;
	});
	let combatStatusTone = $derived(combatOverlay.status === 'defeated' ? 'danger' : 'neutral');
	let ownedDefinitionIdsBeforeDrops = $derived.by(() => {
		return new Set(ownedWeapons.map((weapon) => weapon.definitionId));
	});
	let rewardDropRows = $derived.by(() =>
		buildRewardDropRows(
			combatOverlay.waveDrops,
			weaponDefinitionById,
			ownedDefinitionIdsBeforeDrops
		)
	);
	let rewardPackRows = $derived.by(() =>
		buildRewardPackRows(latestLevelRewardPacks).map((pack) => ({
			...pack,
			isSpecial:
				(latestLevelRewardPacks.find((entry) => entry.id === pack.id) ?? null)?.kind ===
					'special' ||
				hasGuaranteedPackSlot(latestLevelRewardPacks.find((entry) => entry.id === pack.id) ?? null),
			guaranteedSlotLabel: getGuaranteedPackLabel(
				latestLevelRewardPacks.find((entry) => entry.id === pack.id) ?? null
			)
		}))
	);
	let showResultsPopup = $derived(
		combatOverlay.status === 'cleared' || combatOverlay.status === 'complete'
	);
	let resultsCountdownLabel = $derived.by(() => {
		const secondsRemaining = Math.max(0, Math.ceil(combatOverlay.statusTimerRemaining));
		return `Auto-continue in ${secondsRemaining}s`;
	});
	let resultsEmptyLabel = $derived(`No drops or packs. +${combatOverlay.waveXp} XP earned.`);
	let loadoutChangeLogStorageKey = $derived(getLoadoutChangeLogStorageKey(data.campaignId));
	let routeNotificationCounts = $derived({
		...data.notificationCounts,
		packs: livePackNotificationCount
	});
	let defaultCampaignMenuOpen = $derived(page.url.searchParams.get('menu') !== 'closed');
	let defaultStatsOverlayOpen = $derived(page.url.searchParams.get('stats') === 'open');
	let showDesktopSideRail = $derived(
		!isMobileLayout && runMode === 'combat' && (showStatsOverlay || showLoadoutPreview)
	);
	let averageLevelDamageTotal = $derived.by(() => {
		if (combatOverlay.weaponDamageRows.length === 0) {
			return 0;
		}

		return combatOverlay.weaponDamageRows.reduce(
			(total, row) => total + row.averageDamagePerCycle,
			0
		);
	});
	function formatDamageValue(value: number) {
		return Number.isInteger(value)
			? value.toString()
			: value.toLocaleString(undefined, {
					minimumFractionDigits: 0,
					maximumFractionDigits: 2
				});
	}

	function formatPackLabel(value: string) {
		return value
			.split(/[-\s/]+/)
			.filter(Boolean)
			.map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
			.join(' / ');
	}

	function hasGuaranteedPackSlot(pack: PersistedRewardPack | null) {
		if (!pack) {
			return false;
		}

		return pack.guaranteedSlotIndex >= 0 || pack.cards.some((card) => card.isGuaranteedSlot);
	}

	function getGuaranteedPackLabel(pack: PersistedRewardPack | null) {
		if (!pack || !hasGuaranteedPackSlot(pack)) {
			return null;
		}

		const guaranteedRarities = [
			...new Set(pack.cards.filter((card) => card.isGuaranteedSlot).map((card) => card.rarity))
		];

		if (guaranteedRarities.length === 0) {
			return 'Guaranteed slot';
		}

		return guaranteedRarities.map((rarity) => formatPackLabel(rarity)).join(' / ');
	}

	function getRewardPackKindLabel(pack: PersistedRewardPack | null) {
		if (!pack) {
			return 'Reward pack';
		}

		if (pack.kind === 'special') {
			return 'Special pack';
		}

		if (pack.kind === 'rare') {
			return 'Rare pack';
		}

		return 'Reward pack';
	}

	function mergeRewardPacks(
		existing: PersistedRewardPack[] | null | undefined,
		incoming: PersistedRewardPack[] | null | undefined
	) {
		const safeExisting = existing ?? [];
		const safeIncoming = incoming ?? [];

		if (safeIncoming.length === 0) {
			return safeExisting;
		}

		const packById = Object.fromEntries(safeExisting.map((pack) => [pack.id, pack])) as Record<
			string,
			PersistedRewardPack
		>;

		for (const pack of safeIncoming) {
			packById[pack.id] = pack;
		}

		return Object.values(packById).sort(
			(left, right) => new Date(right.droppedAt).getTime() - new Date(left.droppedAt).getTime()
		);
	}

	function toPersistableRewardPack(pack: PersistedRewardPack) {
		return {
			id: pack.id,
			ownerUserId: pack.ownerUserId,
			campaignId: pack.campaignId,
			sourceCampaignLevel: pack.sourceCampaignLevel,
			kind: pack.kind,
			droppedAt: pack.droppedAt,
			openedAt: pack.openedAt,
			status: pack.status,
			cardCount: pack.cardCount,
			guaranteedSlotIndex: pack.guaranteedSlotIndex,
			contentVersion: pack.contentVersion,
			cards: pack.cards
		} satisfies PersistedRewardPack;
	}

	function pushChangeLogEntry(
		title: string,
		detail: string,
		tone: ChangeLogEntry['tone'] = 'neutral',
		timestamp = Date.now(),
		rarity?: ChangeLogEntry['rarity'],
		notify = false
	) {
		changeLogEntries = [
			{
				id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
				title,
				detail,
				timestamp,
				tone,
				rarity
			},
			...changeLogEntries
		].slice(0, MAX_CHANGE_LOG_ENTRIES);

		if (notify && !showChangeLogPopup) {
			unreadChangeLogCount += 1;
		}
	}

	function toggleChangeLogPopup() {
		showChangeLogPopup = !showChangeLogPopup;

		if (showChangeLogPopup) {
			unreadChangeLogCount = 0;
		}
	}

	function closeChangeLogPopup() {
		showChangeLogPopup = false;
	}

	function formatChangeLogTime(timestamp: number) {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getOwnedWeaponUpgradeLevel(weapon: LivePixlState['ownedWeapons'][number]) {
		return Math.max(0, weapon.upgradeLevel ?? 0);
	}

	function getOwnedWeaponTotalScrapInvested(weapon: LivePixlState['ownedWeapons'][number]) {
		return Math.max(0, weapon.totalScrapInvested ?? 0);
	}

	function hasNewerOwnedWeaponProgress(
		baseOwnedWeapons: LivePixlState['ownedWeapons'],
		snapshotOwnedWeapons: LivePixlState['ownedWeapons']
	) {
		if (snapshotOwnedWeapons.length > baseOwnedWeapons.length) {
			return true;
		}

		const baseOwnedWeaponByInstanceId = new Map(
			baseOwnedWeapons.map((weapon) => [weapon.instanceId, weapon])
		);

		return snapshotOwnedWeapons.some((snapshotWeapon) => {
			const baseWeapon = baseOwnedWeaponByInstanceId.get(snapshotWeapon.instanceId);

			if (!baseWeapon) {
				return true;
			}

			return (
				getOwnedWeaponUpgradeLevel(snapshotWeapon) > getOwnedWeaponUpgradeLevel(baseWeapon) ||
				getOwnedWeaponTotalScrapInvested(snapshotWeapon) >
					getOwnedWeaponTotalScrapInvested(baseWeapon)
			);
		});
	}

	function mergeOwnedWeaponProgress(
		baseOwnedWeapons: LivePixlState['ownedWeapons'],
		snapshotOwnedWeapons: LivePixlState['ownedWeapons']
	) {
		const snapshotOwnedWeaponByInstanceId = new Map(
			snapshotOwnedWeapons.map((weapon) => [weapon.instanceId, weapon])
		);
		const mergedOwnedWeapons = baseOwnedWeapons.map((baseWeapon) => {
			const snapshotWeapon = snapshotOwnedWeaponByInstanceId.get(baseWeapon.instanceId);

			if (!snapshotWeapon) {
				return baseWeapon;
			}

			const baseUpgradeLevel = getOwnedWeaponUpgradeLevel(baseWeapon);
			const snapshotUpgradeLevel = getOwnedWeaponUpgradeLevel(snapshotWeapon);

			if (snapshotUpgradeLevel > baseUpgradeLevel) {
				return snapshotWeapon;
			}

			if (snapshotUpgradeLevel < baseUpgradeLevel) {
				return baseWeapon;
			}

			const baseScrapInvested = getOwnedWeaponTotalScrapInvested(baseWeapon);
			const snapshotScrapInvested = getOwnedWeaponTotalScrapInvested(snapshotWeapon);

			return snapshotScrapInvested > baseScrapInvested ? snapshotWeapon : baseWeapon;
		});

		const knownInstanceIds = new Set(baseOwnedWeapons.map((weapon) => weapon.instanceId));

		for (const snapshotWeapon of snapshotOwnedWeapons) {
			if (!knownInstanceIds.has(snapshotWeapon.instanceId)) {
				mergedOwnedWeapons.push(snapshotWeapon);
			}
		}

		return mergedOwnedWeapons;
	}

	$effect(() => {
		void data.campaignId;

		pixlStateOverride = null;
		campaignStateOverride = null;
		combatOverlayOverride = null;
		livePackNotificationCount = data.notificationCounts.packs;
		pendingRewardPacks = [];
		hasInitializedArenaDropTracking = false;
		seenArenaDropInstanceIds = new Set();
		seenArenaRewardPackIds = new Set();
		showStatsOverlay = defaultStatsOverlayOpen;
		showStageDrawer = isEndlessCampaign ? false : defaultCampaignMenuOpen;
		showLoadoutPreview = true;
		skipResultsSignal = 0;
	});

	$effect(() => {
		const serverPackCount = data.notificationCounts.packs;

		if (serverPackCount > livePackNotificationCount) {
			livePackNotificationCount = serverPackCount;
		}
	});

	$effect(() => {
		void data.campaignId;
		applyPendingPixlvlSaveWipe();
	});

	$effect(() => {
		if (typeof sessionStorage === 'undefined') {
			return;
		}

		const combatResumeText = sessionStorage.getItem(
			getArenaCombatResumeStorageKey(data.campaignId)
		);

		if (combatResumeText) {
			try {
				const resumeState = JSON.parse(combatResumeText) as ArenaCombatResumeState;
				if (resumeState.campaignId === data.campaignId) {
					combatResumeState = resumeState;
					sessionStorage.removeItem(getArenaCombatResumeStorageKey(data.campaignId));
				}
			} catch {
				// Ignore malformed combat resume snapshots.
			}
		}

		const snapshotText = sessionStorage.getItem(getArenaResumeStorageKey(data.campaignId));

		if (!snapshotText) {
			return;
		}

		try {
			const snapshot = JSON.parse(snapshotText) as ArenaResumeSnapshot;

			if (snapshot.campaignId !== data.campaignId) {
				return;
			}

			const baseXp = data.gameState?.pixlState.xp ?? 0;
			const baseOwnedWeapons = data.gameState?.pixlState.ownedWeapons ?? [];
			const baseCurrentLevel = data.campaignState?.currentLevel ?? 1;
			const baseHighestUnlockedLevel = data.campaignState?.highestUnlockedLevel ?? 1;
			const baseHighestClearedLevel = data.campaignState?.highestClearedLevel ?? 0;
			const mergedSnapshotOwnedWeapons = mergeOwnedWeaponProgress(
				baseOwnedWeapons,
				snapshot.ownedWeapons
			);
			const snapshotHasNewerOwnedWeaponProgress = hasNewerOwnedWeaponProgress(
				baseOwnedWeapons,
				mergedSnapshotOwnedWeapons
			);

			if (
				snapshot.xp <= baseXp &&
				!snapshotHasNewerOwnedWeaponProgress &&
				snapshot.currentLevel <= baseCurrentLevel &&
				snapshot.highestUnlockedLevel <= baseHighestUnlockedLevel &&
				snapshot.highestClearedLevel <= baseHighestClearedLevel
			) {
				return;
			}

			const resumedUpgradeState = createUpgradeablePixlState({
				xp: snapshot.xp,
				defence: snapshot.defence,
				agility: snapshot.agility
			});

			pixlStateOverride = {
				xp: snapshot.xp,
				level: resumedUpgradeState.level,
				perkPoints: resumedUpgradeState.perkPoints,
				defence: snapshot.defence,
				agility: snapshot.agility,
				health: resumedUpgradeState.health,
				attackSpeed: resumedUpgradeState.attackSpeed,
				loadoutRows: resumedUpgradeState.loadoutRows,
				loadoutColumns: resumedUpgradeState.loadoutColumns,
				ownedWeapons: mergedSnapshotOwnedWeapons
			};

			campaignStateOverride = {
				currentLevel: snapshot.currentLevel,
				highestUnlockedLevel: snapshot.highestUnlockedLevel,
				highestClearedLevel: snapshot.highestClearedLevel,
				completed: snapshot.completed
			};
		} catch {
			// Ignore malformed client-side resume snapshots.
		}
	});

	$effect(() => {
		if (typeof sessionStorage === 'undefined' || hasLoadedChangeLogState) {
			return;
		}

		hasLoadedChangeLogState = true;
		const raw = sessionStorage.getItem(loadoutChangeLogStorageKey);

		if (!raw) {
			lastPersistedChangeLogJson = JSON.stringify({ entries: [], unreadCount: 0 });
			return;
		}

		try {
			const parsed = JSON.parse(raw) as {
				entries?: ChangeLogEntry[];
				unreadCount?: number;
			};

			if (Array.isArray(parsed.entries)) {
				changeLogEntries = parsed.entries
					.filter(
						(entry) =>
							typeof entry.id === 'string' &&
							typeof entry.title === 'string' &&
							typeof entry.detail === 'string' &&
							typeof entry.timestamp === 'number' &&
							(entry.tone === 'neutral' || entry.tone === 'positive') &&
							(entry.rarity === undefined ||
								entry.rarity === 'normal' ||
								entry.rarity === 'magic' ||
								entry.rarity === 'rare' ||
								entry.rarity === 'exotic' ||
								entry.rarity === 'legendary')
					)
					.slice(0, MAX_CHANGE_LOG_ENTRIES);
			}

			if (typeof parsed.unreadCount === 'number' && Number.isFinite(parsed.unreadCount)) {
				unreadChangeLogCount = Math.max(0, Math.floor(parsed.unreadCount));
			}
		} catch {
			sessionStorage.removeItem(loadoutChangeLogStorageKey);
		}

		lastPersistedChangeLogJson = JSON.stringify({
			entries: changeLogEntries,
			unreadCount: unreadChangeLogCount
		});
	});

	$effect(() => {
		if (typeof sessionStorage === 'undefined' || !hasLoadedChangeLogState) {
			return;
		}

		const payload = JSON.stringify({
			entries: changeLogEntries,
			unreadCount: unreadChangeLogCount
		});

		if (payload === lastPersistedChangeLogJson) {
			return;
		}

		lastPersistedChangeLogJson = payload;
		sessionStorage.setItem(loadoutChangeLogStorageKey, payload);
	});

	$effect(() => {
		if (!hasLoadedChangeLogState) {
			return;
		}

		if (!hasInitializedArenaDropTracking) {
			hasInitializedArenaDropTracking = true;
			seenArenaDropInstanceIds = new Set(combatOverlay.waveDrops.map((drop) => drop.instanceId));
			seenArenaRewardPackIds = new Set(combatOverlay.rewardPacks.map((pack) => pack.id));
			return;
		}

		const newDrops = combatOverlay.waveDrops.filter(
			(drop) => !seenArenaDropInstanceIds.has(drop.instanceId)
		);
		const newRewardPacks = combatOverlay.rewardPacks.filter(
			(pack) => !seenArenaRewardPackIds.has(pack.id)
		);

		seenArenaDropInstanceIds = new Set(combatOverlay.waveDrops.map((drop) => drop.instanceId));
		seenArenaRewardPackIds = new Set(combatOverlay.rewardPacks.map((pack) => pack.id));

		if (newRewardPacks.length > 0) {
			livePackNotificationCount += newRewardPacks.length;
		}

		for (const drop of newDrops) {
			const definition = weaponDefinitionById[drop.definitionId];
			pushChangeLogEntry(
				`New drop · ${definition?.name ?? 'Weapon'}`,
				`${drop.source} reward added to this run.`,
				'positive',
				new Date(drop.acquiredAt).getTime() || Date.now(),
				definition?.rarity,
				true
			);
		}

		for (const pack of newRewardPacks) {
			const guaranteedSlotLabel = getGuaranteedPackLabel(pack);
			const packKindLabel = getRewardPackKindLabel(pack);
			pushChangeLogEntry(
				`${packKindLabel} · ${pack.cardCount} cards`,
				guaranteedSlotLabel
					? `Source level ${pack.sourceCampaignLevel} ${packKindLabel.toLowerCase()} added with a guaranteed ${guaranteedSlotLabel} slot.`
					: `Source level ${pack.sourceCampaignLevel} ${packKindLabel.toLowerCase()} added to this run.`,
				'positive',
				new Date(pack.droppedAt).getTime() || Date.now(),
				undefined,
				true
			);
		}
	});

	$effect(() => {
		if (form?.purchaseError) {
			showStatsOverlay = true;
		}
	});

	$effect(() => {
		if (typeof sessionStorage === 'undefined' || typeof window === 'undefined') {
			return;
		}

		const storedScrollY = sessionStorage.getItem(getArenaUpgradeScrollStorageKey(data.campaignId));

		if (storedScrollY === null) {
			return;
		}

		sessionStorage.removeItem(getArenaUpgradeScrollStorageKey(data.campaignId));

		const scrollY = Number(storedScrollY);

		if (!Number.isFinite(scrollY)) {
			return;
		}

		requestAnimationFrame(() => {
			window.scrollTo({ top: scrollY, behavior: 'auto' });
		});
	});

	function handleSketchStateChange(update: SketchStateUpdate) {
		pendingRewardPacks = mergeRewardPacks(pendingRewardPacks, update.rewardPacks);

		if (livePixlState) {
			pixlStateOverride = {
				xp: update.xp,
				level: update.level,
				perkPoints: update.perkPoints,
				defence: update.defence,
				agility: update.agility,
				health: update.health,
				attackSpeed: update.attackSpeed,
				loadoutRows: update.loadoutRows,
				loadoutColumns: update.loadoutColumns,
				ownedWeapons: update.ownedWeapons
			};
		}

		if (liveCampaignState) {
			campaignStateOverride = {
				currentLevel: update.currentLevel,
				highestUnlockedLevel: update.highestUnlockedLevel,
				highestClearedLevel: update.highestClearedLevel,
				completed: update.completed
			};
		}

		combatOverlayOverride = {
			...combatOverlay,
			bankedXp: update.xp,
			campaignLevel: update.currentLevel,
			rewardPacks: mergeRewardPacks(combatOverlay.rewardPacks, update.rewardPacks)
		};
	}

	function handleCombatStateChange(update: CombatOverlayStateUpdate) {
		pendingRewardPacks = mergeRewardPacks(pendingRewardPacks, update.rewardPacks ?? []);

		if (update.status === 'running' || update.status === 'defeated') {
			latestLevelRewardPacks = [];
		} else if (update.rewardPacks) {
			latestLevelRewardPacks = update.rewardPacks;
		}

		combatOverlayOverride = {
			...combatOverlay,
			...update,
			rewardPacks:
				update.rewardPacks && update.rewardPacks.length > 0
					? mergeRewardPacks(combatOverlay.rewardPacks, update.rewardPacks)
					: combatOverlay.rewardPacks
		};
	}

	function handleCombatResumeStateChange(update: ArenaCombatResumeState) {
		latestCombatResumeState = update;

		if (combatResumeState?.campaignId === update.campaignId) {
			combatResumeState = null;
		}
	}

	function setCampaignMenuOpen(nextOpen: boolean) {
		if (isEndlessCampaign) {
			showStageDrawer = false;
			return;
		}

		showStageDrawer = nextOpen;

		const nextUrl = new URL(page.url);

		if (nextOpen) {
			nextUrl.searchParams.delete('menu');
		} else {
			nextUrl.searchParams.set('menu', 'closed');
		}

		history.replaceState(history.state, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
	}

	async function persistArenaStateBeforeLeaving() {
		if (!data.gameState || !livePixlState || !liveCampaignState) {
			return;
		}

		const rewardPacksToPersist = mergeRewardPacks(
			data.gameState.rewardPacks,
			pendingRewardPacks.length > 0 ? pendingRewardPacks : combatOverlay.rewardPacks
		).map(toPersistableRewardPack);

		if (typeof sessionStorage !== 'undefined' && latestCombatResumeState) {
			sessionStorage.setItem(
				getArenaCombatResumeStorageKey(data.campaignId),
				JSON.stringify(latestCombatResumeState)
			);
		}
		const persistedCurrentLevel =
			combatOverlay.status === 'complete'
				? data.campaign.totalLevels
				: combatOverlay.status === 'cleared'
					? Math.min(data.campaign.totalLevels, combatOverlay.campaignLevel + 1)
					: liveCampaignState.currentLevel;
		const persistedHighestUnlockedLevel = Math.max(
			liveCampaignState.highestUnlockedLevel,
			persistedCurrentLevel
		);
		const persistedHighestClearedLevel = Math.max(
			liveCampaignState.highestClearedLevel,
			combatOverlay.status === 'cleared' || combatOverlay.status === 'complete'
				? combatOverlay.campaignLevel
				: liveCampaignState.highestClearedLevel
		);
		const persistedCompleted = liveCampaignState.completed || combatOverlay.status === 'complete';

		await fetch('/api/game/state', {
			method: 'PATCH',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				pixlState: {
					xp: Math.max(livePixlState.xp, combatOverlay.bankedXp),
					defence: livePixlState.defence,
					agility: livePixlState.agility
				},
				rewardPacks: rewardPacksToPersist,
				campaignProgress: [
					{
						campaignId: data.campaignId,
						currentLevel: persistedCurrentLevel,
						highestUnlockedLevel: persistedHighestUnlockedLevel,
						highestClearedLevel: persistedHighestClearedLevel,
						completed: persistedCompleted
					}
				]
			})
		});
	}

	async function handleRouteNavigation(section: 'arena' | 'loadout' | 'shop' | 'stats' | 'packs') {
		if (section !== 'arena') {
			await persistArenaStateBeforeLeaving();
		}

		if (section === 'arena') {
			await goto(resolve(`/campaigns/${data.campaignId}`), { invalidateAll: true });
			return;
		}

		await goto(resolve(`/campaigns/${data.campaignId}/${section}`), {
			invalidateAll: true
		});
	}

	const purchaseUpgrade: SubmitFunction = ({ formData }) => {
		const selectedUpgrade = formData.get('upgrade');

		if (typeof sessionStorage !== 'undefined' && typeof window !== 'undefined') {
			sessionStorage.setItem(
				getArenaUpgradeScrollStorageKey(data.campaignId),
				String(window.scrollY)
			);
		}

		return async ({ result }) => {
			showStatsOverlay = true;

			if (result.type === 'success' || result.type === 'failure') {
				form = result.data as PageProps['form'];
			}

			if (
				result.type === 'success' &&
				typeof selectedUpgrade === 'string' &&
				isUpgradeKey(selectedUpgrade)
			) {
				const nextUpgradeState = applyUpgradePurchase(selectedUpgrade, upgradeState);
				const ownedWeapons =
					livePixlState?.ownedWeapons ?? data.gameState?.pixlState?.ownedWeapons ?? [];

				pixlStateOverride = {
					xp: nextUpgradeState.xp,
					level: nextUpgradeState.level,
					perkPoints: nextUpgradeState.perkPoints,
					defence: nextUpgradeState.defence,
					agility: nextUpgradeState.agility,
					health: nextUpgradeState.health,
					attackSpeed: nextUpgradeState.attackSpeed,
					loadoutRows: nextUpgradeState.loadoutRows,
					loadoutColumns: nextUpgradeState.loadoutColumns,
					ownedWeapons
				};
			}
		};
	};

	const resetUpgrades: SubmitFunction = () => {
		if (typeof sessionStorage !== 'undefined' && typeof window !== 'undefined') {
			sessionStorage.setItem(
				getArenaUpgradeScrollStorageKey(data.campaignId),
				String(window.scrollY)
			);
		}

		return async ({ result }) => {
			showStatsOverlay = true;

			if (result.type === 'success' || result.type === 'failure') {
				form = result.data as PageProps['form'];
			}

			if (result.type === 'success') {
				const nextUpgradeState = resetUpgradeAllocations(upgradeState);
				const ownedWeapons =
					livePixlState?.ownedWeapons ?? data.gameState?.pixlState?.ownedWeapons ?? [];

				pixlStateOverride = {
					xp: nextUpgradeState.xp,
					level: nextUpgradeState.level,
					perkPoints: nextUpgradeState.perkPoints,
					defence: nextUpgradeState.defence,
					agility: nextUpgradeState.agility,
					health: nextUpgradeState.health,
					attackSpeed: nextUpgradeState.attackSpeed,
					loadoutRows: nextUpgradeState.loadoutRows,
					loadoutColumns: nextUpgradeState.loadoutColumns,
					ownedWeapons
				};
			}
		};
	};

	const selectStage: SubmitFunction = ({ formData }) => {
		const rawStage = formData.get('stage');
		const stage = typeof rawStage === 'string' ? Number(rawStage) : NaN;

		return async ({ result }) => {
			if (result.type === 'success' || result.type === 'failure') {
				form = result.data as PageProps['form'];
			}

			if (result.type !== 'success' || !Number.isInteger(stage)) {
				setCampaignMenuOpen(true);
				return;
			}

			const targetLevel = (stage - 1) * data.campaign.levelsPerStage + 1;
			const baseCampaignState = liveCampaignState ?? data.campaignState;

			showStatsOverlay = false;

			if (!baseCampaignState || targetLevel === sketchCampaignLevel) {
				return;
			}

			campaignStateOverride = {
				currentLevel: targetLevel,
				highestUnlockedLevel: baseCampaignState.highestUnlockedLevel,
				highestClearedLevel: baseCampaignState.highestClearedLevel,
				completed: baseCampaignState.completed
			};
			combatOverlayOverride = null;
		};
	};

	let campaignSketch = $derived.by(() => {
		return (p: import('p5').default) =>
			createArenaCombatSketch(data.campaign, data.combatProfile, {
				persistPath: '/api/game/state',
				flowMode: data.campaign.mode ?? 'campaign',
				runMode,
				rewardsEnabled: !isEndlessCampaign,
				showPixlCrown: data.isTopLeader ?? false,
				showLoadoutSketch: false,
				resumeState: combatResumeState,
				pixlState: livePixlState ?? data.gameState?.pixlState ?? null,
				campaignState: liveCampaignState ?? data.campaignState ?? null,
				getSkipResultsSignal: () => skipResultsSignal,
				onCombatStateChange: handleCombatStateChange,
				onResumeStateChange: handleCombatResumeStateChange,
				onStateChange: handleSketchStateChange
			})(p);
	});

	let loadoutSweepPreviewSketch = $derived.by(() => {
		return (p: import('p5').default) =>
			createLoadoutSweepPreviewSketch({
				pixlState: previewPixlState
			})(p);
	});
</script>

<svelte:head>
	<title>Campaign {data.campaignId} | pixlvl</title>
</svelte:head>

<svelte:window bind:innerWidth />

{#snippet campaignDrawerPanel()}
	{#if !isEndlessCampaign && showStageDrawer}
		<CampaignStageDrawer
			campaignId={data.campaignId}
			campaignNumber={data.campaign.campaign}
			campaignRoutes={data.campaignRoutes}
			{currentStage}
			currentLevel={sketchCampaignLevel}
			{highestUnlockedLevel}
			{highestClearedLevel}
			levelsPerStage={data.campaign.levelsPerStage}
			{unlockedStages}
			hasCampaignState={Boolean(data.campaignState)}
			stageError={form?.stageError}
			stageSuccess={form?.stageSuccess}
			submit={selectStage}
			onClose={() => setCampaignMenuOpen(false)}
		/>
	{/if}
{/snippet}

{#snippet statsOverlayPanel()}
	{#if showStatsOverlay}
		<ArenaStatsOverlay
			stats={overlayStatCards}
			upgradeOptions={overlayUpgradeOptions}
			signedIn={Boolean(data.gameState)}
			purchaseError={form?.purchaseError}
			purchaseSuccess={form?.purchaseSuccess}
			submit={purchaseUpgrade}
			resetSubmit={resetUpgrades}
		/>
	{/if}
{/snippet}

{#snippet combatHudPanel()}
	{#if runMode === 'combat'}
		<div class="overlay combat-panel">
			<p class="combat-title">
				Campaign {data.campaign.campaign} · Stage {combatOverlay.stage} · Level {combatOverlay.stageLevel}
			</p>
			<div>
				<span>Remaining</span>
				<strong>{combatOverlay.remainingEnemies}</strong>
			</div>

			<div class="combat-bars">
				<div class="combat-bar-group">
					<div class="combat-bar-meta">
						<span>Health</span>
						<strong>
							{combatOverlay.pixlHealth} / {combatOverlay.maxPixlHealth}
							{#if combatOverlay.pixlShieldPool > 0}
								<span class="combat-shield-label" style:--shield-color={combatOverlay.shieldColor}>
									+{Math.ceil(combatOverlay.pixlShieldPool)} shield
								</span>
							{/if}
						</strong>
					</div>
					<div class="combat-health">
						{#if combatOverlay.pixlShieldPool > 0}
							<div
								class="combat-shield-fill"
								style:--shield-ratio={combatShieldRatio}
								style:--shield-color={combatOverlay.shieldColor}
							></div>
						{/if}
						<div class="combat-health-fill" style:--health-ratio={combatHealthRatio}></div>
					</div>
				</div>
				<div class="combat-bar-group">
					<div class="combat-bar-meta">
						<span>XP</span>
						<strong>{combatXpLabel}</strong>
					</div>
					<div class="combat-xp">
						<div class="combat-xp-fill" style:--xp-ratio={combatXpRatio}></div>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet transientArenaOverlays()}
	{#if runMode === 'combat'}
		{@render combatHudPanel()}

		{#if showResultsPopup}
			<LevelResultsPopup
				campaignNumber={data.campaign.campaign}
				stage={combatOverlay.stage}
				stageLevel={combatOverlay.stageLevel}
				waveXp={combatOverlay.waveXp}
				{rewardDropRows}
				{rewardPackRows}
				{resultsEmptyLabel}
				{resultsCountdownLabel}
				onSkip={() => (skipResultsSignal += 1)}
			/>
		{/if}

		{#if combatStatusLabel}
			<div class={`status-overlay ${combatStatusTone}`}>
				{combatStatusLabel}
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet loadoutPreviewPanel()}
	<aside class="overlay loadout-preview-panel" aria-label="Loadout sweep preview">
		<div class="loadout-preview-damage-block" aria-label="Weapon damage overview">
			<div class="loadout-preview-damage-header compact-heading">
				<p class="eyebrow">Damage overview</p>
			</div>
			{#if combatOverlay.latestCompletedCycle > 0 && combatOverlay.weaponDamageRows.length > 0}
				<div class="loadout-preview-damage-list" role="list" aria-label="Weapon damage dealt">
					{#each combatOverlay.weaponDamageRows as row (row.weaponInstanceId)}
						<div
							class={`summary-row loadout-preview-damage-row rarity-${row.rarity}`}
							role="listitem"
						>
							<div class="loadout-preview-copy">
								<strong>{row.name}</strong>
								<span>{row.placement}</span>
							</div>
							<div class="loadout-preview-damage-metrics">
								<strong
									>{formatDamageValue(
										averageLevelDamageTotal > 0
											? (row.averageDamagePerCycle / averageLevelDamageTotal) * 100
											: 0
									)}%</strong
								>
								<span>{formatDamageValue(row.averageDamagePerCycle)} avg / cycle</span>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="loadout-preview-empty">Complete one full sweep cycle to see weapon damage.</p>
			{/if}
		</div>
		<div class="loadout-preview-canvas-shell">
			{#key loadoutPreviewRemountKey}
				<P5Canvas class="preview-canvas-frame" sketch={loadoutSweepPreviewSketch} />
			{/key}
		</div>
	</aside>
{/snippet}

<div class="page">
	<div class={['arena-shell', runMode === 'combat' && showLoadoutPreview ? 'preview-enabled' : '']}>
		<div class="utility-bar">
			{#if runMode === 'combat'}
				<div class="utility-secondary">
					<CampaignRouteNav
						campaignId={data.campaignId}
						active="arena"
						notificationCounts={routeNotificationCounts}
						showRecentToggle={true}
						recentOpen={showChangeLogPopup}
						recentUnreadCount={unreadChangeLogCount}
						showCampaignMenuToggle={!isEndlessCampaign}
						showSweeperToggle={true}
						showStatsToggle={true}
						onToggleRecent={toggleChangeLogPopup}
						onNavigateSection={handleRouteNavigation}
						onToggleCampaignMenu={() => {
							setCampaignMenuOpen(!showStageDrawer);
						}}
						campaignMenuEnabled={showStageDrawer}
						onToggleSweeper={() => {
							showLoadoutPreview = !showLoadoutPreview;
						}}
						sweeperEnabled={showLoadoutPreview}
						onToggleStats={() => {
							showStatsOverlay = !showStatsOverlay;
						}}
						statsEnabled={showStatsOverlay}
					/>
				</div>
			{/if}
		</div>

		{#if showChangeLogPopup}
			<div
				class="change-log-overlay"
				role="button"
				tabindex="0"
				aria-label="Close recent changes"
				onclick={closeChangeLogPopup}
				onkeydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
						event.preventDefault();
						closeChangeLogPopup();
					}
				}}
				in:fade={{ duration: 140 }}
				out:fade={{ duration: 180 }}
			>
				<div
					class="change-log-popover"
					aria-label="Recent campaign changes"
					role="dialog"
					aria-modal="true"
					tabindex="-1"
					onclick={(event) => event.stopPropagation()}
					onkeydown={(event) => event.stopPropagation()}
				>
					<div class="change-log-head">
						<div>
							<p class="change-log-eyebrow">Recent changes</p>
						</div>
						<button
							class="purchase slim-toggle change-log-close"
							type="button"
							onclick={closeChangeLogPopup}>Close</button
						>
					</div>

					{#if changeLogEntries.length > 0}
						<div class="change-log-list">
							{#each changeLogEntries as entry (entry.id)}
								<article
									class={[
										'change-log-entry',
										`tone-${entry.tone}`,
										entry.rarity ? `rarity-${entry.rarity}` : ''
									]}
								>
									<div class="change-log-entry-head">
										<strong>{entry.title}</strong>
										<time>{formatChangeLogTime(entry.timestamp)}</time>
									</div>
									<p>{entry.detail}</p>
								</article>
							{/each}
						</div>
					{:else}
						<p class="change-log-empty">Loadout changes and fresh drops show up here.</p>
					{/if}
				</div>
			</div>
		{/if}

		<div class={['arena-layout', !isMobileLayout && runMode === 'combat' ? 'combat-enabled' : '']}>
			<section class="canvas-stage">
				{#key sketchRemountKey}
					<P5Canvas class="canvas-frame" sketch={campaignSketch} />
				{/key}

				{#if !isMobileLayout && !isEndlessCampaign && showStageDrawer}
					<div class="campaign-drawer-overlay">
						{@render campaignDrawerPanel()}
					</div>
				{/if}

				<div class="overlay-layout">
					{@render transientArenaOverlays()}
				</div>
			</section>

			{#if showDesktopSideRail}
				<div class="desktop-panel-rail desktop-panel-rail-end">
					{@render statsOverlayPanel()}

					{#if showLoadoutPreview}
						{@render loadoutPreviewPanel()}
					{/if}
				</div>
			{/if}
		</div>

		{#if isMobileLayout}
			<div class="mobile-panel-stack">
				{@render campaignDrawerPanel()}
				{@render statsOverlayPanel()}

				{#if runMode === 'combat' && showLoadoutPreview}
					{@render loadoutPreviewPanel()}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.page {
		flex: 1;
		width: 100%;
		max-width: 100vw;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		background: radial-gradient(circle at top, rgba(255, 255, 255, 0.05), transparent 28%), #020202;
	}

	.arena-shell {
		width: 100%;
		max-width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr);
		gap: 1rem;
		padding: 1rem;
		box-sizing: border-box;
	}

	.arena-layout {
		grid-column: 1;
		grid-row: 2;
		display: grid;
		grid-template-areas: 'canvas';
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		min-width: 0;
		min-height: 0;
		position: relative;
	}

	.arena-layout.combat-enabled {
		grid-template-areas: 'canvas';
		grid-template-columns: minmax(0, 1fr);
	}

	.canvas-stage {
		grid-area: canvas;
		position: relative;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		border-radius: 1.5rem;
		touch-action: pan-y;
	}

	.overlay-layout {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: 1rem;
		padding: 1rem;
		pointer-events: none;
	}

	.desktop-panel-rail {
		display: grid;
		align-content: start;
		gap: 1rem;
		min-width: 0;
		min-height: 0;
	}

	.desktop-panel-rail-start {
		grid-area: left;
	}

	.campaign-drawer-overlay {
		position: absolute;
		left: 1rem;
		top: 1rem;
		bottom: 1rem;
		z-index: 5;
		width: min(24rem, calc(100% - 2rem));
		max-width: 100%;
		pointer-events: auto;
	}

	.desktop-panel-rail-end {
		position: absolute;
		right: 1rem;
		top: 1rem;
		z-index: 5;
		width: min(24rem, calc(100% - 2rem));
		max-width: 100%;
		max-height: calc(100% - 2rem);
		overflow-y: auto;
		padding-right: 0.2rem;
		pointer-events: auto;
	}

	.mobile-panel-stack {
		display: grid;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		gap: 0.75rem;
		align-content: start;
		justify-items: stretch;
	}

	.change-log-overlay {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(3, 5, 8, 0.46);
		backdrop-filter: blur(18px) saturate(1.1);
	}

	.change-log-popover {
		width: min(30rem, calc(100vw - 2rem));
		max-height: min(38rem, calc(100vh - 2rem));
		padding: 1rem;
		border-radius: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background:
			radial-gradient(circle at top, rgba(103, 217, 111, 0.12), transparent 38%),
			rgba(10, 10, 10, 0.96);
		box-shadow: 0 32px 90px rgba(0, 0, 0, 0.45);
		display: grid;
		gap: 0.8rem;
		overflow: hidden;
	}

	.change-log-head,
	.change-log-entry-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.75rem;
	}

	.change-log-head p,
	.change-log-entry p,
	.change-log-entry strong,
	.change-log-entry time {
		margin: 0;
	}

	.change-log-eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.68rem;
		font-weight: 700;
		color: #9d9d9d;
		margin-bottom: 0.2rem;
	}

	.change-log-list {
		display: grid;
		gap: 0.55rem;
		max-height: min(28rem, calc(100vh - 12rem));
		overflow-y: auto;
		padding-right: 0.15rem;
	}

	.change-log-entry {
		padding: 0.7rem 0.75rem;
		border-radius: 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.03);
		display: grid;
		gap: 0.28rem;
	}

	.change-log-entry.tone-positive {
		border-color: rgba(103, 217, 111, 0.22);
		background: rgba(103, 217, 111, 0.07);
	}

	.change-log-entry.rarity-normal strong {
		color: #f1f1f1;
	}

	.change-log-entry.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
		background: rgba(84, 150, 255, 0.08);
	}

	.change-log-entry.rarity-magic strong {
		color: #9ec2ff;
	}

	.change-log-entry.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
		background: rgba(255, 210, 74, 0.08);
	}

	.change-log-entry.rarity-rare strong {
		color: #ffe08f;
	}

	.change-log-entry.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
		background: rgba(224, 74, 74, 0.09);
	}

	.change-log-entry.rarity-exotic strong {
		color: #ffb08f;
	}

	.change-log-entry.rarity-legendary {
		border-color: rgba(170, 104, 48, 0.34);
		background: rgba(170, 104, 48, 0.11);
	}

	.change-log-entry.rarity-legendary strong {
		color: #e09c5c;
	}

	.change-log-entry p,
	.change-log-empty,
	.change-log-entry time {
		color: #c4c4c4;
		font-size: 0.82rem;
	}

	.change-log-entry strong {
		font-size: 0.88rem;
	}

	.change-log-entry time {
		white-space: nowrap;
	}

	.change-log-empty {
		margin: 0;
		line-height: 1.45;
	}

	@media (max-width: 860px) {
		.change-log-overlay {
			padding: 0.75rem;
		}

		.change-log-popover {
			width: min(100%, 32rem);
			max-height: calc(100vh - 1.5rem);
			padding: 0.9rem;
			border-radius: 1rem;
		}

		.change-log-list {
			max-height: calc(100vh - 11rem);
		}
	}

	.overlay {
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.25rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
		box-sizing: border-box;
	}

	.back {
		display: inline-flex;
		align-items: center;
		min-height: 2.15rem;
		padding: 0 0.8rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.96);
		color: #020202;
		text-decoration: none;
		font-size: 0.92rem;
		font-weight: 600;
	}

	.utility-bar,
	.utility-actions,
	.mode-toggle,
	.utility-secondary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.toggle {
		min-height: 2.15rem;
		padding: 0 0.8rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(10, 10, 10, 0.84);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.86rem;
		font-weight: 600;
		cursor: pointer;
	}

	.utility-bar {
		grid-column: 1;
		grid-row: 1;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		justify-content: flex-end;
		pointer-events: auto;
	}

	.utility-secondary {
		flex: 1 1 auto;
		justify-content: flex-end;
		min-width: 0;
		max-width: 100%;
	}

	.meta-pill {
		padding: 0.55rem 0.75rem;
	}

	.eyebrow,
	p,
	span,
	strong {
		margin: 0;
	}

	.eyebrow,
	.combat-grid span {
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9d9d9d;
	}

	.upgrade-note,
	.upgrade-level {
		color: #c4c4c4;
	}

	.overlay {
		position: relative;
		max-height: 100%;
		overflow: auto;
		backdrop-filter: blur(12px);
		pointer-events: auto;
	}

	.feedback {
		padding: 0.85rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 0.95rem;
	}

	.feedback.error {
		border-color: rgba(255, 96, 96, 0.35);
		color: #ffb3b3;
		background: rgba(255, 96, 96, 0.08);
	}

	.feedback.success {
		border-color: rgba(255, 255, 255, 0.12);
		color: #f5f5f5;
		background: rgba(255, 255, 255, 0.05);
	}

	.drawer-stage-card {
		gap: 0.35rem;
	}

	.management-block,
	.stage-detail,
	.summary-section {
		display: grid;
		gap: 0.65rem;
	}

	.compact-heading {
		gap: 0.2rem;
	}

	.stage-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}

	.stage-card,
	.summary-row,
	.stage-detail {
		padding: 0.8rem 0.9rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.stage-card {
		width: 100%;
		display: grid;
		gap: 0.25rem;
		text-align: left;
		color: #f5f5f5;
		font: inherit;
		cursor: pointer;
	}

	.stage-card.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.08);
	}

	.summary-list {
		display: grid;
		gap: 0.55rem;
	}

	.snapshot-list {
		gap: 0.45rem;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: baseline;
	}

	.loadout-editor-row,
	.placement-row {
		align-items: center;
	}

	.placement-row {
		flex-wrap: wrap;
	}

	.slim-toggle {
		width: auto;
		min-height: 2rem;
	}

	.slim-toggle {
		padding: 0.35rem 0.6rem;
		font-size: 0.76rem;
	}

	.summary-row.rarity-normal {
		border-color: rgba(236, 236, 236, 0.14);
	}

	.summary-row.rarity-magic {
		border-color: rgba(84, 150, 255, 0.28);
	}

	.summary-row.rarity-rare {
		border-color: rgba(255, 210, 74, 0.28);
	}

	.summary-row.rarity-exotic {
		border-color: rgba(224, 74, 74, 0.28);
	}

	.summary-row.rarity-legendary {
		border-color: rgba(170, 104, 48, 0.34);
	}

	.upgrade-level {
		font-size: 0.9rem;
	}

	.purchase {
		width: 100%;
		min-height: 2rem;
		padding: 0.45rem 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.purchase:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.combat-panel {
		grid-column: 1;
		grid-row: 3;
		justify-self: center;
		align-self: end;
		width: min(28rem, calc(100% - 1.2rem));
		padding: 0.38rem 0.56rem 0.42rem;
		display: grid;
		gap: 0.24rem;
		background: rgba(6, 8, 12, 0.76);
		border-color: rgba(255, 255, 255, 0.06);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
		backdrop-filter: blur(10px);
	}

	.combat-title {
		font-size: 0.58rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(220, 224, 232, 0.84);
	}

	.combat-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, max-content));
		justify-content: center;
		gap: 0.32rem 0.75rem;
	}

	.combat-grid div {
		display: grid;
		gap: 0.1rem;
		align-content: start;
	}

	.combat-grid strong {
		font-size: 0.88rem;
		color: #f5f5f5;
		text-align: left;
	}

	.combat-bars {
		display: grid;
		gap: 0.16rem;
	}

	.combat-bar-group {
		display: grid;
		gap: 0.08rem;
	}

	.combat-bar-meta {
		display: flex;
		justify-content: space-between;
		gap: 0.6rem;
		align-items: baseline;
	}

	.combat-bar-meta span {
		font-size: 0.54rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(138, 189, 207, 0.88);
	}

	.combat-bar-meta strong {
		font-size: 0.64rem;
		color: #e4f7ff;
		text-align: right;
	}

	.combat-health {
		position: relative;
		height: 0.2rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		overflow: hidden;
	}

	.combat-shield-fill {
		position: absolute;
		inset: 0;
		width: calc(var(--shield-ratio) * 100%);
		border-radius: inherit;
		background: color-mix(in srgb, var(--shield-color) 80%, white 20%);
		opacity: 0.8;
	}

	.combat-health-fill {
		position: relative;
		height: 100%;
		width: calc(var(--health-ratio) * 100%);
		border-radius: inherit;
		background: #ff3434;
	}

	.combat-shield-label {
		margin-left: 0.45rem;
		color: color-mix(in srgb, var(--shield-color) 75%, white 25%);
		font-size: 0.56rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.combat-xp {
		height: 0.18rem;
		border-radius: 999px;
		background: rgba(93, 210, 255, 0.1);
		overflow: hidden;
	}

	.combat-xp-fill {
		height: 100%;
		width: calc(var(--xp-ratio) * 100%);
		border-radius: inherit;
		background: linear-gradient(90deg, #27d3ff, #6bf0c8);
	}

	.status-overlay {
		grid-column: 1;
		grid-row: 1;
		justify-self: center;
		align-self: start;
		margin-top: 0.25rem;
		padding: 0.5rem 0.95rem;
		border-radius: 999px;
		width: fit-content;
		max-width: min(42rem, 100%);
		cursor: pointer;
		font: inherit;
		color: #f5f5f5;
		text-align: center;
		background: rgba(0, 0, 0, 0.78);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.12em;
	}

	.status-overlay.danger {
		color: #ff7a7a;
	}

	.status-overlay.neutral {
		color: #f5f5f5;
	}

	.loadout-preview-panel {
		min-width: 0;
		min-height: 0;
		padding: 0.9rem;
		display: grid;
		grid-template-rows: auto auto;
		gap: 0.75rem;
		overflow: visible;
		height: auto;
	}

	.loadout-preview-damage-block {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.45rem;
		min-height: 14rem;
		overflow: hidden;
		padding: 0.7rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.loadout-preview-damage-header {
		display: grid;
		gap: 0.18rem;
	}

	.loadout-preview-damage-list {
		display: grid;
		gap: 0.45rem;
		min-height: 0;
		overflow: auto;
	}

	.loadout-preview-damage-row {
		align-items: center;
		padding: 0.55rem 0.7rem;
	}

	.loadout-preview-copy {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
	}

	.loadout-preview-damage-metrics {
		display: grid;
		gap: 0.08rem;
		justify-items: end;
		text-align: right;
	}

	.loadout-preview-damage-metrics strong {
		font-size: 0.88rem;
	}

	.loadout-preview-copy strong {
		font-size: 0.88rem;
	}

	.loadout-preview-copy span,
	.loadout-preview-damage-metrics span,
	.loadout-preview-empty {
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #cfcfcf;
	}

	.loadout-preview-empty {
		padding: 0 0.1rem;
	}

	.loadout-preview-canvas-shell {
		min-width: 0;
		min-height: 12rem;
		height: auto;
		max-height: 16rem;
		padding: 0.35rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
		overflow: hidden;
		pointer-events: none;
	}

	.placement-row.active {
		border-color: rgba(103, 217, 111, 0.42);
		background: rgba(103, 217, 111, 0.12);
	}

	.grid-placement-panel,
	.weapon-shape-preview {
		gap: 0.65rem;
	}

	.shape-grid,
	.loadout-grid {
		display: grid;
		gap: 0.3rem;
	}

	.shape-grid {
		width: fit-content;
	}

	.shape-cell,
	.grid-cell {
		aspect-ratio: 1;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.05);
	}

	.shape-cell.filled {
		background: rgba(103, 217, 111, 0.18);
		border-color: rgba(103, 217, 111, 0.42);
	}

	.loadout-grid-wrapper {
		overflow-x: auto;
	}

	.loadout-grid {
		min-width: 100%;
	}

	.grid-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
		min-height: 2.25rem;
		color: #f5f5f5;
	}

	.grid-cell.occupied {
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.grid-cell.empty {
		opacity: 0.45;
	}

	.grid-anchor {
		width: 100%;
		min-height: 2.25rem;
		padding: 0;
		cursor: pointer;
		background: rgba(103, 217, 111, 0.12);
		border-color: rgba(103, 217, 111, 0.42);
		font: inherit;
		color: #c9f8cc;
	}

	.compact-stats {
		gap: 0.55rem;
	}

	:global(.canvas-frame) {
		width: 100%;
		height: 100%;
		background: #000000;
		touch-action: pan-y;
	}

	:global(.canvas-frame canvas) {
		display: block;
		width: 100%;
		height: 100%;
	}

	:global(.preview-canvas-frame) {
		width: 100%;
		height: 100%;
		background: transparent;
	}

	:global(.preview-canvas-frame canvas) {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	@media (min-width: 861px) {
		.mobile-panel-stack {
			display: none;
		}
	}

	@media (max-width: 860px) {
		.page {
			height: auto;
			min-height: 100dvh;
			overflow-x: hidden;
			overflow-y: auto;
		}

		.mobile-panel-stack {
			padding-bottom: 1.25rem;
		}

		.arena-shell {
			height: auto;
			min-height: 100%;
		}

		.arena-layout,
		.arena-layout.drawer-enabled,
		.arena-layout.combat-enabled,
		.arena-layout.drawer-enabled.combat-enabled {
			grid-template-areas: 'canvas';
			grid-template-columns: minmax(0, 1fr);
		}

		.utility-bar {
			align-items: flex-start;
			flex-direction: column;
			overflow-x: hidden;
		}

		.utility-primary,
		.utility-secondary {
			width: 100%;
			justify-content: center;
		}

		.overlay-layout {
			grid-template-columns: 1fr;
		}

		.arena-shell,
		.arena-shell.preview-enabled {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto minmax(0, auto);
			gap: 0.75rem;
			padding: 0.75rem;
		}

		.canvas-stage {
			height: auto;
			min-height: 0;
			overflow: hidden;
			max-width: 100%;
			width: 100%;
			justify-self: center;
		}

		.canvas-stage :global(.canvas-frame) {
			height: auto;
			min-height: 15rem;
			aspect-ratio: 1 / 0.92;
			width: 100%;
			max-width: 100%;
			margin: 0 auto;
			border-radius: inherit;
			overflow: hidden;
		}

		.utility-bar,
		.utility-actions {
			gap: 0.5rem;
		}

		.utility-bar {
			flex-wrap: wrap;
			align-items: center;
		}

		.toggle,
		.meta-pill {
			padding: 0.5rem 0.65rem;
		}

		.meta-pill {
			max-width: 14rem;
		}

		.stats-panel,
		.shop-panel,
		.combat-panel,
		.status-overlay,
		.loadout-preview-panel {
			width: 100%;
			max-height: none;
			justify-self: stretch;
			align-self: auto;
			position: relative;
			inset: auto;
			transform: none;
		}

		.loadout-preview-panel {
			overflow: visible;
			grid-template-rows: auto auto;
			min-height: fit-content;
			height: auto;
		}

		.loadout-preview-list,
		.loadout-preview-damage-list,
		.loadout-preview-canvas-shell {
			max-height: none;
			overflow: visible;
			height: auto;
		}

		.loadout-preview-damage-block {
			overflow: visible;
		}

		.stats-panel {
			grid-row: auto;
		}

		.combat-panel {
			grid-row: 3;
			width: min(19rem, calc(100% - 0.6rem));
			max-width: calc(100% - 0.6rem);
			justify-self: center;
			align-self: end;
		}

		.shop-panel {
			grid-row: auto;
		}

		.combat-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.stats-overlay-grid,
		.overlay-upgrade-grid {
			grid-template-columns: 1fr;
		}

		.stage-grid {
			grid-template-columns: 1fr;
		}

		.status-overlay {
			grid-column: 1;
			grid-row: auto;
			justify-self: start;
			margin-top: 0;
		}

		.loadout-preview-panel {
			grid-column: 1;
			grid-row: auto;
			min-height: 0;
			padding: 0.75rem;
			gap: 0.6rem;
			grid-template-rows: minmax(10rem, auto) minmax(8.5rem, 10rem);
		}

		.loadout-preview-list {
			max-height: none;
			min-height: 0;
		}

		.loadout-preview-damage-list {
			max-height: none;
		}

		.loadout-preview-row,
		.loadout-preview-damage-row {
			padding: 0.48rem 0.58rem;
		}

		.loadout-preview-copy strong,
		.loadout-preview-damage-metrics strong {
			font-size: 0.82rem;
		}

		.loadout-preview-copy span,
		.loadout-preview-damage-metrics span,
		.loadout-preview-coords,
		.loadout-preview-empty {
			font-size: 0.68rem;
			letter-spacing: 0.04em;
		}

		.loadout-preview-canvas-shell {
			min-height: 8.5rem;
			height: 8.5rem;
			max-height: 8.5rem;
			overflow: hidden;
		}
	}

	@media (max-width: 480px) {
		.mobile-panel-stack {
			padding-bottom: 1.5rem;
		}

		.arena-shell,
		.arena-shell.preview-enabled {
			gap: 0.6rem;
			padding: 0.6rem;
		}

		.canvas-stage :global(.canvas-frame) {
			min-height: 11.5rem;
			aspect-ratio: 1 / 0.82;
		}

		.combat-panel {
			width: min(17.25rem, calc(100% - 0.5rem));
			max-width: calc(100% - 0.5rem);
			padding: 0.34rem 0.46rem 0.38rem;
			gap: 0.2rem;
		}

		.combat-title {
			font-size: 0.52rem;
			letter-spacing: 0.14em;
		}

		.combat-bar-meta span {
			font-size: 0.5rem;
			letter-spacing: 0.12em;
		}

		.combat-bar-meta strong {
			font-size: 0.58rem;
		}

		.loadout-preview-panel {
			padding: 0.65rem;
			gap: 0.5rem;
			grid-template-rows: auto auto;
		}

		.loadout-preview-damage-row {
			padding: 0.42rem 0.5rem;
		}

		.loadout-preview-copy strong,
		.loadout-preview-damage-metrics strong {
			font-size: 0.76rem;
		}

		.loadout-preview-copy span,
		.loadout-preview-damage-metrics span,
		.loadout-preview-coords,
		.loadout-preview-empty {
			font-size: 0.64rem;
			letter-spacing: 0.03em;
		}

		.loadout-preview-canvas-shell {
			min-height: 6.5rem;
			height: 6.5rem;
			max-height: 6.5rem;
		}
	}
</style>
