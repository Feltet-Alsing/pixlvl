import { campaign5 } from '$lib/data/campaigns/campaign-5';
import { createPersistedLoadoutState } from '$lib/game/loadout-slots';

import type {
	CampaignDefinition,
	CampaignLevel,
	CombatProfile,
	LoadoutItemDefinition,
	LoadoutPlacement,
	OwnedWeaponInstance,
	WeaponDefinition,
	WeaponTargetingKind,
	XpPerEnemy
} from '$lib/data/types';

export type WeaponLabPresetId = 'swarm' | 'frontline' | 'shield-wall' | 'siege-line' | 'boss-check';

export interface WeaponLabPreset {
	id: WeaponLabPresetId;
	name: string;
	description: string;
	composition: CampaignLevel['composition'];
	spawnRatePerSecond: number;
	enemyHealthMultiplier?: number;
	enemyDamageMultiplier?: number;
	bossHealthMultiplier?: number;
	bossDamageMultiplier?: number;
}

export interface WeaponLabPixlStateInput {
	xp: number;
	defence: number;
	agility: number;
	ownedWeapons: OwnedWeaponInstance[];
	loadoutPlacements: ReturnType<typeof createPersistedLoadoutState>;
}

const BASE_XP_PER_ENEMY: XpPerEnemy = {
	biter: 5,
	swarmer: 5,
	tanker: 9,
	shard: 9,
	bulwark: 12,
	shielder: 12,
	zerglitch: 18,
	bossMelee: 60,
	bossRanged: 60,
	bossHybrid: 120
};

export const weaponLabPresets: WeaponLabPreset[] = [
	{
		id: 'swarm',
		name: 'Swarm Check',
		description: 'High-count low-health pressure for cadence, spread, and clear-speed testing.',
		composition: { biters: 14, swarmers: 16, shard: 4 },
		spawnRatePerSecond: 18
	},
	{
		id: 'frontline',
		name: 'Frontline Pack',
		description: 'Mixed front-loaded enemies for generic DPS and target selection testing.',
		composition: { biters: 8, swarmers: 6, tankers: 5, shard: 4, bulwark: 2 },
		spawnRatePerSecond: 12
	},
	{
		id: 'shield-wall',
		name: 'Shield Wall',
		description: 'Support-heavy wave for shield break, pierce, and chain testing.',
		composition: { tankers: 5, bulwark: 4, shielder: 5 },
		spawnRatePerSecond: 10,
		enemyHealthMultiplier: 1.15
	},
	{
		id: 'siege-line',
		name: 'Siege Line',
		description: 'Backline-oriented wave for sniper, mark, and anti-ranged testing.',
		composition: { biters: 5, shard: 8, shielder: 4, bossRanged: 1 },
		spawnRatePerSecond: 9,
		bossHealthMultiplier: 0.75,
		bossDamageMultiplier: 0.8
	},
	{
		id: 'boss-check',
		name: 'Boss Check',
		description: 'Single heavy boss with escorts for burst, uptime, and sustain testing.',
		composition: { biters: 4, tankers: 3, shielder: 2, bossHybrid: 1 },
		spawnRatePerSecond: 7,
		bossHealthMultiplier: 0.65,
		bossDamageMultiplier: 0.7
	}
];

export const weaponLabCampaign: CampaignDefinition = {
	campaign: 999,
	stages: 1,
	levelsPerStage: 1,
	totalLevels: 1,
	combatProfile: campaign5.combatProfile,
	baseline: campaign5.baseline,
	levels: []
};

export function getWeaponLabPreset(presetId: WeaponLabPresetId) {
	return weaponLabPresets.find((preset) => preset.id === presetId) ?? weaponLabPresets[0];
}

function getTotalEnemies(level: CampaignLevel['composition']) {
	return Object.values(level).reduce((total, count) => total + (count ?? 0), 0);
}

