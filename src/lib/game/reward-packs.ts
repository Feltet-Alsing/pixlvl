import { getDungeon, getDungeonRewardPackWeaponPool, getRewardPackWeaponPool } from '$lib/data';

import type {
	LoadoutItemDefinition,
	PersistedRewardPack,
	PersistedRewardPackCard,
	RewardPackKind,
	WeaponRarity
} from '$lib/data/types';

const PACK_CARD_COUNT = 5;
const DUNGEON_PACK_CARD_COUNT = 2;
const GUARANTEED_PACK_SLOT_INDEX = 4;
const NO_GUARANTEED_PACK_SLOT_INDEX = -1;
const SPECIAL_PACK_LEGENDARY_CHANCE = 0.2;

const DUNGEON_PACK_SLOT_RARITY_WEIGHTS: Record<WeaponRarity, number> = {
	normal: 25,
	magic: 30,
	rare: 20,
	exotic: 15,
	legendary: 10
};

const NORMAL_SLOT_RARITY_WEIGHTS: Record<WeaponRarity, number> = {
	normal: 10,
	magic: 6,
	rare: 2.5,
	exotic: 0.35,
	legendary: 0.08
};

const RARE_PACK_SLOT_RARITY_WEIGHTS: Record<WeaponRarity, number> = {
	normal: NORMAL_SLOT_RARITY_WEIGHTS.normal,
	magic: NORMAL_SLOT_RARITY_WEIGHTS.magic * 2,
	rare: NORMAL_SLOT_RARITY_WEIGHTS.rare * 2,
	exotic: NORMAL_SLOT_RARITY_WEIGHTS.exotic * 2,
	legendary: NORMAL_SLOT_RARITY_WEIGHTS.legendary * 2
};

interface RollLevelRewardPacksInput {
	campaignId: number;
	stage: number;
	isStageBoss: boolean;
	isCampaignBoss: boolean;
	sourceCampaignLevel: number;
	randomFloat: () => number;
	randomIndex: (maxExclusive: number) => number;
	createPackId: () => string;
}

interface RollDungeonRewardPackInput {
	dungeonId: number;
	randomFloat: () => number;
	randomIndex: (maxExclusive: number) => number;
	createPackId: () => string;
}

function getLevelPackDropChance(isCampaignBoss: boolean) {
	return isCampaignBoss ? 0.1 : 0.05;
}

function getNormalPackDropChance(isCampaignBoss: boolean) {
	return Math.min(1, getLevelPackDropChance(isCampaignBoss) * 3);
}

function getRarePackDropChance(
	input: Pick<RollLevelRewardPacksInput, 'campaignId' | 'isStageBoss' | 'isCampaignBoss'>
) {
	if (input.campaignId !== 5 || !input.isStageBoss) {
		return 0;
	}

	return input.isCampaignBoss ? 0.4 : 0.2;
}

function isSpecialPackStage(stage: number) {
	return stage >= 4 && stage <= 5;
}

function getEligiblePackDefinitions(weaponPool: LoadoutItemDefinition[]) {
	return weaponPool.filter((item) => {
		if (item.drop.mode !== 'drop') {
			return false;
		}

		return true;
	});
}

function getGuaranteedPackDefinitions(weaponPool: LoadoutItemDefinition[]) {
	return weaponPool.filter((item) => {
		if (item.drop.mode !== 'drop') {
			return false;
		}

		return item.rarity === 'exotic' || item.rarity === 'legendary';
	});
}

function chooseRandomPackDefinition(
	candidates: LoadoutItemDefinition[],
	rarity: WeaponRarity,
	randomIndex: (maxExclusive: number) => number,
	excludedDefinitionIds: Set<string>,
	fallbacks: WeaponRarity[] = []
) {
	for (const nextRarity of [rarity, ...fallbacks]) {
		const matchingCandidates = candidates.filter(
			(candidate) => candidate.rarity === nextRarity && !excludedDefinitionIds.has(candidate.id)
		);

		if (matchingCandidates.length === 0) {
			continue;
		}

		return matchingCandidates[randomIndex(matchingCandidates.length)] ?? null;
	}

	return null;
}

