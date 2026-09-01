import { baselineCombatProfile } from './combat/baseline-v1';
import { dungeonAncientRuinsCombatProfile } from './combat/dungeon-ancient-ruins-v1';
import { fullRosterCombatProfile } from './combat/full-roster-v1';
import { reinforcedRosterCombatProfile } from './combat/reinforced-roster-v1';
import { onslaughtRosterCombatProfile } from './combat/onslaught-roster-v1';
import { endgameRosterCombatProfile } from './combat/endgame-roster-v1';
import { campaign1 } from './campaigns/campaign-1';
import { campaign2 } from './campaigns/campaign-2';
import { campaign3 } from './campaigns/campaign-3';
import { campaign4 } from './campaigns/campaign-4';
import { campaign5 } from './campaigns/campaign-5';
import { campaign6, createEndlessCampaignLevel } from './campaigns/campaign-6';
import { dungeon1 } from './dungeons/dungeon-1';
import { dungeon1RewardDefinitions } from './dungeons/rewards/dungeon-1';
import { shopWeaponDefinitions, shopWeaponPools } from './shop';
import { anomalyWeapons, controlWeapons, elementalWeapons, sharedWeapons } from './weapons';

import type {
	CampaignDefinition,
	CombatProfile,
	DungeonDefinition,
	LoadoutItemDefinition,
	UtilityDefinition,
	WeaponDefinition
} from './types';

export {
	baselineCombatProfile,
	dungeonAncientRuinsCombatProfile,
	fullRosterCombatProfile,
	reinforcedRosterCombatProfile,
	onslaughtRosterCombatProfile,
	endgameRosterCombatProfile
};
export const starterWeaponId = 'pea-shooter';

export const combatProfiles = {
	[baselineCombatProfile.id]: baselineCombatProfile,
	[dungeonAncientRuinsCombatProfile.id]: dungeonAncientRuinsCombatProfile,
	[fullRosterCombatProfile.id]: fullRosterCombatProfile,
	[reinforcedRosterCombatProfile.id]: reinforcedRosterCombatProfile,
	[onslaughtRosterCombatProfile.id]: onslaughtRosterCombatProfile,
	[endgameRosterCombatProfile.id]: endgameRosterCombatProfile
} as const;

export const campaigns = {
	[campaign1.campaign]: campaign1,
	[campaign2.campaign]: campaign2,
	[campaign3.campaign]: campaign3,
	[campaign4.campaign]: campaign4,
	[campaign5.campaign]: campaign5,
	[campaign6.campaign]: campaign6
} as const;

export const dungeons = {
	[dungeon1.dungeonId]: dungeon1
} as const;

const sharedPoolDefinitionIds = new Set([
	'target-painter',
	'kill-switch',
	'shield-booster',
	'projectile-speed-booster',
	'lifesteal-booster',
	'shieldsteal-booster',
	'damage-booster',
	'the-mine',
	'cluster-mines',
	'mark-beacon',
	'cold-lattice',
	'ember-rods',
	'coldwire-rods',
	'sunder-rods',
	'mine-calibrator',
	'hemorrhage-relay',
	'shrapnel-mine',
	'napalm-mine',
	'turret-mine',
	'mine-echo',
	'gravity-mine-augment',
	'shield-turret',
	'oathbreaker-sigil',
	'deadeye-sniper',
	'the-knife',
	'hemorrhage-burst',
	'bloodfork',
	'bloodbound-sheath',
	'blood-catalyst',
	'siphoning-knife'
]);

const sharedPoolWeapons = sharedWeapons.filter((item) => sharedPoolDefinitionIds.has(item.id));

const allCampaignWeapons = [
	...sharedWeapons,
	...controlWeapons,
	...elementalWeapons,
	...anomalyWeapons
].filter(
	(item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
);

export const dungeonRewardPools = {
	[dungeon1.dungeonId]: dungeon1RewardDefinitions
} as const;

const allDungeonRewards = Object.values(dungeonRewardPools)
	.flat()
	.filter(
		(item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
	);

export const allLoadoutDefinitions = [...allCampaignWeapons, ...allDungeonRewards];
export const allWeaponDefinitions = allLoadoutDefinitions.filter(
	(item): item is WeaponDefinition => !('category' in item && item.category === 'utility')
);
export const allUtilityDefinitions = allLoadoutDefinitions.filter(
	(item): item is UtilityDefinition => 'category' in item && item.category === 'utility'
);

export const campaignWeaponPools = {
	[campaign1.campaign]: sharedWeapons,
	[campaign2.campaign]: [...sharedPoolWeapons, ...controlWeapons],
	[campaign3.campaign]: [...sharedPoolWeapons, ...elementalWeapons],
	[campaign4.campaign]: [...sharedPoolWeapons, ...anomalyWeapons],
	[campaign5.campaign]: [...sharedPoolWeapons, ...anomalyWeapons],
	[campaign6.campaign]: [...sharedPoolWeapons, ...anomalyWeapons]
} as const;

export const campaignShopWeaponPools = shopWeaponPools;

export const weaponDefinitions = Object.fromEntries(
	[
		...Object.values(campaignWeaponPools),
		...Object.values(shopWeaponPools),
		...Object.values(dungeonRewardPools)
	]
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

	if (campaign.mode === 'endless') {
		return createEndlessCampaignLevel(campaignLevel);
	}

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

export function getDungeon(dungeonId: number): DungeonDefinition {
	const dungeon = dungeons[dungeonId as keyof typeof dungeons];

	if (!dungeon) {
		throw new Error(`Unknown dungeon: ${dungeonId}`);
	}

	return dungeon;
}

export function getDungeonFloor(dungeonId: number, floor: number) {
	const dungeon = getDungeon(dungeonId);
	const dungeonFloor = dungeon.floors.find((entry) => entry.floor === floor);

	if (!dungeonFloor) {
		throw new Error(`Unknown dungeon floor ${floor} for dungeon ${dungeonId}`);
	}

	return dungeonFloor;
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

export function getDungeonRewardPackWeaponPool(dungeonId: number): LoadoutItemDefinition[] {
	const pool = dungeonRewardPools[dungeonId as keyof typeof dungeonRewardPools];

	if (!pool) {
		throw new Error(`Unknown dungeon reward pool for dungeon ${dungeonId}`);
	}

	return [...pool];
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
