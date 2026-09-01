import { getDungeon } from '$lib/data';
import { createDungeonRewardPack } from '$lib/game/reward-packs';
import {
	getDungeonProgressForUser,
	getOrCreateGameState,
	updateGameState,
	type GameState,
	type PersistedDungeonProgress
} from '$lib/server/game-state';

type DungeonActionResult<T> =
	{ ok: true; data: T } | { ok: false; status: number; message: string };

function getProgressFromState(gameState: GameState, dungeonId: number) {
	const progress = gameState.dungeonProgress.find((entry) => entry.dungeonId === dungeonId);

	if (!progress) {
		throw new Error(`Unable to load dungeon progress for dungeon ${dungeonId}`);
	}

	return progress;
}

function buildDungeonResponse(
	gameState: GameState,
	dungeonId: number,
	message: string,
	rewardPacksGranted = 0
) {
	const dungeon = getDungeon(dungeonId);
	const progress = getProgressFromState(gameState, dungeonId);

	return {
		dungeonId,
		keyId: dungeon.keyId,
		remainingKeys: gameState.pixlState.dungeonKeys[dungeon.keyId],
		progress,
		rewardPacksGranted,
		message
	};
}

function createDungeonPackId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return `dungeon-pack-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

function buildFreshRunPatch(progress: PersistedDungeonProgress) {
	return {
		currentFloor: 1,
		highestUnlockedFloor: 1,
		highestClearedFloor: 0,
		runActive: false,
		completed: progress.completed
	};
}

export async function startDungeonRunForUser(
	userId: string | undefined,
	dungeonId: number
): Promise<DungeonActionResult<ReturnType<typeof buildDungeonResponse>>> {
	if (!userId) {
		return { ok: false, status: 401, message: 'Sign in to enter dungeons.' };
	}

	const dungeon = getDungeon(dungeonId);
	const gameState = await getOrCreateGameState(userId);
	const currentKeys = gameState.pixlState.dungeonKeys[dungeon.keyId] ?? 0;

	if (currentKeys <= 0) {
		return {
			ok: false,
			status: 400,
			message: `${dungeon.name} requires a matching key to enter.`
		};
	}

	const progress = getProgressFromState(gameState, dungeonId);
	const nextState = await updateGameState(userId, {
		pixlState: {
			dungeonKeys: {
				...gameState.pixlState.dungeonKeys,
				[dungeon.keyId]: currentKeys - 1
			}
		},
		dungeonProgress: [
			{
				dungeonId,
				...buildFreshRunPatch(progress),
				runActive: true
			}
		]
	});

	return {
		ok: true,
		data: buildDungeonResponse(nextState, dungeonId, `${dungeon.name} run started.`)
	};
}

export async function clearDungeonFloorForUser(
	userId: string | undefined,
	dungeonId: number,
	floor: number
): Promise<DungeonActionResult<ReturnType<typeof buildDungeonResponse>>> {
	if (!userId) {
		return { ok: false, status: 401, message: 'Sign in to progress through dungeons.' };
	}

	const dungeon = getDungeon(dungeonId);
	const progress = await getDungeonProgressForUser(userId, dungeonId);

	if (!Number.isInteger(floor) || floor < 1 || floor > dungeon.totalLevels) {
		return { ok: false, status: 400, message: 'Unknown dungeon floor.' };
	}

	if (floor !== progress.currentFloor) {
		return {
			ok: false,
			status: 409,
			message: `Floor ${floor} is not the active dungeon floor.`
		};
	}

	const isFinalFloor = floor >= dungeon.totalLevels;
	const rewardPack = isFinalFloor
		? createDungeonRewardPack({
				dungeonId,
				randomFloat: Math.random,
				randomIndex: (maxExclusive) => Math.floor(Math.random() * maxExclusive),
				createPackId: createDungeonPackId
			})
		: null;
	const nextState = await updateGameState(userId, {
		rewardPacks: rewardPack ? [rewardPack] : [],
		dungeonProgress: [
			{
				dungeonId,
				currentFloor: isFinalFloor ? dungeon.totalLevels : floor + 1,
				highestUnlockedFloor: isFinalFloor ? dungeon.totalLevels : floor + 1,
				highestClearedFloor: floor,
				runActive: !isFinalFloor,
				completed: progress.completed || isFinalFloor
			}
		]
	});

	return {
		ok: true,
		data: buildDungeonResponse(
			nextState,
			dungeonId,
			isFinalFloor
				? rewardPack
					? `${dungeon.name} cleared. ${dungeon.rewardPackName} added to your packs shelf.`
					: `${dungeon.name} cleared, but ${dungeon.rewardPackName} is not configured yet.`
				: `Floor ${floor} cleared.`,
			rewardPack ? 1 : 0
		)
	};
}

export async function failDungeonRunForUser(
	userId: string | undefined,
	dungeonId: number
): Promise<DungeonActionResult<ReturnType<typeof buildDungeonResponse>>> {
	if (!userId) {
		return { ok: false, status: 401, message: 'Sign in to enter dungeons.' };
	}

	const dungeon = getDungeon(dungeonId);
	const progress = await getDungeonProgressForUser(userId, dungeonId);
	const nextState = await updateGameState(userId, {
		dungeonProgress: [
			{
				dungeonId,
				...buildFreshRunPatch(progress)
			}
		]
	});

	return {
		ok: true,
		data: buildDungeonResponse(nextState, dungeonId, `${dungeon.name} run failed.`)
	};
}
