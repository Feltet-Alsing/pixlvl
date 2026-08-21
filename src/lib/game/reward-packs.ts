import { getRewardPackWeaponPool } from '$lib/data';

import type {
	LoadoutItemDefinition,
	PersistedRewardPack,
	PersistedRewardPackCard,
	WeaponRarity
} from '$lib/data/types';

const PACK_CARD_COUNT = 5;
const GUARANTEED_PACK_SLOT_INDEX = 4;
const NO_GUARANTEED_PACK_SLOT_INDEX = -1;

const NORMAL_SLOT_RARITY_WEIGHTS: Record<WeaponRarity, number> = {
	normal: 5,
	magic: 4,
	rare: 3,
	exotic: 2,
	legendary: 1
};

interface RollLevelRewardPacksInput {
	stage: number;
	isCampaignBoss: boolean;
	sourceCampaignLevel: number;
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

function isSpecialPackStage(stage: number) {
	return stage >= 4 && stage <= 5;
}

function getEligiblePackDefinitions(stage: number, weaponPool: LoadoutItemDefinition[]) {
	return weaponPool.filter((item) => {
		if (item.drop.mode !== 'drop') {
			return false;
		}

		if (item.drop.stageStart && stage < item.drop.stageStart) {
			return false;
		}

		if (item.drop.stageEnd && stage > item.drop.stageEnd) {
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
	fallbacks: WeaponRarity[] = []
) {
	for (const nextRarity of [rarity, ...fallbacks]) {
		const matchingCandidates = candidates.filter((candidate) => candidate.rarity === nextRarity);

		if (matchingCandidates.length === 0) {
			continue;
		}

		return matchingCandidates[randomIndex(matchingCandidates.length)] ?? null;
	}

	return null;
}

function chooseWeightedNormalSlotRarity(
	candidates: LoadoutItemDefinition[],
	randomFloat: () => number
) {
	const availableRarities = Object.entries(NORMAL_SLOT_RARITY_WEIGHTS).filter(([rarity]) =>
		candidates.some((candidate) => candidate.rarity === rarity)
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
	input: RollLevelRewardPacksInput
): PersistedRewardPack {
	return {
		id: input.createPackId(),
		ownerUserId: '',
		campaignId: 0,
		sourceCampaignLevel: input.sourceCampaignLevel,
		droppedAt: new Date().toISOString(),
		openedAt: null,
		status: 'unopened',
		cardCount: cards.length,
		guaranteedSlotIndex,
		contentVersion: 1,
		cards
	};
}

function createNormalRewardPack(
	eligibleDefinitions: LoadoutItemDefinition[],
	input: RollLevelRewardPacksInput
) {
	const cards: PersistedRewardPackCard[] = [];

	for (let slotIndex = 0; slotIndex < PACK_CARD_COUNT; slotIndex += 1) {
		const rarity = chooseWeightedNormalSlotRarity(eligibleDefinitions, input.randomFloat);

		if (!rarity) {
			return null;
		}

		const definition = chooseRandomPackDefinition(eligibleDefinitions, rarity, input.randomIndex, [
			'normal',
			'magic',
			'rare',
			'exotic',
			'legendary'
		]);

		if (!definition) {
			return null;
		}

		cards.push(createRewardPackCard(slotIndex, definition, false));
	}

	return createRewardPack(cards, NO_GUARANTEED_PACK_SLOT_INDEX, input);
}

function createSpecialRewardPack(
	eligibleDefinitions: LoadoutItemDefinition[],
	guaranteedDefinitions: LoadoutItemDefinition[],
	input: RollLevelRewardPacksInput
) {
	const guaranteedRarity = input.randomFloat() < 0.5 ? 'exotic' : 'legendary';
	const guaranteedDefinition = chooseRandomPackDefinition(
		guaranteedDefinitions,
		guaranteedRarity,
		input.randomIndex,
		[guaranteedRarity === 'legendary' ? 'exotic' : 'legendary']
	);

	if (!guaranteedDefinition) {
		return null;
	}

	const cards: PersistedRewardPackCard[] = [];

	for (let slotIndex = 0; slotIndex < PACK_CARD_COUNT - 1; slotIndex += 1) {
		const rarity = chooseWeightedNormalSlotRarity(eligibleDefinitions, input.randomFloat);

		if (!rarity) {
			return null;
		}

		const definition = chooseRandomPackDefinition(eligibleDefinitions, rarity, input.randomIndex, [
			'normal',
			'magic',
			'rare',
			'exotic',
			'legendary'
		]);

		if (!definition) {
			return null;
		}

		cards.push(createRewardPackCard(slotIndex, definition, false));
	}

	cards.push(createRewardPackCard(GUARANTEED_PACK_SLOT_INDEX, guaranteedDefinition, true));

	return createRewardPack(cards, GUARANTEED_PACK_SLOT_INDEX, input);
}

export function rollLevelRewardPacks(input: RollLevelRewardPacksInput): PersistedRewardPack[] {
	const rewardPackWeaponPool = getRewardPackWeaponPool();
	const eligibleDefinitions = getEligiblePackDefinitions(input.stage, rewardPackWeaponPool);

	if (eligibleDefinitions.length === 0) {
		return [];
	}

	const rewardPacks: PersistedRewardPack[] = [];

	if (input.randomFloat() < getNormalPackDropChance(input.isCampaignBoss)) {
		const normalPack = createNormalRewardPack(eligibleDefinitions, input);

		if (normalPack) {
			rewardPacks.push(normalPack);
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
