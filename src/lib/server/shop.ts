import {
	getLoadoutItemDefinition,
	isUtilityDefinition,
	starterWeaponId,
	weaponDefinitions
} from '$lib/data';
import {
	getWeaponDisplayName,
	getWeaponTotalScrapInvested,
	getWeaponUpgradeLevel
} from '$lib/game/weapon-upgrades';
import type { GameState } from '$lib/server/game-state';
import type {
	LoadoutItemDefinition,
	LoadoutPlacement,
	OwnedWeaponInstance,
	PersistedLoadoutState,
	ShopOffer,
	WeaponRarity
} from '$lib/data/types';

import { getActiveLoadoutPlacements } from '$lib/game/loadout-slots';
const SHOP_REFRESH_MS = 15 * 60 * 1000;

const shopPriceByRarity: Record<WeaponRarity, number> = {
	normal: 200,
	magic: 900,
	rare: 4000,
	exotic: 20000,
	legendary: 100000
};

const shopSlotCountByRarity: Record<WeaponRarity, number> = {
	normal: 5,
	magic: 4,
	rare: 3,
	exotic: 2,
	legendary: 1
};

const shopUnlockCampaignId = 1;

const rarityWeightByRarity: Record<WeaponRarity, number> = {
	normal: 10,
	magic: 6,
	rare: 3,
	exotic: 1,
	legendary: 0.35
};

export const scrapValueByRarity: Record<WeaponRarity, number> = {
	normal: 5,
	magic: 25,
	rare: 100,
	exotic: 500,
	legendary: 5000
};

export interface ShopState {
	isUnlocked: boolean;
	refreshStartedAt: string;
	nextRefreshAt: string;
	offers: ShopOffer[];
}

interface ShopOfferCandidate extends ShopOffer {
	isInfuser: boolean;
	ownedCount: number;
}

export interface ScrapableGroupState {
	definitionId: string;
	weaponInstanceId: string | null;
	scrapableCount: number;
	totalCount: number;
	equippedCount: number;
	upgradedCount: number;
	scrapValuePerItem: number;
	refundScrapPerItem: number;
	isUpgraded: boolean;
	requiresWarning: boolean;
	rarity: WeaponRarity;
	name: string;
}

function getCurrentShopBucket(now = Date.now()) {
	return Math.floor(now / SHOP_REFRESH_MS);
}

