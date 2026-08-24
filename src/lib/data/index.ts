import { baselineCombatProfile } from './combat/baseline-v1';
import { campaign2CombatProfile } from './combat/campaign-2-v1';
import { campaign3CombatProfile } from './combat/campaign-3-v1';
import { campaign4CombatProfile } from './combat/campaign-4-v1';
import { campaign5CombatProfile } from './combat/campaign-5-v1';
import { campaign1 } from './campaigns/campaign-1';
import { campaign2 } from './campaigns/campaign-2';
import { campaign3 } from './campaigns/campaign-3';
import { campaign4 } from './campaigns/campaign-4';
import { campaign5 } from './campaigns/campaign-5';
import { shopWeaponDefinitions, shopWeaponPools } from './shop';
import { campaign1Weapons, campaign2Weapons, campaign3Weapons, campaign4Weapons } from './weapons';

import type {
	CampaignDefinition,
	CombatProfile,
	LoadoutItemDefinition,
	UtilityDefinition,
	WeaponDefinition
} from './types';

export {
	baselineCombatProfile,
	campaign2CombatProfile,
	campaign3CombatProfile,
	campaign4CombatProfile,
	campaign5CombatProfile
};
export const starterWeaponId = 'pea-shooter';

export const combatProfiles = {
	[baselineCombatProfile.id]: baselineCombatProfile,
	[campaign2CombatProfile.id]: campaign2CombatProfile,
	[campaign3CombatProfile.id]: campaign3CombatProfile,
	[campaign4CombatProfile.id]: campaign4CombatProfile,
	[campaign5CombatProfile.id]: campaign5CombatProfile
} as const;

export const campaigns = {
	[campaign1.campaign]: campaign1,
	[campaign2.campaign]: campaign2,
	[campaign3.campaign]: campaign3,
	[campaign4.campaign]: campaign4,
	[campaign5.campaign]: campaign5
} as const;

const sharedPoolDefinitionIds = new Set([
	'target-painter',
	'kill-switch',
	'oathbreaker-sigil',
	'deadeye-sniper',
	'the-knife',
	'hemorrhage-burst',
	'fan-of-knives',
	'blood-catalyst',
	'siphoning-knife'
]);

const sharedPoolWeapons = campaign1Weapons.filter((item) => sharedPoolDefinitionIds.has(item.id));

const allCampaignWeapons = [
	...campaign1Weapons,
	...campaign2Weapons,
	...campaign3Weapons,
	...campaign4Weapons
].filter(
	(item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
);

export const campaignWeaponPools = {
	[campaign1.campaign]: campaign1Weapons,
	[campaign2.campaign]: [...sharedPoolWeapons, ...campaign2Weapons],
	[campaign3.campaign]: [...sharedPoolWeapons, ...campaign3Weapons],
	[campaign4.campaign]: [...sharedPoolWeapons, ...campaign4Weapons],
	[campaign5.campaign]: [...sharedPoolWeapons, ...campaign4Weapons]
} as const;

export const campaignShopWeaponPools = shopWeaponPools;

export const weaponDefinitions = Object.fromEntries(
	[...Object.values(campaignWeaponPools), ...Object.values(shopWeaponPools)]
		.flat()
		.map((item) => [item.id, item])
) as Record<string, LoadoutItemDefinition>;

export const shopItemDefinitions = shopWeaponDefinitions as Record<string, LoadoutItemDefinition>;

export function isUtilityDefinition(item: LoadoutItemDefinition): item is UtilityDefinition {
	return 'category' in item && item.category === 'utility';
}

export function isWeaponDefinition(item: LoadoutItemDefinition): item is WeaponDefinition {
	return !isUtilityDefinition(item);
}

export function getCombatProfile(profileId: string): CombatProfile {
	const profile = combatProfiles[profileId as keyof typeof combatProfiles];

	if (!profile) {
		throw new Error(`Unknown combat profile: ${profileId}`);
	}

	return profile;
}

export function getCampaign(campaignId: number): CampaignDefinition {
	const campaign = campaigns[campaignId as keyof typeof campaigns];

	if (!campaign) {
		throw new Error(`Unknown campaign: ${campaignId}`);
	}

	return campaign;
}

export function getCampaignLevel(campaignId: number, campaignLevel: number) {
	const campaign = getCampaign(campaignId);
	const level = campaign.levels.find((entry) => entry.campaignLevel === campaignLevel);

	if (!level) {
		throw new Error(`Unknown campaign level ${campaignLevel} for campaign ${campaignId}`);
	}

	return level;
}

export function getCampaignCombatProfile(campaignId: number): CombatProfile {
	const campaign = getCampaign(campaignId);

	return getCombatProfile(campaign.combatProfile);
}

export function getCampaignWeaponPool(campaignId: number): LoadoutItemDefinition[] {
	const pool = campaignWeaponPools[campaignId as keyof typeof campaignWeaponPools];

	if (!pool) {
		throw new Error(`Unknown weapon pool for campaign ${campaignId}`);
	}

	return [...pool];
}

export function getRewardPackWeaponPool(): LoadoutItemDefinition[] {
	return allCampaignWeapons;
}

export function getLoadoutItemDefinition(definitionId: string): LoadoutItemDefinition {
	const item = weaponDefinitions[definitionId];

	if (!item) {
		throw new Error(`Unknown loadout item definition: ${definitionId}`);
	}

	return item;
}

export function getWeaponDefinition(definitionId: string): WeaponDefinition {
	const weapon = getLoadoutItemDefinition(definitionId);

	if (!isWeaponDefinition(weapon)) {
		throw new Error(`Definition ${definitionId} is not a weapon`);
	}

	return weapon;
}