function getTotalXpReward(level: CampaignLevel['composition']) {
	return (
		(level.biters ?? 0) * (BASE_XP_PER_ENEMY.biter ?? 0) +
		(level.swarmers ?? 0) * (BASE_XP_PER_ENEMY.swarmer ?? 0) +
		(level.tankers ?? 0) * (BASE_XP_PER_ENEMY.tanker ?? 0) +
		(level.shard ?? 0) * (BASE_XP_PER_ENEMY.shard ?? 0) +
		(level.bulwark ?? 0) * (BASE_XP_PER_ENEMY.bulwark ?? 0) +
		(level.shielder ?? 0) * (BASE_XP_PER_ENEMY.shielder ?? 0) +
		(level.zerglitch ?? 0) * (BASE_XP_PER_ENEMY.zerglitch ?? 0) +
		(level.bossMelee ?? 0) * (BASE_XP_PER_ENEMY.bossMelee ?? 0) +
		(level.bossRanged ?? 0) * (BASE_XP_PER_ENEMY.bossRanged ?? 0) +
		(level.bossHybrid ?? 0) * (BASE_XP_PER_ENEMY.bossHybrid ?? 0)
	);
}

export function createWeaponLabLevel(presetId: WeaponLabPresetId): CampaignLevel {
	const preset = getWeaponLabPreset(presetId);

	return {
		campaign: weaponLabCampaign.campaign,
		stage: 1,
		stageLevel: 1,
		campaignLevel: 1,
		isStageBoss: Boolean(
			preset.composition.bossMelee ?? preset.composition.bossRanged ?? preset.composition.bossHybrid
		),
		isCampaignBoss: preset.id === 'boss-check',
		totalEnemies: getTotalEnemies(preset.composition),
		composition: preset.composition,
		xpPerEnemy: BASE_XP_PER_ENEMY,
		totalXpReward: getTotalXpReward(preset.composition),
		spawnRatePerSecond: preset.spawnRatePerSecond,
		enemyHealthMultiplier: preset.enemyHealthMultiplier,
		enemyDamageMultiplier: preset.enemyDamageMultiplier,
		bossHealthMultiplier: preset.bossHealthMultiplier,
		bossDamageMultiplier: preset.bossDamageMultiplier
	};
}

function createLabOwnedItem(definition: LoadoutItemDefinition, index: number): OwnedWeaponInstance {
	return {
		instanceId: `weapon-lab-${definition.id}-${index}`,
		definitionId: definition.id,
		source: 'starter',
		acquiredAt: new Date(0).toISOString(),
		campaignId: null,
		stage: null,
		level: null,
		upgradeLevel: 0,
		totalScrapInvested: 0
	};
}

function createLabPlacement(
	definition: LoadoutItemDefinition,
	instanceId: string,
	position: { x: number; y: number },
	targeting: WeaponTargetingKind
): LoadoutPlacement {
	return {
		weaponInstanceId: instanceId,
		x: position.x,
		y: position.y,
		rotation: 0,
		targeting: 'attack' in definition ? (targeting ?? definition.attack.targeting) : undefined
	};
}

function createWeaponLabPositions(loadoutItems: LoadoutItemDefinition[]) {
	const supportRowSpacing = 3;

	return loadoutItems.map((definition, index) => ({
		x: 0,
		y: 'attack' in definition ? 0 : (index + 1) * supportRowSpacing
	}));
}

export function createWeaponLabPixlState(
	loadoutItems: LoadoutItemDefinition[],
	options: {
		targeting: WeaponTargetingKind;
		xp?: number;
		defence?: number;
		agility?: number;
	} = {
		targeting: 'current-target'
	}
): WeaponLabPixlStateInput {
	const ownedWeapons = loadoutItems.map((definition, index) =>
		createLabOwnedItem(definition, index)
	);
	const positions = createWeaponLabPositions(loadoutItems);
	const placements = ownedWeapons.map((ownedWeapon, index) =>
		createLabPlacement(
			loadoutItems[index],
			ownedWeapon.instanceId,
			positions[index],
			options.targeting
		)
	);

	return {
		xp: options.xp ?? 0,
		defence: options.defence ?? 0,
		agility: options.agility ?? 0,
		ownedWeapons,
		loadoutPlacements: createPersistedLoadoutState(0, [placements, [], []])
	};
}

export const weaponLabCombatProfiles: Array<{
	id: CombatProfile['id'];
	name: string;
	description: string;
}> = [
	{ id: 'baseline-v1', name: 'Baseline', description: 'Slower early-game reference profile.' },
	{
		id: 'full-roster-v1',
		name: 'Full Roster',
		description: 'Mid-game board pressure with broader enemy stats.'
	},
	{
		id: 'endgame-roster-v1',
		name: 'Endgame',
		description: 'High-speed late-game profile for stress testing.'
	}
];
