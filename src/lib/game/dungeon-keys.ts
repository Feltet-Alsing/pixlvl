import type { DungeonKeyId, DungeonKeyInventory, DungeonSealInventory } from '$lib/data/types';

export const DUNGEON_KEY_IDS = [
	'dungeon-1-key',
	'dungeon-2-key',
	'dungeon-3-key',
	'dungeon-4-key',
	'dungeon-5-key'
] as const satisfies readonly DungeonKeyId[];

export const DUNGEON_SEALS_PER_KEY = 5;

function normalizeInventoryValue(value: unknown) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.floor(value));
}

export function createDefaultDungeonKeys(): DungeonKeyInventory {
	return Object.fromEntries(DUNGEON_KEY_IDS.map((keyId) => [keyId, 0])) as DungeonKeyInventory;
}

export function createDefaultDungeonSeals(): DungeonSealInventory {
	return Object.fromEntries(DUNGEON_KEY_IDS.map((keyId) => [keyId, 0])) as DungeonSealInventory;
}

export function normalizeDungeonKeys(
	value: DungeonKeyInventory | null | undefined
): DungeonKeyInventory {
	if (!value || typeof value !== 'object') {
		return createDefaultDungeonKeys();
	}

	return Object.fromEntries(
		DUNGEON_KEY_IDS.map((keyId) => [
			keyId,
			normalizeInventoryValue((value as Partial<Record<DungeonKeyId, unknown>>)[keyId])
		])
	) as DungeonKeyInventory;
}

export function normalizeDungeonSeals(
	value: DungeonSealInventory | null | undefined
): DungeonSealInventory {
	if (!value || typeof value !== 'object') {
		return createDefaultDungeonSeals();
	}

	return Object.fromEntries(
		DUNGEON_KEY_IDS.map((keyId) => [
			keyId,
			normalizeInventoryValue((value as Partial<Record<DungeonKeyId, unknown>>)[keyId])
		])
	) as DungeonSealInventory;
}

export function reconcileDungeonKeyProgress(input: {
	dungeonKeys: DungeonKeyInventory | null | undefined;
	dungeonSeals: DungeonSealInventory | null | undefined;
}) {
	const nextKeys = { ...normalizeDungeonKeys(input.dungeonKeys) };
	const nextSeals = { ...normalizeDungeonSeals(input.dungeonSeals) };

	for (const keyId of DUNGEON_KEY_IDS) {
		const seals = nextSeals[keyId];

		if (seals < DUNGEON_SEALS_PER_KEY) {
			continue;
		}

		nextKeys[keyId] += Math.floor(seals / DUNGEON_SEALS_PER_KEY);
		nextSeals[keyId] = seals % DUNGEON_SEALS_PER_KEY;
	}

	return {
		dungeonKeys: nextKeys,
		dungeonSeals: nextSeals
	};
}

export function awardDungeonSeals(input: {
	dungeonKeys: DungeonKeyInventory | null | undefined;
	dungeonSeals: DungeonSealInventory | null | undefined;
	keyId: DungeonKeyId;
	sealsToAdd: number;
}) {
	const baseKeys = normalizeDungeonKeys(input.dungeonKeys);
	const nextSeals = normalizeDungeonSeals(input.dungeonSeals);
	const sealsToAdd = Math.max(0, Math.floor(input.sealsToAdd));

	if (sealsToAdd < 1) {
		return {
			dungeonKeys: baseKeys,
			dungeonSeals: nextSeals,
			keysGranted: 0,
			sealsAdded: 0
		};
	}

	nextSeals[input.keyId] += sealsToAdd;
	const reconciled = reconcileDungeonKeyProgress({
		dungeonKeys: baseKeys,
		dungeonSeals: nextSeals
	});

	return {
		dungeonKeys: reconciled.dungeonKeys,
		dungeonSeals: reconciled.dungeonSeals,
		keysGranted: reconciled.dungeonKeys[input.keyId] - baseKeys[input.keyId],
		sealsAdded: sealsToAdd
	};
}

export function getNewStageBossLevels(input: {
	previousHighestClearedLevel: number;
	nextHighestClearedLevel: number;
	levelsPerStage: number;
	totalLevels: number;
}) {
	const previousHighestClearedLevel = Math.max(0, Math.floor(input.previousHighestClearedLevel));
	const nextHighestClearedLevel = Math.max(0, Math.floor(input.nextHighestClearedLevel));
	const levelsPerStage = Math.max(1, Math.floor(input.levelsPerStage));
	const totalLevels = Math.max(levelsPerStage, Math.floor(input.totalLevels));
	const bossLevels: number[] = [];

	for (let level = levelsPerStage; level <= totalLevels; level += levelsPerStage) {
		if (level > previousHighestClearedLevel && level <= nextHighestClearedLevel) {
			bossLevels.push(level);
		}
	}

	return bossLevels;
}

export function applyCampaignDungeonSealAwards(input: {
	campaignId: number;
	previousHighestClearedLevel: number;
	nextHighestClearedLevel: number;
	levelsPerStage: number;
	totalLevels: number;
	dungeonKeys: DungeonKeyInventory | null | undefined;
	dungeonSeals: DungeonSealInventory | null | undefined;
}) {
	const keyId = `dungeon-${input.campaignId}-key` as DungeonKeyId;
	let nextKeys = normalizeDungeonKeys(input.dungeonKeys);
	let nextSeals = normalizeDungeonSeals(input.dungeonSeals);
	const bossLevels = getNewStageBossLevels(input);
	let bonusSealsAwarded = 0;

	for (const bossLevel of bossLevels) {
		void bossLevel;
		const awarded = awardDungeonSeals({
			dungeonKeys: nextKeys,
			dungeonSeals: nextSeals,
			keyId,
			sealsToAdd: 1
		});

		nextKeys = awarded.dungeonKeys;
		nextSeals = awarded.dungeonSeals;
	}

	const crossedFinalBossFirstTime =
		input.previousHighestClearedLevel < input.totalLevels &&
		input.nextHighestClearedLevel >= input.totalLevels;

	if (crossedFinalBossFirstTime && nextKeys[keyId] < 1 && nextSeals[keyId] > 0) {
		bonusSealsAwarded = DUNGEON_SEALS_PER_KEY - nextSeals[keyId];

		const awarded = awardDungeonSeals({
			dungeonKeys: nextKeys,
			dungeonSeals: nextSeals,
			keyId,
			sealsToAdd: bonusSealsAwarded
		});

		nextKeys = awarded.dungeonKeys;
		nextSeals = awarded.dungeonSeals;
	}

	return {
		dungeonKeys: nextKeys,
		dungeonSeals: nextSeals,
		bossSealsAwarded: bossLevels.length,
		bonusSealsAwarded,
		bossLevels
	};
}