function hashString(input: string) {
	let hash = 2166136261;

	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

function createRng(seed: number) {
	let value = seed >>> 0;

	return () => {
		value = (value + 0x6d2b79f5) | 0;
		let result = Math.imul(value ^ (value >>> 15), 1 | value);
		result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
		return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
	};
}

function isShopUnlocked(gameState: GameState) {
	return gameState.campaignProgress.some(
		(progress) => progress.campaignId === shopUnlockCampaignId && progress.completed
	);
}

function getOfferCampaignId(offer: {
	shop?: { campaignId: number };
	drop: { campaignId?: number };
}) {
	return offer.shop?.campaignId ?? offer.drop.campaignId ?? 1;
}

function isInfuserOffer(candidate: LoadoutItemDefinition) {
	return isUtilityDefinition(candidate) && candidate.effect.type === 'elemental-infuser';
}

function getOwnedDefinitionCountById(gameState: GameState) {
	const counts = new Map<string, number>();

	for (const ownedWeapon of gameState.pixlState.ownedWeapons) {
		counts.set(ownedWeapon.definitionId, (counts.get(ownedWeapon.definitionId) ?? 0) + 1);
	}

	return counts;
}

function getOfferWeight(rarity: WeaponRarity, ownedCount: number) {
	const ownedBias =
		ownedCount === 0 ? 10 : ownedCount === 1 ? 4 : ownedCount === 2 ? 1.75 : 0.45 / ownedCount;

	return rarityWeightByRarity[rarity] * ownedBias;
}

function buildEligibleOffers(gameState: GameState) {
	const offers: ShopOfferCandidate[] = [];
	const ownedDefinitionCountById = getOwnedDefinitionCountById(gameState);

	for (const item of Object.values(weaponDefinitions)) {
		if (item.id === starterWeaponId) {
			continue;
		}

		if (item.drop.mode !== 'shop') {
			continue;
		}

		const ownedCount = ownedDefinitionCountById.get(item.id) ?? 0;
		const weight = getOfferWeight(item.rarity, ownedCount);

		offers.push({
			definitionId: item.id,
			name: item.name,
			rarity: item.rarity,
			role: item.role,
			price: shopPriceByRarity[item.rarity],
			campaignId: getOfferCampaignId(item),
			weight,
			category: isUtilityDefinition(item) ? 'utility' : 'weapon',
			isInfuser: isInfuserOffer(item),
			ownedCount
		});
	}

	return offers;
}

function sampleDistinctOffers(
	offers: ShopOfferCandidate[],
	rng: () => number,
	count: number,
	excludedDefinitionIds: Set<string>
) {
	const pool = offers.filter((offer) => !excludedDefinitionIds.has(offer.definitionId));
	const selected: ShopOfferCandidate[] = [];

	while (selected.length < count && pool.length > 0) {
		const totalWeight = pool.reduce((total, offer) => total + offer.weight, 0);
		let roll = rng() * totalWeight;
		let selectedIndex = 0;

		for (let index = 0; index < pool.length; index += 1) {
			roll -= pool[index].weight;
			if (roll <= 0) {
				selectedIndex = index;
				break;
			}
		}

		selected.push(pool[selectedIndex]);
		excludedDefinitionIds.add(pool[selectedIndex].definitionId);
		pool.splice(selectedIndex, 1);
	}

	return selected;
}

function stripOfferCandidateMetadata(offer: ShopOfferCandidate): ShopOffer {
	return {
		definitionId: offer.definitionId,
		name: offer.name,
		rarity: offer.rarity,
		role: offer.role,
		price: offer.price,
		campaignId: offer.campaignId,
		weight: offer.weight,
		category: offer.category
	};
}

function buildRotationOffers(gameState: GameState, userId: string, bucket: number) {
	const eligibleOffers = buildEligibleOffers(gameState);
	const rng = createRng(hashString(`${userId}:${bucket}:shop-v2`));
	const excludedDefinitionIds = new Set<string>();
	const selected: ShopOfferCandidate[] = [];

	const infuserOffers = eligibleOffers.filter(
		(offer) => offer.rarity === 'normal' && offer.isInfuser
	);
	const normalOffers = eligibleOffers.filter(
		(offer) => offer.rarity === 'normal' && !offer.isInfuser
	);
	const magicOffers = eligibleOffers.filter((offer) => offer.rarity === 'magic');
	const rareOffers = eligibleOffers.filter((offer) => offer.rarity === 'rare');
	const exoticOffers = eligibleOffers.filter((offer) => offer.rarity === 'exotic');
	const legendaryOffers = eligibleOffers.filter((offer) => offer.rarity === 'legendary');

	selected.push(...sampleDistinctOffers(infuserOffers, rng, 1, excludedDefinitionIds));
	selected.push(
		...sampleDistinctOffers(
			normalOffers,
			rng,
			shopSlotCountByRarity.normal - selected.length,
			excludedDefinitionIds
		)
	);

	if (selected.filter((offer) => offer.rarity === 'normal').length < shopSlotCountByRarity.normal) {
		selected.push(
			...sampleDistinctOffers(
				eligibleOffers.filter((offer) => offer.rarity === 'normal'),
				rng,
				shopSlotCountByRarity.normal - selected.filter((offer) => offer.rarity === 'normal').length,
				excludedDefinitionIds
			)
		);
	}

	selected.push(
		...sampleDistinctOffers(magicOffers, rng, shopSlotCountByRarity.magic, excludedDefinitionIds)
	);
	selected.push(
		...sampleDistinctOffers(rareOffers, rng, shopSlotCountByRarity.rare, excludedDefinitionIds)
	);
	selected.push(
		...sampleDistinctOffers(exoticOffers, rng, shopSlotCountByRarity.exotic, excludedDefinitionIds)
	);
	selected.push(
		...sampleDistinctOffers(
			legendaryOffers,
			rng,
			shopSlotCountByRarity.legendary,
			excludedDefinitionIds
		)
	);

	return selected.map(stripOfferCandidateMetadata);
}

export function buildShopState(gameState: GameState, userId: string, now = Date.now()): ShopState {
	const bucket = getCurrentShopBucket(now);
	const refreshStartedAt = new Date(bucket * SHOP_REFRESH_MS).toISOString();
	const nextRefreshAt = new Date((bucket + 1) * SHOP_REFRESH_MS).toISOString();

	if (!isShopUnlocked(gameState)) {
		return {
			isUnlocked: false,
			refreshStartedAt,
			nextRefreshAt,
			offers: []
		};
	}

	return {
		isUnlocked: true,
		refreshStartedAt,
		nextRefreshAt,
		offers: buildRotationOffers(gameState, userId, bucket)
	};
}

export function getScrapableGroupState(
	ownedWeapons: OwnedWeaponInstance[],
	loadoutPlacements: LoadoutPlacement[] | PersistedLoadoutState,
	definitionId: string,
	weaponInstanceId?: string | null
): ScrapableGroupState | null {
	const definition = getLoadoutItemDefinition(definitionId);
	const groupWeapons = ownedWeapons.filter((weapon) => weapon.definitionId === definitionId);

	if (!groupWeapons.length) {
		return null;
	}

	const equippedIds = new Set(
		(Array.isArray(loadoutPlacements)
			? loadoutPlacements
			: getActiveLoadoutPlacements(loadoutPlacements)
		).map((placement) => placement.weaponInstanceId)
	);

	if (weaponInstanceId) {
		const targetWeapon =
			groupWeapons.find((weapon) => weapon.instanceId === weaponInstanceId) ?? null;

		if (!targetWeapon) {
			return null;
		}

		const isEquipped = equippedIds.has(targetWeapon.instanceId);
		const upgradeLevel = getWeaponUpgradeLevel(targetWeapon);
		const totalScrapInvested = getWeaponTotalScrapInvested(targetWeapon);
		const refundScrapPerItem = Math.floor(totalScrapInvested * 0.5);
		const scrapableCount = definitionId === starterWeaponId || isEquipped ? 0 : 1;

		return {
			definitionId,
			weaponInstanceId: targetWeapon.instanceId,
			scrapableCount,
			totalCount: 1,
			equippedCount: isEquipped ? 1 : 0,
			upgradedCount: upgradeLevel > 0 ? 1 : 0,
			scrapValuePerItem: scrapValueByRarity[definition.rarity] + refundScrapPerItem,
			refundScrapPerItem,
			isUpgraded: upgradeLevel > 0,
			requiresWarning:
				definition.rarity === 'exotic' || definition.rarity === 'legendary' || upgradeLevel > 0,
			rarity: definition.rarity,
			name: getWeaponDisplayName(definition.name, upgradeLevel)
		};
	}

	const unupgradedWeapons = groupWeapons.filter((weapon) => getWeaponUpgradeLevel(weapon) === 0);
	const upgradedCount = groupWeapons.length - unupgradedWeapons.length;
	const equippedCount = unupgradedWeapons.filter((weapon) =>
		equippedIds.has(weapon.instanceId)
	).length;
	const availableCount = unupgradedWeapons.length - equippedCount;
	const scrapableCount = definitionId === starterWeaponId ? 0 : Math.max(0, availableCount);

	return {
		definitionId,
		weaponInstanceId: null,
		scrapableCount,
		totalCount: unupgradedWeapons.length,
		equippedCount,
		upgradedCount,
		scrapValuePerItem: scrapValueByRarity[definition.rarity],
		refundScrapPerItem: 0,
		isUpgraded: false,
		requiresWarning: definition.rarity === 'exotic' || definition.rarity === 'legendary',
		rarity: definition.rarity,
		name: definition.name
	};
}

export function removeScrappedWeapons(
	ownedWeapons: OwnedWeaponInstance[],
	definitionId: string,
	quantity: number,
	loadoutPlacements: LoadoutPlacement[] | PersistedLoadoutState,
	weaponInstanceId?: string | null
) {
	const equippedIds = new Set(
		(Array.isArray(loadoutPlacements)
			? loadoutPlacements
			: getActiveLoadoutPlacements(loadoutPlacements)
		).map((placement) => placement.weaponInstanceId)
	);

	if (weaponInstanceId) {
		return ownedWeapons.filter(
			(weapon) =>
				weapon.instanceId !== weaponInstanceId ||
				weapon.definitionId !== definitionId ||
				weapon.definitionId === starterWeaponId ||
				equippedIds.has(weapon.instanceId)
		);
	}

	const candidates = ownedWeapons
		.filter(
			(weapon) =>
				weapon.definitionId === definitionId &&
				weapon.definitionId !== starterWeaponId &&
				!equippedIds.has(weapon.instanceId) &&
				getWeaponUpgradeLevel(weapon) === 0
		)
		.sort(
			(left, right) => new Date(right.acquiredAt).getTime() - new Date(left.acquiredAt).getTime()
		);
	const instanceIdsToRemove = new Set(
		candidates.slice(0, quantity).map((weapon) => weapon.instanceId)
	);

	return ownedWeapons.filter((weapon) => !instanceIdsToRemove.has(weapon.instanceId));
}

export function createShopOwnedWeaponInstance(
	definitionId: string,
	campaignId: number
): OwnedWeaponInstance {
	return {
		instanceId: `shop-${crypto.randomUUID()}`,
		definitionId,
		source: 'shop',
		acquiredAt: new Date().toISOString(),
		campaignId,
		stage: 5,
		level: null,
		upgradeLevel: 0,
		totalScrapInvested: 0
	};
}