function chooseWeightedNormalSlotRarity(
	candidates: LoadoutItemDefinition[],
	randomFloat: () => number,
	excludedDefinitionIds: Set<string>,
	rarityWeights: Record<WeaponRarity, number> = NORMAL_SLOT_RARITY_WEIGHTS
) {
	const availableRarities = Object.entries(rarityWeights).filter(([rarity]) =>
		candidates.some(
			(candidate) => candidate.rarity === rarity && !excludedDefinitionIds.has(candidate.id)
		)
	) as Array<[WeaponRarity, number]>;

	if (availableRarities.length === 0) {
		return null;
	}

	const totalWeight = availableRarities.reduce((sum, [, weight]) => sum + weight, 0);
	let roll = randomFloat() * totalWeight;

	for (const [rarity, weight] of availableRarities) {
		roll -= weight;

		if (roll <= 0) {
			return rarity;
		}
	}

	return availableRarities[availableRarities.length - 1]?.[0] ?? null;
}

function createRewardPackCard(
	slotIndex: number,
	definition: LoadoutItemDefinition,
	isGuaranteedSlot: boolean
): PersistedRewardPackCard {
	return {
		slotIndex,
		definitionId: definition.id,
		rarity: definition.rarity,
		isGuaranteedSlot
	};
}

function createRewardPack(
	cards: PersistedRewardPackCard[],
	guaranteedSlotIndex: number,
	kind: RewardPackKind,
	input: RollLevelRewardPacksInput
): PersistedRewardPack {
	return {
		id: input.createPackId(),
		ownerUserId: '',
		campaignId: input.campaignId,
		sourceCampaignLevel: input.sourceCampaignLevel,
		kind,
		droppedAt: new Date().toISOString(),
		openedAt: null,
		status: 'unopened',
		cardCount: cards.length,
		guaranteedSlotIndex,
		contentVersion: 1,
		cards
	};
}

function createStandardRewardPack(
	eligibleDefinitions: LoadoutItemDefinition[],
	kind: Extract<RewardPackKind, 'normal' | 'rare'>,
	rarityWeights: Record<WeaponRarity, number>,
	input: RollLevelRewardPacksInput
) {
	const cards: PersistedRewardPackCard[] = [];
	const selectedDefinitionIds = new Set<string>();

	if (eligibleDefinitions.length < PACK_CARD_COUNT) {
		return null;
	}

	for (let slotIndex = 0; slotIndex < PACK_CARD_COUNT; slotIndex += 1) {
		const rarity = chooseWeightedNormalSlotRarity(
			eligibleDefinitions,
			input.randomFloat,
			selectedDefinitionIds,
			rarityWeights
		);

		if (!rarity) {
			return null;
		}

		const definition = chooseRandomPackDefinition(
			eligibleDefinitions,
			rarity,
			input.randomIndex,
			selectedDefinitionIds,
			['normal', 'magic', 'rare', 'exotic', 'legendary']
		);

		if (!definition) {
			return null;
		}

		selectedDefinitionIds.add(definition.id);
		cards.push(createRewardPackCard(slotIndex, definition, false));
	}

	return createRewardPack(cards, NO_GUARANTEED_PACK_SLOT_INDEX, kind, input);
}

function createSpecialRewardPack(
	eligibleDefinitions: LoadoutItemDefinition[],
	guaranteedDefinitions: LoadoutItemDefinition[],
	input: RollLevelRewardPacksInput
) {
	if (eligibleDefinitions.length < PACK_CARD_COUNT) {
		return null;
	}

	const guaranteedRarity =
		input.randomFloat() < SPECIAL_PACK_LEGENDARY_CHANCE ? 'legendary' : 'exotic';
	const guaranteedDefinition = chooseRandomPackDefinition(
		guaranteedDefinitions,
		guaranteedRarity,
		input.randomIndex,
		new Set<string>(),
		[guaranteedRarity === 'legendary' ? 'exotic' : 'legendary']
	);

	if (!guaranteedDefinition) {
		return null;
	}

	const cards: PersistedRewardPackCard[] = [];
	const selectedDefinitionIds = new Set<string>([guaranteedDefinition.id]);

	for (let slotIndex = 0; slotIndex < PACK_CARD_COUNT - 1; slotIndex += 1) {
		const rarity = chooseWeightedNormalSlotRarity(
			eligibleDefinitions,
			input.randomFloat,
			selectedDefinitionIds
		);

		if (!rarity) {
			return null;
		}

		const definition = chooseRandomPackDefinition(
			eligibleDefinitions,
			rarity,
			input.randomIndex,
			selectedDefinitionIds,
			['normal', 'magic', 'rare', 'exotic', 'legendary']
		);

		if (!definition) {
			return null;
		}

		selectedDefinitionIds.add(definition.id);
		cards.push(createRewardPackCard(slotIndex, definition, false));
	}

	cards.push(createRewardPackCard(GUARANTEED_PACK_SLOT_INDEX, guaranteedDefinition, true));

	return createRewardPack(cards, GUARANTEED_PACK_SLOT_INDEX, 'special', input);
}

