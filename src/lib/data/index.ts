import { baselineCombatProfile } from './combat/baseline-v1';
import { campaign2CombatProfile } from './combat/campaign-2-v1';
import { campaign3CombatProfile } from './combat/campaign-3-v1';
import { campaign1 } from './campaigns/campaign-1';
import { campaign2 } from './campaigns/campaign-2';
import { campaign3 } from './campaigns/campaign-3';
import { shopWeaponDefinitions, shopWeaponPools } from './shop';
import { campaign1Weapons, campaign2Weapons, campaign3Weapons } from './weapons';

import type {
	CampaignDefinition,
	CombatProfile,
	LoadoutItemDefinition,
	UtilityDefinition,
	WeaponDefinition
} from './types';

export { baselineCombatProfile, campaign2CombatProfile, campaign3CombatProfile };
export const starterWeaponId = 'pea-shooter';

export const combatProfiles = {
	[baselineCombatProfile.id]: baselineCombatProfile,
	[campaign2CombatProfile.id]: campaign2CombatProfile,
	[campaign3CombatProfile.id]: campaign3CombatProfile
} as const;

export const campaigns = {
	[campaign1.campaign]: campaign1,
	[campaign2.campaign]: campaign2,
	[campaign3.campaign]: campaign3
} as const;

export const campaignWeaponPools = {
	[campaign1.campaign]: campaign1Weapons,
	[campaign2.campaign]: campaign2Weapons,
	[campaign3.campaign]: campaign3Weapons
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

	return pool;
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
