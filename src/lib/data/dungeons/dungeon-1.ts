import type { DungeonDefinition, DungeonFloor, DungeonWaveComposition } from '$lib/data/types';

function createFloor(
	floor: number,
	totalEnemies: number,
	spawnRatePerSecond: number,
	composition: DungeonWaveComposition,
	isBossFloor = false
): DungeonFloor {
	return {
		dungeonId: 1,
		stage: 1,
		floor,
		dungeonLevel: floor,
		isBossFloor,
		totalEnemies,
		composition,
		spawnRatePerSecond
	};
}

export const dungeon1: DungeonDefinition = {
	dungeonId: 1,
	sourceCampaignId: 1,
	keyId: 'dungeon-1-key',
	name: 'Ancient Ruins',
	rewardPackName: 'Ancient Ruins Pack',
	theme: 'Ancient ruins rune-casting dungeon with temple pressure and solar ritual payoff',
	stages: 1,
	levelsPerStage: 5,
	totalLevels: 5,
	combatProfile: 'dungeon-ancient-ruins-v1',
	floors: [
		createFloor(1, 788, 146.88, {
			swarmer: 284,
			shard: 126,
			soldier: 221,
			golem: 157
		}),
		createFloor(2, 964, 148.03, {
			swarmer: 257,
			shard: 161,
			soldier: 257,
			sunpriest: 96,
			golem: 193
		}),
		createFloor(3, 1158, 149.18, {
			swarmer: 290,
			shard: 193,
			soldier: 289,
			sunpriest: 129,
			golem: 257
		}),
		createFloor(4, 1373, 150.34, {
			swarmer: 287,
			shard: 224,
			soldier: 415,
			sunpriest: 160,
			golem: 287
		}),
		createFloor(
			5,
			1614,
			151.49,
			{
				swarmer: 312,
				shard: 260,
				soldier: 416,
				sunpriest: 156,
				golem: 469,
				'high-priest': 1
			},
			true
		)
	]
};
