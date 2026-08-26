import { campaign5 } from './campaign-5';

import type {
	CampaignDefinition,
	CampaignLevel,
	WaveComposition,
	XpPerEnemy
} from '$lib/data/types';

const ENDLESS_CAMPAIGN_ID = 6;
const WAVES_PER_MAJOR_BRACKET = 25;
const WAVES_PER_BOSS_CHECKPOINT = 5;
const BASE_SPAWN_RATE = 14;
const BASE_WAVE_SIZE = 24;
const HEALTH_DAMAGE_GROWTH = 1.2;
const SPAWN_SIZE_GROWTH = 1.1;

function scaleByWave(base: number, wave: number, growth: number) {
	return base * Math.pow(growth, Math.max(0, wave - 1));
}

function sumComposition(composition: WaveComposition) {
	return Object.values(composition).reduce((total, count) => total + (count ?? 0), 0);
}

function getXpPerEnemy(stage: number, stageLevel: number): XpPerEnemy {
	return {
		biter: 6 + stage + Math.floor(stageLevel / 4),
		swarmer: 6 + stage + Math.floor(stageLevel / 4),
		tanker: 10 + stage * 2 + Math.floor(stageLevel / 3),
		shard: 10 + stage * 2 + Math.floor(stageLevel / 3),
		bulwark: 14 + stage * 3 + Math.floor(stageLevel / 3),
		shielder: 14 + stage * 3 + Math.floor(stageLevel / 3),
		zerglitch: 20 + stage * 4 + Math.floor(stageLevel / 2),
		bossMelee: 60 + stage * 10,
		bossRanged: 60 + stage * 10,
		bossHybrid: 140 + stage * 14
	};
}

function createBaseComposition(totalEnemies: number, stage: number): WaveComposition {
	let biters = Math.max(2, Math.round(totalEnemies * 0.26));
	let swarmers = Math.round(totalEnemies * 0.24);
	let tankers = Math.round(totalEnemies * 0.14);
	let shard = Math.round(totalEnemies * 0.1);
	let bulwark = Math.round(totalEnemies * 0.09);
	let shielder = Math.round(totalEnemies * 0.1);
	let zerglitch = Math.max(
		stage >= 2 ? 1 : 0,
		totalEnemies - biters - swarmers - tankers - shard - bulwark - shielder
	);

	while (biters + swarmers + tankers + shard + bulwark + shielder + zerglitch > totalEnemies) {
		if (zerglitch > (stage >= 2 ? 1 : 0)) {
			zerglitch -= 1;
			continue;
		}

		if (shielder > 0) {
			shielder -= 1;
			continue;
		}

		if (bulwark > 0) {
			bulwark -= 1;
			continue;
		}

		if (shard > 0) {
			shard -= 1;
			continue;
		}

		if (tankers > 0) {
			tankers -= 1;
			continue;
		}

		if (swarmers > 0) {
			swarmers -= 1;
			continue;
		}

		break;
	}

	return {
		biters,
		swarmers,
		tankers,
		shard,
		bulwark,
		shielder,
		zerglitch
	};
}

function createBossComposition(
	totalEnemies: number,
	stage: number,
	isMajorBoss: boolean,
	wave: number
) {
	const supportEnemies = Math.max(8, Math.round(totalEnemies * (isMajorBoss ? 0.4 : 0.62)));
	const supportComposition = createBaseComposition(supportEnemies, stage);

	if (isMajorBoss) {
		return {
			...supportComposition,
			bossHybrid: 1
		};
	}

	return (wave / WAVES_PER_BOSS_CHECKPOINT) % 2 === 0
		? {
				...supportComposition,
				bossRanged: 1
			}
		: {
				...supportComposition,
				bossMelee: 1
			};
}

function getTotalXpReward(composition: WaveComposition, xpPerEnemy: XpPerEnemy) {
	return (
		(composition.biters ?? 0) * (xpPerEnemy.biter ?? 0) +
		(composition.swarmers ?? 0) * (xpPerEnemy.swarmer ?? 0) +
		(composition.tankers ?? 0) * (xpPerEnemy.tanker ?? 0) +
		(composition.shard ?? 0) * (xpPerEnemy.shard ?? 0) +
		(composition.bulwark ?? 0) * (xpPerEnemy.bulwark ?? 0) +
		(composition.shielder ?? 0) * (xpPerEnemy.shielder ?? 0) +
		(composition.zerglitch ?? 0) * (xpPerEnemy.zerglitch ?? 0) +
		(composition.bossMelee ?? 0) * (xpPerEnemy.bossMelee ?? 0) +
		(composition.bossRanged ?? 0) * (xpPerEnemy.bossRanged ?? 0) +
		(composition.bossHybrid ?? 0) * (xpPerEnemy.bossHybrid ?? 0)
	);
}

export function createEndlessCampaignLevel(wave: number): CampaignLevel {
	const safeWave = Math.max(1, Math.floor(wave));
	const stage = Math.floor((safeWave - 1) / WAVES_PER_MAJOR_BRACKET) + 1;
	const stageLevel = ((safeWave - 1) % WAVES_PER_MAJOR_BRACKET) + 1;
	const isCampaignBoss = safeWave % WAVES_PER_MAJOR_BRACKET === 0;
	const isStageBoss = safeWave % WAVES_PER_BOSS_CHECKPOINT === 0;
	const waveSize = Math.max(
		12,
		Math.round(scaleByWave(BASE_WAVE_SIZE, safeWave, SPAWN_SIZE_GROWTH))
	);
	const composition = isStageBoss
		? createBossComposition(waveSize, stage, isCampaignBoss, safeWave)
		: createBaseComposition(waveSize, stage);
	const xpPerEnemy = getXpPerEnemy(stage, Math.min(stageLevel, 10));
	const scalingMultiplier = scaleByWave(1, safeWave, HEALTH_DAMAGE_GROWTH);

	return {
		campaign: ENDLESS_CAMPAIGN_ID,
		stage,
		stageLevel,
		campaignLevel: safeWave,
		isStageBoss,
		isCampaignBoss,
		totalEnemies: sumComposition(composition),
		composition,
		xpPerEnemy,
		totalXpReward: getTotalXpReward(composition, xpPerEnemy),
		spawnRatePerSecond: Number(
			scaleByWave(BASE_SPAWN_RATE, safeWave, SPAWN_SIZE_GROWTH).toFixed(2)
		),
		enemyHealthMultiplier: scalingMultiplier,
		enemyDamageMultiplier: scalingMultiplier,
		bossHealthMultiplier: scalingMultiplier,
		bossDamageMultiplier: scalingMultiplier
	};
}

export const campaign6: CampaignDefinition = {
	campaign: ENDLESS_CAMPAIGN_ID,
	name: 'Endless',
	mode: 'endless',
	stages: 1,
	levelsPerStage: WAVES_PER_MAJOR_BRACKET,
	totalLevels: Number.MAX_SAFE_INTEGER,
	combatProfile: campaign5.combatProfile,
	baseline: campaign5.baseline,
	levels: [createEndlessCampaignLevel(1)]
};
