import type {
	CampaignDefinition,
	CampaignLevel,
	WaveComposition,
	XpPerEnemy
} from '$lib/data/types';

const stages = 5;
const levelsPerStage = 10;
const totalLevels = stages * levelsPerStage;
const STAGE_FIVE_SPAWN_MULTIPLIER = 1.5;

const baseline = {
	startingEnemies: 10,
	stageEnemyIncrease: 9,
	stageLevelBonusScale: 4,
	stageLevelGrowthFactor: 1.14,
	spawnRatePerSecond: 1.65,
	enemyStageScaling: {
		healthPerStage: 0.2,
		damagePerStage: 0.2
	},
	tutorialLevels: [1],
	compositionRules: {
		tutorial:
			'level 1 introduces the full campaign 2 roster immediately, but keeps the advanced glitches in low counts',
		standard: {
			biters:
				'remain the baseline threat but gradually give way to more dangerous campaign-specific glitches',
			swarmers: 'increase their share every stage so the screen pressure ramps quickly',
			tankers: 'can appear immediately and become regular anchors for the larger weapon roster',
			shard:
				'appear from the opening wave as standoff artillery that circle just outside the core and fire inward',
			bulwark:
				'appear from the opening wave as dense frontliners that flash a shield pulse when hit and soak burst damage'
		}
	},
	bossEnemyMultipliers: {
		stage: 1.35,
		campaign: 1.6
	},
	xpDropRules: {
		biter: '2 + floor(stage / 2) + floor((stageLevel - 1) / 3)',
		swarmer: '3 + floor(stage / 2) + floor(stageLevel / 3)',
		tanker: '6 + stage + floor(stageLevel / 2)',
		shard: '5 + stage + floor(stageLevel / 2)',
		bulwark: '10 + stage * 2 + floor(stageLevel / 2)'
	}
} satisfies CampaignDefinition['baseline'];

function getXpPerEnemy(stage: number, stageLevel: number): XpPerEnemy {
	return {
		biter: 2 + Math.floor(stage / 2) + Math.floor((stageLevel - 1) / 3),
		swarmer: 3 + Math.floor(stage / 2) + Math.floor(stageLevel / 3),
		tanker: 6 + stage + Math.floor(stageLevel / 2),
		shard: 5 + stage + Math.floor(stageLevel / 2),
		bulwark: 10 + stage * 2 + Math.floor(stageLevel / 2)
	};
}

const glitchOrder = ['biter', 'swarmer', 'tanker', 'shard', 'bulwark'] as const;
const compositionKeyByKind = {
	biter: 'biters',
	swarmer: 'swarmers',
	tanker: 'tankers',
	shard: 'shard',
	bulwark: 'bulwark'
} as const;

function getComposition(totalEnemies: number, stage: number, stageLevel: number): WaveComposition {
	const swarmerShare = Math.min(0.12 + stage * 0.05 + stageLevel * 0.01, 0.42);
	const tankerShare = Math.min(0.03 + (stage - 1) * 0.025 + stageLevel * 0.004, 0.18);
	const shardShare = Math.min(0.04 + (stage - 1) * 0.022 + stageLevel * 0.005, 0.2);
	const bulwarkShare = Math.min(0.02 + (stage - 1) * 0.018 + stageLevel * 0.003, 0.1);

	let swarmers = Math.round(totalEnemies * swarmerShare);
	let tankers = Math.round(totalEnemies * tankerShare);
	let shards = Math.round(totalEnemies * shardShare);
	let bulwarks = Math.round(totalEnemies * bulwarkShare);
	let biters = totalEnemies - swarmers - tankers - shards - bulwarks;

	if (biters < 1) {
		const deficit = 1 - biters;
		biters = 1;
		let remainingDeficit = deficit;

		for (const key of ['bulwark', 'shard', 'tanker', 'swarmer'] as const) {
			if (remainingDeficit <= 0) {
				break;
			}

			if (key === 'bulwark') {
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
		const immediateKinds = ['shard', 'bulwark'] as const;

		for (const kind of immediateKinds) {
			if ((kind === 'shard' ? shards : bulwarks) > 0) {
				continue;
			}

			if (biters > 1) {
				biters -= 1;
			} else if (swarmers > 0) {
				swarmers -= 1;
			} else if (tankers > 0) {
				tankers -= 1;
			}

			if (kind === 'shard') {
				shards = 1;
			} else {
				bulwarks = 1;
			}
		}
	}

	return {
		biters,
		swarmers,
		tankers,
		shard: shards,
		bulwark: bulwarks
	};
}

function getTotalXpReward(composition: WaveComposition, xpPerEnemy: XpPerEnemy) {
	return glitchOrder.reduce(
		(total, kind) =>
			total + (composition[compositionKeyByKind[kind]] ?? 0) * (xpPerEnemy[kind] ?? 0),
		0
	);
}

function createLevel(stage: number, stageLevel: number): CampaignLevel {
	const campaignLevel = (stage - 1) * levelsPerStage + stageLevel;
	const isStageBoss = stageLevel === levelsPerStage;
	const isCampaignBoss = campaignLevel === totalLevels;
	const scaledBase =
		(baseline.startingEnemies + (stage - 1) * baseline.stageEnemyIncrease) *
		Math.pow(baseline.stageLevelGrowthFactor, stageLevel - 1);
	const scaledStageLevel = stageLevel * baseline.stageLevelBonusScale;
	let totalEnemies = Math.round(scaledBase + scaledStageLevel);

	if (isStageBoss) {
		totalEnemies = Math.round(totalEnemies * baseline.bossEnemyMultipliers.stage);
	}

	if (isCampaignBoss) {
		totalEnemies = Math.round(totalEnemies * baseline.bossEnemyMultipliers.campaign);
	}

	const composition = getComposition(totalEnemies, stage, stageLevel);
	const xpPerEnemy = getXpPerEnemy(stage, stageLevel);
	let spawnRatePerSecond = Number(
		(
			baseline.spawnRatePerSecond +
			(stage - 1) * 0.18 +
			(stageLevel - 1) * 0.035 +
			(isStageBoss ? 0.1 : 0)
		).toFixed(2)
	);

	if (stage === 5) {
		spawnRatePerSecond = Number((spawnRatePerSecond * STAGE_FIVE_SPAWN_MULTIPLIER).toFixed(2));
	}

	return {
		campaign: 2,
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

export const campaign2: CampaignDefinition = {
	campaign: 2,
	stages,
	levelsPerStage,
	totalLevels,
	combatProfile: 'campaign-2-v1',
	baseline,
	levels: Array.from({ length: totalLevels }, (_, index) => {
		const stage = Math.floor(index / levelsPerStage) + 1;
		const stageLevel = (index % levelsPerStage) + 1;

		return createLevel(stage, stageLevel);
	})
};
