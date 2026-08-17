import { getLoadoutRotationLabel } from '$lib/game/loadout-rotation';
import { getActiveLoadoutPlacements } from '$lib/game/loadout-slots';

import type {
	LoadoutItemDefinition,
	LoadoutPlacement,
	PersistedLoadoutState,
	LoadoutRotation,
	OwnedWeaponInstance,
	WeaponDefinition
} from '$lib/data/types';
import type { PageProps } from './$types';

export interface CombatOverlayState {
	stage: number;
	stageLevel: number;
	campaignLevel: number;
	pixlHealth: number;
	maxPixlHealth: number;
	pixlShieldPool: number;
	shieldColor: string;
	bankedXp: number;
	waveXp: number;
	waveDrops: OwnedWeaponInstance[];
	statusTimerRemaining: number;
	remainingEnemies: number;
	composition: {
		biters: number;
		swarmers: number;
		tankers: number;
	};
	latestCompletedCycle: number;
	weaponDamageRows: Array<{
		weaponInstanceId: string;
		definitionId: string;
		name: string;
		rarity: WeaponDefinition['rarity'];
		placement: string;
		averageDamagePerCycle: number;
	}>;
	status: 'running' | 'cleared' | 'defeated' | 'complete';
}

export interface RewardDropRow {
	instanceId: string;
	definitionId: string;
	definition: LoadoutItemDefinition;
	name: string;
	rarity: WeaponDefinition['rarity'];
	isNew: boolean;
}

export interface LoadoutRow {
	weaponInstanceId: string;
	definitionId: string;
	name: string;
	rarity: WeaponDefinition['rarity'];
	x: number;
	y: number;
	rotation: LoadoutRotation;
}

export interface CampaignStageSummary {
	stage: number;
	startLevel: number;
	endLevel: number;
	unlockedLevelCount: number;
	isCurrentStage: boolean;
	isCleared: boolean;
}

export const rarityOrder = {
	legendary: 0,
	exotic: 1,
	rare: 2,
	magic: 3,
	normal: 4
} as const satisfies Record<WeaponDefinition['rarity'], number>;

export function createInitialCombatOverlay(pageData: PageProps['data']): CombatOverlayState {
	const firstLevel = pageData.campaign.levels[0];
	const maxPixlHealth = pageData.gameState?.pixlState.health ?? pageData.combatProfile.pixl.health;
	const composition = {
		biters: firstLevel?.composition.biters ?? 0,
		swarmers: firstLevel?.composition.swarmers ?? 0,
		tankers: firstLevel?.composition.tankers ?? 0
	};

	return {
		stage: firstLevel?.stage ?? 1,
		stageLevel: firstLevel?.stageLevel ?? 1,
		campaignLevel: pageData.campaignState?.currentLevel ?? 1,
		pixlHealth: maxPixlHealth,
		maxPixlHealth,
		pixlShieldPool: 0,
		shieldColor: '#60a5fa',
		bankedXp: pageData.gameState?.pixlState.xp ?? 0,
		waveXp: 0,
		waveDrops: [],
		statusTimerRemaining: 0,
		remainingEnemies: composition.biters + composition.swarmers + composition.tankers,
		composition,
		latestCompletedCycle: 0,
		weaponDamageRows: [],
		status: 'running'
	};
}

export function buildOverlayStatCards(upgradeState: {
	level: number;
	perkPoints: number;
	xp: number;
	health: number;
	attackSpeed: number;
	loadoutRows: number;
	loadoutColumns: number;
}) {
	return [
		{ label: 'Level', value: upgradeState.level },
		{ label: 'Perk points', value: upgradeState.perkPoints },
		{ label: 'XP', value: upgradeState.xp },
		{ label: 'Health', value: upgradeState.health },
		{ label: 'Attack speed', value: `${upgradeState.attackSpeed.toFixed(1)}/s` },
		{ label: 'Loadout size', value: `${upgradeState.loadoutRows} x ${upgradeState.loadoutColumns}` }
	];
}

export function buildUnlockedStages(
	stageCount: number,
	levelsPerStage: number,
	highestUnlockedLevel: number,
	highestClearedLevel: number,
	currentStage: number
) {
	return Array.from({ length: stageCount }, (_, index) => index + 1)
		.map((stage) => {
			const startLevel = (stage - 1) * levelsPerStage + 1;
			const endLevel = startLevel + levelsPerStage - 1;
			const unlockedLevelCount = Math.max(
				0,
				Math.min(highestUnlockedLevel - startLevel + 1, levelsPerStage)
			);

			return {
				stage,
				startLevel,
				endLevel,
				unlockedLevelCount,
				isCurrentStage: currentStage === stage,
				isCleared: highestClearedLevel >= endLevel
			} satisfies CampaignStageSummary;
		})
		.filter((stage) => stage.unlockedLevelCount > 0);
}

export function buildCurrentLoadoutRows(
	ownedWeapons: OwnedWeaponInstance[],
	loadoutPlacements: LoadoutPlacement[] | PersistedLoadoutState,
	weaponDefinitionById: Record<string, LoadoutItemDefinition>
) {
	const activePlacements = Array.isArray(loadoutPlacements)
		? loadoutPlacements
		: getActiveLoadoutPlacements(loadoutPlacements);
	const ownedWeaponById = Object.fromEntries(
		ownedWeapons.map((weapon) => [weapon.instanceId, weapon])
	) as Record<string, (typeof ownedWeapons)[number]>;

	return activePlacements
		.map((placement) => {
			const ownedWeapon = ownedWeaponById[placement.weaponInstanceId];
			const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

			if (!ownedWeapon || !definition) {
				return null;
			}

			return {
				weaponInstanceId: placement.weaponInstanceId,
				definitionId: definition.id,
				name: definition.name,
				rarity: definition.rarity,
				x: placement.x,
				y: placement.y,
				rotation: placement.rotation
			} satisfies LoadoutRow;
		})
		.filter((entry): entry is LoadoutRow => entry !== null)
		.sort(
			(left, right) => left.y - right.y || left.x - right.x || left.name.localeCompare(right.name)
		);
}

export function buildPreviewLoadoutRows(currentLoadoutRows: LoadoutRow[]) {
	return [...currentLoadoutRows].sort((left, right) => {
		return (
			rarityOrder[left.rarity] - rarityOrder[right.rarity] ||
			left.name.localeCompare(right.name) ||
			left.y - right.y ||
			left.x - right.x
		);
	});
}

export function buildRewardDropRows(
	waveDrops: OwnedWeaponInstance[],
	weaponDefinitionById: Record<string, LoadoutItemDefinition>,
	ownedDefinitionIdsBeforeDrops: Set<string>
) {
	return waveDrops
		.map((weapon) => {
			const definition = weaponDefinitionById[weapon.definitionId];

			if (!definition) {
				return null;
			}

			return {
				instanceId: weapon.instanceId,
				definitionId: definition.id,
				definition,
				name: definition.name,
				rarity: definition.rarity,
				isNew: !ownedDefinitionIdsBeforeDrops.has(definition.id)
			} satisfies RewardDropRow;
		})
		.filter((entry): entry is RewardDropRow => entry !== null);
}

export function buildLoadoutTooltip(currentLoadoutRows: LoadoutRow[]) {
	return (
		currentLoadoutRows
			.map(
				(weapon) =>
					`${weapon.name} (${weapon.x}, ${weapon.y}) · ${getLoadoutRotationLabel(weapon.rotation)}`
			)
			.join('\n') || 'No equipped items'
	);
}
