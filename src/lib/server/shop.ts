import { campaignShopWeaponPools, getLoadoutItemDefinition, isUtilityDefinition } from '$lib/data';
import type { GameState } from '$lib/server/game-state';
import type {
	LoadoutPlacement,
	OwnedWeaponInstance,
	ShopOffer,
	WeaponRarity
} from '$lib/data/types';

const SHOP_REFRESH_MS = 15 * 60 * 1000;

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
	highestUnlockedCampaignId: number;
	refreshStartedAt: string;
	nextRefreshAt: string;
	offers: ShopOffer[];
}

export interface ScrapableGroupState {
	definitionId: string;
	scrapableCount: number;
	totalCount: number;
	equippedCount: number;
	scrapValuePerItem: number;
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

export function getHighestUnlockedShopCampaignId(gameState: GameState) {
	return gameState.campaignProgress.reduce((highest, progress) => {
		if (!progress.completed) {
			return highest;
		}

		return Math.max(highest, progress.campaignId);
	}, 0);
}

function getOfferWeight(
	rarity: WeaponRarity,
	shopCampaignId: number,
	highestUnlockedCampaignId: number
) {
	const campaignWeight = Math.pow(0.5, Math.max(0, highestUnlockedCampaignId - shopCampaignId));
	return rarityWeightByRarity[rarity] * campaignWeight;
}

function buildEligibleOffers(highestUnlockedCampaignId: number) {
	const offers: ShopOffer[] = [];

	for (let campaignId = 1; campaignId <= highestUnlockedCampaignId; campaignId += 1) {
		const pool = campaignShopWeaponPools[campaignId as keyof typeof campaignShopWeaponPools] ?? [];

		for (const item of pool) {
			const weight = getOfferWeight(item.rarity, campaignId, highestUnlockedCampaignId);
			offers.push({
				definitionId: item.id,
				name: item.name,
				rarity: item.rarity,
				role: item.role,
				price: item.shop?.price ?? 0,
				campaignId,
				weight,
				category: isUtilityDefinition(item) ? 'utility' : 'weapon'
			});
		}
	}

	return offers;
}

function sampleDistinctOffers(offers: ShopOffer[], userId: string, bucket: number, count: number) {
	if (offers.length <= count) {
		return offers;
	}

	const rng = createRng(hashString(`${userId}:${bucket}:shop`));
	const pool = [...offers];
	const selected: ShopOffer[] = [];

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
		pool.splice(selectedIndex, 1);
	}

	return selected;
}

export function buildShopState(gameState: GameState, userId: string, now = Date.now()): ShopState {
	const highestUnlockedCampaignId = getHighestUnlockedShopCampaignId(gameState);
	const bucket = getCurrentShopBucket(now);
	const refreshStartedAt = new Date(bucket * SHOP_REFRESH_MS).toISOString();
	const nextRefreshAt = new Date((bucket + 1) * SHOP_REFRESH_MS).toISOString();

	if (highestUnlockedCampaignId < 1) {
		return {
			isUnlocked: false,
			highestUnlockedCampaignId,
			refreshStartedAt,
			nextRefreshAt,
			offers: []
		};
	}

	const eligibleOffers = buildEligibleOffers(highestUnlockedCampaignId);

	return {
		isUnlocked: true,
		highestUnlockedCampaignId,
		refreshStartedAt,
		nextRefreshAt,
		offers: sampleDistinctOffers(eligibleOffers, userId, bucket, 5)
	};
}

export function getScrapableGroupState(
	ownedWeapons: OwnedWeaponInstance[],
	loadoutPlacements: LoadoutPlacement[],
	definitionId: string
): ScrapableGroupState | null {
	const definition = getLoadoutItemDefinition(definitionId);
	const groupWeapons = ownedWeapons.filter((weapon) => weapon.definitionId === definitionId);

	if (!groupWeapons.length) {
		return null;
	}

	const equippedIds = new Set(loadoutPlacements.map((placement) => placement.weaponInstanceId));
	const equippedCount = groupWeapons.filter((weapon) => equippedIds.has(weapon.instanceId)).length;
	const availableCount = groupWeapons.length - equippedCount;
	const scrapableCount = Math.max(0, Math.min(availableCount, groupWeapons.length - 1));

	return {
		definitionId,
		scrapableCount,
		totalCount: groupWeapons.length,
		equippedCount,
		scrapValuePerItem: scrapValueByRarity[definition.rarity],
		requiresWarning: definition.rarity === 'exotic' || definition.rarity === 'legendary',
		rarity: definition.rarity,
		name: definition.name
	};
}

export function removeScrappedWeapons(
	ownedWeapons: OwnedWeaponInstance[],
	definitionId: string,
	quantity: number,
	loadoutPlacements: LoadoutPlacement[]
) {
	const equippedIds = new Set(loadoutPlacements.map((placement) => placement.weaponInstanceId));
	const candidates = ownedWeapons
		.filter((weapon) => weapon.definitionId === definitionId && !equippedIds.has(weapon.instanceId))
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
		level: null
	};
}
