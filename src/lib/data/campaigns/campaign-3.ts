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
	startingEnemies: 12,
	stageEnemyIncrease: 10,
	stageLevelBonusScale: 5,
	stageLevelGrowthFactor: 1.15,
	spawnRatePerSecond: 1.9,
	enemyStageScaling: {
		healthPerStage: 0.22,
		damagePerStage: 0.22
	},
	tutorialLevels: [1],
	compositionRules: {
		tutorial:
			'campaign 3 keeps the campaign 2 roster and introduces shielder as a backline support threat',
		standard: {
			biters: 'remain the floor pressure that makes every support enemy more dangerous',
			swarmers: 'keep the screen busy so utility timing matters',
			tankers: 'anchor the frontline and convert support shields into real time loss',
			shard: 'continue to pressure the pixl directly from the outer ring',
			bulwark: 'stay as self-protecting frontliners that should not also receive support shields',
			shielder: 'orbits at the spawn line and refreshes shields on the closest non-bulwark enemy'
		}
	},
	bossEnemyMultipliers: {
		stage: 1.38,
		campaign: 1.65
	},
	xpDropRules: {
		biter: '3 + floor(stage / 2) + floor(stageLevel / 3)',
		swarmer: '4 + floor(stage / 2) + floor(stageLevel / 3)',
		tanker: '7 + stage + floor(stageLevel / 2)',
		shard: '6 + stage + floor(stageLevel / 2)',
		bulwark: '11 + stage * 2 + floor(stageLevel / 2)',
		shielder: '12 + stage * 2 + floor(stageLevel / 2)'
	}
} satisfies CampaignDefinition['baseline'];

function getXpPerEnemy(stage: number, stageLevel: number): XpPerEnemy {
	return {
		biter: 3 + Math.floor(stage / 2) + Math.floor(stageLevel / 3),
		swarmer: 4 + Math.floor(stage / 2) + Math.floor(stageLevel / 3),
		tanker: 7 + stage + Math.floor(stageLevel / 2),
		shard: 6 + stage + Math.floor(stageLevel / 2),
		bulwark: 11 + stage * 2 + Math.floor(stageLevel / 2),
		shielder: 12 + stage * 2 + Math.floor(stageLevel / 2)
	};
}

const glitchOrder = ['biter', 'swarmer', 'tanker', 'shard', 'bulwark', 'shielder'] as const;
const compositionKeyByKind = {
	biter: 'biters',
	swarmer: 'swarmers',
	tanker: 'tankers',
	shard: 'shard',
	bulwark: 'bulwark',
	shielder: 'shielder'
} as const;

function getComposition(totalEnemies: number, stage: number, stageLevel: number): WaveComposition {
	const swarmerShare = Math.min(0.13 + stage * 0.045 + stageLevel * 0.012, 0.42);
	const tankerShare = Math.min(0.04 + (stage - 1) * 0.025 + stageLevel * 0.004, 0.18);
	const shardShare = Math.min(0.05 + (stage - 1) * 0.022 + stageLevel * 0.005, 0.2);
	const bulwarkShare = Math.min(0.03 + (stage - 1) * 0.018 + stageLevel * 0.003, 0.12);
	const shielderShare = Math.min(0.02 + (stage - 1) * 0.014 + stageLevel * 0.003, 0.1);

	let swarmers = Math.round(totalEnemies * swarmerShare);
	let tankers = Math.round(totalEnemies * tankerShare);
	let shards = Math.round(totalEnemies * shardShare);
	let bulwarks = Math.round(totalEnemies * bulwarkShare);
	let shielders = Math.round(totalEnemies * shielderShare);
	let biters = totalEnemies - swarmers - tankers - shards - bulwarks - shielders;

	if (biters < 1) {
		const deficit = 1 - biters;
		biters = 1;
		let remainingDeficit = deficit;

		for (const key of ['shielder', 'bulwark', 'shard', 'tanker', 'swarmer'] as const) {
			if (remainingDeficit <= 0) {
				break;
			}

			if (key === 'shielder') {
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

	if (stage === 1 && stageLevel === 1 && shielders === 0) {
		if (biters > 1) {
			biters -= 1;
		} else if (swarmers > 0) {
			swarmers -= 1;
		} else if (tankers > 0) {
			tankers -= 1;
		}

		shielders = 1;
	}

	return {
		biters,
		swarmers,
		tankers,
		shard: shards,
		bulwark: bulwarks,
		shielder: shielders
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
	const spawnRatePerSecond = Number(
		(
			baseline.spawnRatePerSecond +
			(stage - 1) * 0.2 +
			(stageLevel - 1) * 0.04 +
			(isStageBoss ? 0.12 : 0)
		).toFixed(2)
	);

	return {
		campaign: 3,
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

export const campaign3: CampaignDefinition = {
	campaign: 3,
	stages,
	levelsPerStage,
	totalLevels,
	combatProfile: 'campaign-3-v1',
	baseline,
	levels: Array.from({ length: totalLevels }, (_, index) => {
		const stage = Math.floor(index / levelsPerStage) + 1;
		const stageLevel = (index % levelsPerStage) + 1;

		return createLevel(stage, stageLevel);
	})
};
