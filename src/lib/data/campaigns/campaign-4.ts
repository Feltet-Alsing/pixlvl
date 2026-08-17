import type {
	CampaignDefinition,
	CampaignLevel,
	WaveComposition,
	XpPerEnemy
} from '$lib/data/types';

const stages = 5;
const levelsPerStage = 10;
const totalLevels = stages * levelsPerStage;

const baseline = {
	startingEnemies: 18,
	stageEnemyIncrease: 18,
	stageLevelBonusScale: 7,
	stageLevelGrowthFactor: 1.18,
	spawnRatePerSecond: 5.6,
	enemyStageScaling: {
		healthPerStage: 0.26,
		damagePerStage: 0.24
	},
	tutorialLevels: [1],
	compositionRules: {
		tutorial:
			'campaign 4 floods the arena and introduces zerglitch as a split-on-death crowd-control check',
		standard: {
			biters: 'stay as the floor pressure that makes all crowd-control sequencing matter',
			swarmers: 'rise sharply with stage level so grouping and stalls become mandatory',
			tankers: 'anchor high-density packs so combo timing matters',
			shard: 'keep ranged pressure active while the player solves clustering',
			bulwark: 'remain shielded frontliners that punish weak payoff windows',
			shielder: 'protects nearby pressure units so resets and grouping tools matter more',
			zerglitch: 'big split-on-death enemy that bursts into ten small follow-up threats'
		}
	},
	bossEnemyMultipliers: {
		stage: 1.42,
		campaign: 1.72
	},
	xpDropRules: {
		biter: '4 + floor(stage / 2) + floor(stageLevel / 3)',
		swarmer: '5 + floor(stage / 2) + floor(stageLevel / 3)',
		tanker: '8 + stage + floor(stageLevel / 2)',
		shard: '7 + stage + floor(stageLevel / 2)',
		bulwark: '12 + stage * 2 + floor(stageLevel / 2)',
		shielder: '13 + stage * 2 + floor(stageLevel / 2)',
		zerglitch: '18 + stage * 3 + floor(stageLevel / 2)'
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
		zerglitch: 18 + stage * 3 + Math.floor(stageLevel / 2)
	};
}

const glitchOrder = [
	'biter',
	'swarmer',
	'tanker',
	'shard',
	'bulwark',
	'shielder',
	'zerglitch'
] as const;
const compositionKeyByKind = {
	biter: 'biters',
	swarmer: 'swarmers',
	tanker: 'tankers',
	shard: 'shard',
	bulwark: 'bulwark',
	shielder: 'shielder',
	zerglitch: 'zerglitch'
} as const;

function getComposition(totalEnemies: number, stage: number, stageLevel: number): WaveComposition {
	const swarmerShare = Math.min(0.2 + stage * 0.06 + stageLevel * 0.012, 0.5);
	const tankerShare = Math.min(0.06 + (stage - 1) * 0.03 + stageLevel * 0.005, 0.2);
	const shardShare = Math.min(0.07 + (stage - 1) * 0.024 + stageLevel * 0.005, 0.2);
	const bulwarkShare = Math.min(0.05 + (stage - 1) * 0.022 + stageLevel * 0.004, 0.16);
	const shielderShare = Math.min(0.035 + (stage - 1) * 0.02 + stageLevel * 0.004, 0.13);
	const zerglitchShare = Math.min(0.025 + (stage - 1) * 0.018 + stageLevel * 0.003, 0.11);

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

function getTotalXpReward(composition: WaveComposition, xpPerEnemy: XpPerEnemy) {
	return glitchOrder.reduce(
		(total, kind) =>
			total +
			((composition[compositionKeyByKind[kind] as keyof WaveComposition] as number | undefined) ??
				0) *
				((xpPerEnemy[kind] as number | undefined) ?? 0),
		0
	);
}

function createLevel(stage: number, stageLevel: number): CampaignLevel {
	const campaignLevel = (stage - 1) * levelsPerStage + stageLevel;
	const isStageBoss = stageLevel === levelsPerStage;
	const isCampaignBoss = campaignLevel === totalLevels;
	const stagePopulationMultiplier = 1 + (stage - 1) * 3;
	const scaledBase =
		(baseline.startingEnemies + (stage - 1) * baseline.stageEnemyIncrease) *
		Math.pow(baseline.stageLevelGrowthFactor, stageLevel - 1);
	const scaledStageLevel = stageLevel * baseline.stageLevelBonusScale;
	let totalEnemies = Math.round((scaledBase + scaledStageLevel) * stagePopulationMultiplier);

	if (isStageBoss) {
		totalEnemies = Math.round(totalEnemies * baseline.bossEnemyMultipliers.stage);
	}

	if (isCampaignBoss) {
		totalEnemies = Math.round(totalEnemies * baseline.bossEnemyMultipliers.campaign);
	}

	const composition = getComposition(totalEnemies, stage, stageLevel);
	const xpPerEnemy = getXpPerEnemy(stage, stageLevel);
	const spawnRatePerSecond = Number(
		(
			baseline.spawnRatePerSecond +
			(stage - 1) * 1.15 +
			(stageLevel - 1) * 0.08 +
			(isStageBoss ? 0.45 : 0)
		).toFixed(2)
	);

	return {
		campaign: 4,
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

export const campaign4: CampaignDefinition = {
	campaign: 4,
	stages,
	levelsPerStage,
	totalLevels,
	combatProfile: 'campaign-4-v1',
	baseline,
	levels: Array.from({ length: totalLevels }, (_, index) => {
		const stage = Math.floor(index / levelsPerStage) + 1;
		const stageLevel = (index % levelsPerStage) + 1;

		return createLevel(stage, stageLevel);
	})
};
