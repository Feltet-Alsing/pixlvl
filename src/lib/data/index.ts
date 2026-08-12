import { baselineCombatProfile } from './combat/baseline-v1';
import { campaign1 } from './campaigns/campaign-1';
import { campaign2 } from './campaigns/campaign-2';
import { campaign1Weapons, campaign2Weapons } from './weapons';

import type { CampaignDefinition, CombatProfile, WeaponDefinition } from './types';

export { baselineCombatProfile };
export const starterWeaponId = 'pea-shooter';

export const combatProfiles = {
	[baselineCombatProfile.id]: baselineCombatProfile
} as const;

export const campaigns = {
	[campaign1.campaign]: campaign1,
	[campaign2.campaign]: campaign2
} as const;

export const campaignWeaponPools = {
	[campaign1.campaign]: campaign1Weapons,
	[campaign2.campaign]: campaign2Weapons
} as const;

export const weaponDefinitions = Object.fromEntries(
	Object.values(campaignWeaponPools)
		.flat()
		.map((weapon) => [weapon.id, weapon])
) as Record<string, WeaponDefinition>;

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

export function getCampaignWeaponPool(campaignId: number): WeaponDefinition[] {
	const pool = campaignWeaponPools[campaignId as keyof typeof campaignWeaponPools];

	if (!pool) {
		throw new Error(`Unknown weapon pool for campaign ${campaignId}`);
	}

	return pool;
}

export function getWeaponDefinition(definitionId: string): WeaponDefinition {
	const weapon = weaponDefinitions[definitionId];

	if (!weapon) {
		throw new Error(`Unknown weapon definition: ${definitionId}`);
	}

	return weapon;
}
