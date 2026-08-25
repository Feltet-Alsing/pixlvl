import type {
	CampaignDefinition,
	CampaignLevel,
	WaveComposition,
	XpPerEnemy
} from '$lib/data/types';

const stages = 5;
const levelsPerStage = 10;
const totalLevels = stages * levelsPerStage;
const GLOBAL_SPAWN_MULTIPLIER = 8;
const STAGE_FIVE_SPAWN_MULTIPLIER = 1.5;

const baseline = {
	startingEnemies: 14,
	stageEnemyIncrease: 12,
	stageLevelBonusScale: 5,
	stageLevelGrowthFactor: 1.16,
	spawnRatePerSecond: 5.6,
	enemyStageScaling: {
		healthPerStage: 0.34,
		damagePerStage: 0.28
	},
	tutorialLevels: [1],
	compositionRules: {
		tutorial:
			'campaign 5 keeps the campaign 4 roster but shifts scaling into tougher enemies and stage-ending bosses',
		standard: {
			biters: 'remain the floor pressure that forces the board to keep basic wave control online',
			swarmers: 'still provide density, but they are no longer the main difficulty lever',
			tankers: 'continue anchoring single-target checks inside the normal waves',
			shard: 'maintains readable ranged pressure in the base roster',
			bulwark: 'keeps shielded front-line pressure in the wave mix',
			shielder: 'protects priority targets so focus-fire still matters',
			zerglitch: 'remains the tankiest normal-wave anchor and split-on-death pressure unit',
			bossMelee: 'stage 1 and 3 bosses slowly encroach and test focused DPS',
			bossRanged: 'stage 2 and 4 bosses circle the arena and fire one heavy projectile per second',
			bossHybrid:
				'the final stage boss combines ranged pressure with a slow encroaching melee fail state'
		}
	},
	bossEnemyMultipliers: {
		stage: 1,
		campaign: 1
	},
	xpDropRules: {
		biter: '4 + floor(stage / 2) + floor(stageLevel / 3)',
		swarmer: '5 + floor(stage / 2) + floor(stageLevel / 3)',
		tanker: '8 + stage + floor(stageLevel / 2)',
		shard: '7 + stage + floor(stageLevel / 2)',
		bulwark: '12 + stage * 2 + floor(stageLevel / 2)',
		shielder: '13 + stage * 2 + floor(stageLevel / 2)',
		zerglitch: '18 + stage * 3 + floor(stageLevel / 2)',
		bossMelee: '40 + stage * 8',
		bossRanged: '40 + stage * 8',
		bossHybrid: '120'
	}
} satisfies CampaignDefinition['baseline'];

function getXpPerEnemy(stage: number, stageLevel: number): XpPerEnemy {
	return {
		biter: 4 + Math.floor(stage / 2) + Math.floor(stageLevel / 3),
		swarmer: 5 + Math.floor(stage / 2) + Math.floor(stageLevel / 3),
		tanker: 8 + stage + Math.floor(stageLevel / 2),
		shard: 7 + stage + Math.floor(stageLevel / 2),
		bulwark: 12 + stage * 2 + Math.floor(stageLevel / 2),
		shielder: 13 + stage * 2 + Math.floor(stageLevel / 2),
		zerglitch: 18 + stage * 3 + Math.floor(stageLevel / 2),
		bossMelee: 40 + stage * 8,
		bossRanged: 40 + stage * 8,
		bossHybrid: 120
	};
}

const glitchOrder = [
	'biter',
	'swarmer',
	'tanker',
	'shard',
	'bulwark',
	'shielder',
	'zerglitch',
	'boss-melee',
	'boss-ranged',
	'boss-hybrid'
] as const;

const compositionKeyByKind = {
	biter: 'biters',
	swarmer: 'swarmers',
	tanker: 'tankers',
	shard: 'shard',
	bulwark: 'bulwark',
	shielder: 'shielder',
	zerglitch: 'zerglitch',
	'boss-melee': 'bossMelee',
	'boss-ranged': 'bossRanged',
	'boss-hybrid': 'bossHybrid'
} as const;

