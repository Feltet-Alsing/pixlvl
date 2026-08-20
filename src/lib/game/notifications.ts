import type { OwnedWeaponInstance } from '$lib/data/types';

interface RewardPackNotificationEntry {
	campaignId?: number | null;
	status?: string | null;
}

export interface CampaignRouteNotificationCounts {
	stats: number;
	loadout: number;
	packs: number;
}

export interface NotificationSnapshot {
	perkPoints?: number | null;
	acknowledgedPerkPoints?: number | null;
	ownedWeapons?: OwnedWeaponInstance[] | null;
	acknowledgedWeaponDefinitionIds?: string[] | null;
	rewardPacks?: RewardPackNotificationEntry[] | null;
}

export function getOwnedWeaponDefinitionIds(
	ownedWeapons: OwnedWeaponInstance[] | null | undefined
) {
	if (!Array.isArray(ownedWeapons) || ownedWeapons.length === 0) {
		return [];
	}

	return [...new Set(ownedWeapons.map((weapon) => weapon.definitionId))];
}

export function getCampaignRouteNotificationCounts(
	snapshot: NotificationSnapshot | null | undefined,
	campaignId?: number
): CampaignRouteNotificationCounts {
	if (!snapshot) {
		return {
			stats: 0,
			loadout: 0,
			packs: 0
		};
	}

	const perkPoints = Math.max(0, Math.floor(snapshot.perkPoints ?? 0));
	const acknowledgedPerkPoints = Math.max(0, Math.floor(snapshot.acknowledgedPerkPoints ?? 0));
	const ownedDefinitionIds = getOwnedWeaponDefinitionIds(snapshot.ownedWeapons);
	const acknowledgedDefinitionIds = new Set(snapshot.acknowledgedWeaponDefinitionIds ?? []);
	const unopenedPacks = (snapshot.rewardPacks ?? []).filter(
		(pack) =>
			pack.status === 'unopened' && (campaignId === undefined || pack.campaignId === campaignId)
	).length;

	return {
		stats: Math.max(0, perkPoints - acknowledgedPerkPoints),
		loadout: ownedDefinitionIds.filter(
			(definitionId) => !acknowledgedDefinitionIds.has(definitionId)
		).length,
		packs: unopenedPacks
	};
}
