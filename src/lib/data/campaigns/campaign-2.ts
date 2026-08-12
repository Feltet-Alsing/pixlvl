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
	startingEnemies: 10,
	stageEnemyIncrease: 9,
	stageLevelBonusScale: 4,
	stageLevelGrowthFactor: 1.14,
	spawnRatePerSecond: 1.65,
	tutorialLevels: [1],
	compositionRules: {
		tutorial: 'level 1 opens with biters only before specialist enemies arrive immediately after',
		standard: {
			swarmers: 'increase their share every stage so the screen pressure ramps quickly',
			tankers: 'enter in stage 2 and become regular anchors for the larger weapon roster',
			biters: 'remain the backbone of each wave but lose share to faster and heavier variants'
		}
	},
	bossEnemyMultipliers: {
		stage: 1.35,
		campaign: 1.6
	},
	xpDropRules: {
		biter: '2 + floor(stage / 2) + floor((stageLevel - 1) / 3)',
		swarmer: '3 + floor(stage / 2) + floor(stageLevel / 3)',
		tanker: '6 + stage + floor(stageLevel / 2)'
	}
} satisfies CampaignDefinition['baseline'];

function getXpPerEnemy(stage: number, stageLevel: number): XpPerEnemy {
	return {
		biter: 2 + Math.floor(stage / 2) + Math.floor((stageLevel - 1) / 3),
		swarmer: 3 + Math.floor(stage / 2) + Math.floor(stageLevel / 3),
		tanker: 6 + stage + Math.floor(stageLevel / 2)
	};
}

function getComposition(totalEnemies: number, stage: number, stageLevel: number): WaveComposition {
	if (stage === 1 && stageLevel === 1) {
		return {
			biters: totalEnemies,
			swarmers: 0,
			tankers: 0
		};
	}

	const swarmerShare = Math.min(0.12 + stage * 0.05 + stageLevel * 0.01, 0.42);
	const tankerShare =
		stage >= 2 ? Math.min(0.04 + (stage - 2) * 0.03 + stageLevel * 0.005, 0.18) : 0;

	let swarmers = Math.round(totalEnemies * swarmerShare);
	let tankers = Math.round(totalEnemies * tankerShare);
	let biters = totalEnemies - swarmers - tankers;

	if (biters < 1) {
		const deficit = 1 - biters;
		biters = 1;

		if (tankers >= deficit) {
			tankers -= deficit;
		} else {
			swarmers = Math.max(0, swarmers - (deficit - tankers));
			tankers = 0;
		}
	}

	return {
		biters,
		swarmers,
		tankers
	};
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
			(stage - 1) * 0.18 +
			(stageLevel - 1) * 0.035 +
			(isStageBoss ? 0.1 : 0)
		).toFixed(2)
	);

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
		totalXpReward:
			composition.biters * xpPerEnemy.biter +
			composition.swarmers * xpPerEnemy.swarmer +
			composition.tankers * xpPerEnemy.tanker,
		spawnRatePerSecond
	};
}

export const campaign2: CampaignDefinition = {
	campaign: 2,
	stages,
	levelsPerStage,
	totalLevels,
	combatProfile: 'baseline-v1',
	baseline,
	levels: Array.from({ length: totalLevels }, (_, index) => {
		const stage = Math.floor(index / levelsPerStage) + 1;
		const stageLevel = (index % levelsPerStage) + 1;

		return createLevel(stage, stageLevel);
	})
};
