import { isWeaponDefinition } from '$lib/data';

import type {
	LoadoutItemDefinition,
	OwnedWeaponInstance,
	WeaponDefinition,
	WeaponRarity
} from '$lib/data/types';

export const MAX_WEAPON_UPGRADE_LEVEL = 5;

export const weaponUpgradeRarityMultiplierByRarity: Record<WeaponRarity, number> = {
	normal: 1,
	magic: 2,
	rare: 3,
	exotic: 4,
	legendary: 5
};

export function getWeaponUpgradeLevel(weapon: OwnedWeaponInstance) {
	return Math.max(0, Math.min(MAX_WEAPON_UPGRADE_LEVEL, Math.floor(weapon.upgradeLevel ?? 0)));
}

export function getWeaponTotalScrapInvested(weapon: OwnedWeaponInstance) {
	return Math.max(0, Math.floor(weapon.totalScrapInvested ?? 0));
}

export function isUpgradeableWeaponInstance(
	weapon: OwnedWeaponInstance,
	definition: LoadoutItemDefinition | null | undefined
) {
	if (!definition || !isWeaponDefinition(definition)) {
		return false;
	}

	return definition.baseDamage > 0;
}

export function getWeaponUpgradeCostForNextLevel(
	weapon: OwnedWeaponInstance,
	rarity: WeaponRarity
) {
	const nextLevel = getWeaponUpgradeLevel(weapon) + 1;

	if (nextLevel > MAX_WEAPON_UPGRADE_LEVEL) {
		return null;
	}

	return 100 * weaponUpgradeRarityMultiplierByRarity[rarity] * nextLevel;
}

export function getWeaponDisplayName(baseName: string, upgradeLevel: number) {
	return upgradeLevel > 0 ? `${baseName} +${upgradeLevel}` : baseName;
}

export function getWeaponDamageMultiplier(
	weapon: OwnedWeaponInstance,
	definition: WeaponDefinition
) {
	const upgradeLevel = getWeaponUpgradeLevel(weapon);
	const baseProjectileCount = Math.max(1, definition.attack.projectileCount);
	const singleProjectileCapstoneBonus =
		upgradeLevel >= MAX_WEAPON_UPGRADE_LEVEL && baseProjectileCount === 1 ? 0.2 : 0;

	return 1 + upgradeLevel * 0.1 + singleProjectileCapstoneBonus;
}

export function getWeaponProjectileSpeedMultiplier(weapon: OwnedWeaponInstance) {
	const upgradeLevel = getWeaponUpgradeLevel(weapon);
	return 1 + upgradeLevel * 0.05;
}

export function getWeaponCapstoneProjectileBonus(
	weapon: OwnedWeaponInstance,
	definition: WeaponDefinition
) {
	const upgradeLevel = getWeaponUpgradeLevel(weapon);
	const baseProjectileCount = Math.max(1, definition.attack.projectileCount);

	return upgradeLevel >= MAX_WEAPON_UPGRADE_LEVEL && baseProjectileCount > 1 ? 1 : 0;
}

export function createUpgradedWeaponDefinition(
	weapon: OwnedWeaponInstance,
	definition: WeaponDefinition
) {
	if (!isUpgradeableWeaponInstance(weapon, definition)) {
		return definition;
	}

	const upgradeLevel = getWeaponUpgradeLevel(weapon);

	if (upgradeLevel <= 0) {
		return definition;
	}

	return {
		...definition,
		name: getWeaponDisplayName(definition.name, upgradeLevel),
		baseDamage: definition.baseDamage * getWeaponDamageMultiplier(weapon, definition),
		projectileSpeed: definition.projectileSpeed * getWeaponProjectileSpeedMultiplier(weapon),
		attack: {
			...definition.attack,
			projectileCount:
				definition.attack.projectileCount + getWeaponCapstoneProjectileBonus(weapon, definition)
		}
	};
}