export function rollLevelRewardPacks(input: RollLevelRewardPacksInput): PersistedRewardPack[] {
	const rewardPackWeaponPool = getRewardPackWeaponPool();
	const eligibleDefinitions = getEligiblePackDefinitions(rewardPackWeaponPool);

	if (eligibleDefinitions.length === 0) {
		return [];
	}

	const rewardPacks: PersistedRewardPack[] = [];

	if (input.randomFloat() < getNormalPackDropChance(input.isCampaignBoss)) {
		const normalPack = createStandardRewardPack(
			eligibleDefinitions,
			'normal',
			NORMAL_SLOT_RARITY_WEIGHTS,
			input
		);

		if (normalPack) {
			rewardPacks.push(normalPack);
		}
	}

	if (input.randomFloat() < getRarePackDropChance(input)) {
		const rarePack = createStandardRewardPack(
			eligibleDefinitions,
			'rare',
			RARE_PACK_SLOT_RARITY_WEIGHTS,
			input
		);

		if (rarePack) {
			rewardPacks.push(rarePack);
		}
	}

	if (!isSpecialPackStage(input.stage)) {
		return rewardPacks;
	}

	const guaranteedDefinitions = getGuaranteedPackDefinitions(rewardPackWeaponPool);

	if (guaranteedDefinitions.length === 0) {
		return rewardPacks;
	}

	if (input.randomFloat() >= getLevelPackDropChance(input.isCampaignBoss)) {
		return rewardPacks;
	}

	const specialPack = createSpecialRewardPack(eligibleDefinitions, guaranteedDefinitions, input);

	if (specialPack) {
		rewardPacks.push(specialPack);
	}

	return rewardPacks;
}

export function createDungeonRewardPack(
	input: RollDungeonRewardPackInput
): PersistedRewardPack | null {
	const dungeon = getDungeon(input.dungeonId);
	const eligibleDefinitions = getDungeonRewardPackWeaponPool(input.dungeonId).filter(
		(item) => item.drop.mode === 'dungeon-pack' && item.drop.dungeonId === input.dungeonId
	);

	if (eligibleDefinitions.length < DUNGEON_PACK_CARD_COUNT) {
		return null;
	}

	const cards: PersistedRewardPackCard[] = [];
	const selectedDefinitionIds = new Set<string>();

	for (let slotIndex = 0; slotIndex < DUNGEON_PACK_CARD_COUNT; slotIndex += 1) {
		const rarity = chooseWeightedNormalSlotRarity(
			eligibleDefinitions,
			input.randomFloat,
			selectedDefinitionIds,
			DUNGEON_PACK_SLOT_RARITY_WEIGHTS
		);

		if (!rarity) {
			return null;
		}

		const definition = chooseRandomPackDefinition(
			eligibleDefinitions,
			rarity,
			input.randomIndex,
			selectedDefinitionIds,
			['magic', 'rare', 'exotic', 'legendary', 'normal']
		);

		if (!definition) {
			return null;
		}

		selectedDefinitionIds.add(definition.id);
		cards.push(createRewardPackCard(slotIndex, definition, false));
	}

	return {
		id: input.createPackId(),
		ownerUserId: '',
		campaignId: dungeon.sourceCampaignId,
		sourceCampaignLevel: dungeon.totalLevels,
		kind: 'dungeon',
		droppedAt: new Date().toISOString(),
		openedAt: null,
		status: 'unopened',
		cardCount: cards.length,
		guaranteedSlotIndex: NO_GUARANTEED_PACK_SLOT_INDEX,
		contentVersion: 1,
		cards
	};
}
