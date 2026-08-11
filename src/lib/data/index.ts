import baselineCombatProfileJson from './combat/baseline-v1.json';
import campaign1Json from './campaigns/campaign-1.json';

import type { CampaignDefinition, CombatProfile } from './types';

export const baselineCombatProfile = baselineCombatProfileJson as CombatProfile;
export const campaign1 = campaign1Json as CampaignDefinition;

export const combatProfiles = {
	[baselineCombatProfile.id]: baselineCombatProfile
} as const;

export const campaigns = {
	[campaign1.campaign]: campaign1
} as const;

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