function getComposition(totalEnemies: number, stage: number, stageLevel: number): WaveComposition {
	const swarmerShare = Math.min(0.18 + stage * 0.05 + stageLevel * 0.01, 0.42);
	const tankerShare = Math.min(0.06 + (stage - 1) * 0.028 + stageLevel * 0.005, 0.18);
	const shardShare = Math.min(0.07 + (stage - 1) * 0.022 + stageLevel * 0.005, 0.18);
	const bulwarkShare = Math.min(0.05 + (stage - 1) * 0.02 + stageLevel * 0.004, 0.14);
	const shielderShare = Math.min(0.04 + (stage - 1) * 0.018 + stageLevel * 0.004, 0.12);
	const zerglitchShare = Math.min(0.03 + (stage - 1) * 0.02 + stageLevel * 0.003, 0.1);

	let swarmers = Math.round(totalEnemies * swarmerShare);
	let tankers = Math.round(totalEnemies * tankerShare);
	let shards = Math.round(totalEnemies * shardShare);
	let bulwarks = Math.round(totalEnemies * bulwarkShare);
	let shielders = Math.round(totalEnemies * shielderShare);
	let zerglitches = Math.max(stage >= 2 ? 1 : 0, Math.round(totalEnemies * zerglitchShare));
	let biters = totalEnemies - swarmers - tankers - shards - bulwarks - shielders - zerglitches;

	if (biters < 1) {
		const deficit = 1 - biters;
		biters = 1;
		let remainingDeficit = deficit;

		for (const key of ['zerglitch', 'shielder', 'bulwark', 'shard', 'tanker', 'swarmer'] as const) {
			if (remainingDeficit <= 0) {
				break;
			}

			if (key === 'zerglitch') {
				const reduction = Math.min(zerglitches, remainingDeficit);
				zerglitches -= reduction;
				remainingDeficit -= reduction;
			} else if (key === 'shielder') {
				const reduction = Math.min(shielders, remainingDeficit);
				shielders -= reduction;
				remainingDeficit -= reduction;
			} else if (key === 'bulwark') {
				const reduction = Math.min(bulwarks, remainingDeficit);
				bulwarks -= reduction;
				remainingDeficit -= reduction;
			} else if (key === 'shard') {
				const reduction = Math.min(shards, remainingDeficit);
				shards -= reduction;
				remainingDeficit -= reduction;
			} else if (key === 'tanker') {
				const reduction = Math.min(tankers, remainingDeficit);
				tankers -= reduction;
				remainingDeficit -= reduction;
			} else {
				const reduction = Math.min(swarmers, remainingDeficit);
				swarmers -= reduction;
				remainingDeficit -= reduction;
			}
		}
	}

	if (stage === 1 && stageLevel === 1) {
		zerglitches = 0;
		shielders = Math.min(shielders, 1);
	}

	return {
		biters,
		swarmers,
		tankers,
		shard: shards,
		bulwark: bulwarks,
		shielder: shielders,
		zerglitch: zerglitches
	};
}

function getStageBossKind(stage: number, isCampaignBoss: boolean) {
	if (isCampaignBoss) {
		return 'boss-hybrid' as const;
	}

	return stage === 1 || stage === 3 ? ('boss-melee' as const) : ('boss-ranged' as const);
}

function getTotalXpReward(composition: WaveComposition, xpPerEnemy: XpPerEnemy) {
	return glitchOrder.reduce(
		(total, kind) =>
			total +
			((composition[compositionKeyByKind[kind] as keyof WaveComposition] as number | undefined) ??
				0) *
				((xpPerEnemy[kind as keyof XpPerEnemy] as number | undefined) ?? 0),
		0
	);
}

function createLevel(stage: number, stageLevel: number): CampaignLevel {
	const campaignLevel = (stage - 1) * levelsPerStage + stageLevel;
	const isStageBoss = stageLevel === levelsPerStage;
	const isCampaignBoss = campaignLevel === totalLevels;
	const stagePopulationMultiplier = 1 + (stage - 1) * 2.2;
	const scaledBase =
		(baseline.startingEnemies + (stage - 1) * baseline.stageEnemyIncrease) *
		Math.pow(baseline.stageLevelGrowthFactor, stageLevel - 1);
	const scaledStageLevel = stageLevel * baseline.stageLevelBonusScale;
	let totalStandardEnemies = Math.round(
		(scaledBase + scaledStageLevel) * stagePopulationMultiplier
	);

	if (isStageBoss) {
		totalStandardEnemies = Math.max(18, Math.round(totalStandardEnemies * 0.72));
	}

	if (isCampaignBoss) {
		totalStandardEnemies = Math.max(24, Math.round(totalStandardEnemies * 0.68));
	}

	const composition = getComposition(totalStandardEnemies, stage, stageLevel);

	if (isStageBoss) {
		const bossKind = getStageBossKind(stage, isCampaignBoss);
		const compositionKey = compositionKeyByKind[bossKind];
		composition[compositionKey] = 1;
	}

	const xpPerEnemy = getXpPerEnemy(stage, stageLevel);
	const totalEnemies = Object.values(composition).reduce((sum, count) => sum + (count ?? 0), 0);
	let spawnRatePerSecond = Number(
		(
			baseline.spawnRatePerSecond +
			(stage - 1) * 1.15 +
			(stageLevel - 1) * 0.08 +
			(isStageBoss ? 0.45 : 0)
		).toFixed(2)
	);

	spawnRatePerSecond = Number((spawnRatePerSecond * GLOBAL_SPAWN_MULTIPLIER).toFixed(2));

	if (stage === 5) {
		spawnRatePerSecond = Number((spawnRatePerSecond * STAGE_FIVE_SPAWN_MULTIPLIER).toFixed(2));
	}

	return {
		campaign: 5,
		stage,
		stageLevel,
		campaignLevel,
		isStageBoss,
		isCampaignBoss,
		totalEnemies,
		composition,
		xpPerEnemy,
		totalXpReward: getTotalXpReward(composition, xpPerEnemy),
		spawnRatePerSecond
	};
}

export const campaign5: CampaignDefinition = {
	campaign: 5,
	stages,
	levelsPerStage,
	totalLevels,
	combatProfile: 'endgame-roster-v1',
	baseline,
	levels: Array.from({ length: totalLevels }, (_, index) => {
		const stage = Math.floor(index / levelsPerStage) + 1;
		const stageLevel = (index % levelsPerStage) + 1;

		return createLevel(stage, stageLevel);
	})
};
