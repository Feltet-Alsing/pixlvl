import { and, eq, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';

import { baselineCombatProfile, campaigns, getCampaign, starterWeaponId } from '$lib/data';
import { getOwnedWeaponDefinitionIds } from '$lib/game/notifications';
import { normalizeLoadoutRotation } from '$lib/game/loadout-rotation';
import { createBaselineUpgradeablePixlState, createUpgradeablePixlState } from '$lib/game/upgrades';
import { db } from '$lib/server/db';
import { campaignProgress, pixlState } from '$lib/server/db/schema';

import type { LoadoutPlacement, OwnedWeaponInstance } from '$lib/data/types';

export type PersistedPixlState = InferSelectModel<typeof pixlState>;
export type PersistedCampaignProgress = InferSelectModel<typeof campaignProgress>;

export interface GameState {
	pixlState: PersistedPixlState;
	campaignProgress: PersistedCampaignProgress[];
}

export interface GameStatePatch {
	pixlState?: Partial<
		Pick<
			PersistedPixlState,
			'xp' | 'scrap' | 'defence' | 'agility' | 'ownedWeapons' | 'loadoutPlacements'
		>
	>;
	campaignProgress?: Array<
		Partial<
			Pick<
				PersistedCampaignProgress,
				'currentLevel' | 'highestUnlockedLevel' | 'highestClearedLevel' | 'completed'
			>
		> & {
			campaignId: number;
		}
	>;
}

const defaultCampaigns = Object.values(campaigns).map((campaign) => campaign.campaign);
const STARTER_WEAPON_INSTANCE_ID = 'starter-pea-shooter';

function createStarterOwnedWeapons(): OwnedWeaponInstance[] {
	return [
		{
			instanceId: STARTER_WEAPON_INSTANCE_ID,
			definitionId: starterWeaponId,
			source: 'starter',
			acquiredAt: new Date(0).toISOString(),
			campaignId: null,
			stage: null,
			level: null
		}
	];
}

function createStarterLoadoutPlacements(): LoadoutPlacement[] {
	return [
		{
			weaponInstanceId: STARTER_WEAPON_INSTANCE_ID,
			x: 0,
			y: 0,
			rotation: 0
		}
	];
}

function normalizeOwnedWeapons(ownedWeapons?: OwnedWeaponInstance[] | null) {
	if (!Array.isArray(ownedWeapons) || ownedWeapons.length === 0) {
		return createStarterOwnedWeapons();
	}

	const hasStarter = ownedWeapons.some(
		(weapon) => weapon.instanceId === STARTER_WEAPON_INSTANCE_ID
	);

	if (hasStarter) {
		return ownedWeapons;
	}

	return [...createStarterOwnedWeapons(), ...ownedWeapons];
}

function normalizeAcknowledgedWeaponDefinitionIds(
	acknowledgedWeaponDefinitionIds: string[] | null | undefined,
	ownedWeapons: OwnedWeaponInstance[]
) {
	const ownedDefinitionIds = getOwnedWeaponDefinitionIds(ownedWeapons);

	if (!Array.isArray(acknowledgedWeaponDefinitionIds)) {
		return ownedDefinitionIds;
	}

	if (acknowledgedWeaponDefinitionIds.length === 0 && ownedDefinitionIds.length === 1) {
		return ownedDefinitionIds;
	}

	const ownedDefinitionIdSet = new Set(ownedDefinitionIds);

	return [...new Set(acknowledgedWeaponDefinitionIds)].filter((definitionId) =>
		ownedDefinitionIdSet.has(definitionId)
	);
}

function normalizeAcknowledgedPerkPoints(value: unknown) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.floor(value));
}

function normalizeScrap(value: unknown) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.floor(value));
}

function normalizeLoadoutPlacements(
	loadoutPlacements: LoadoutPlacement[] | null | undefined,
	ownedWeapons: OwnedWeaponInstance[]
) {
	if (!Array.isArray(loadoutPlacements)) {
		return createStarterLoadoutPlacements();
	}

	if (loadoutPlacements.length === 0) {
		return [];
	}

	const ownedWeaponIds = new Set(ownedWeapons.map((weapon) => weapon.instanceId));
	const validPlacements = loadoutPlacements
		.filter((placement) => ownedWeaponIds.has(placement.weaponInstanceId))
		.map((placement) => ({
			weaponInstanceId: placement.weaponInstanceId,
			x: placement.x,
			y: placement.y,
			rotation: normalizeLoadoutRotation(placement.rotation)
		}));

	if (validPlacements.length === 0) {
		return [];
	}

	return validPlacements;
}

function createDefaultPixlState(userId: string): InferInsertModel<typeof pixlState> {
	const baselineState = createBaselineUpgradeablePixlState();

	return {
		userId,
		xp: baselineState.xp,
		level: baselineState.level,
		perkPoints: baselineState.perkPoints,
		scrap: 0,
		defence: baselineState.defence,
		agility: baselineState.agility,
		health: baselineState.health,
		attackSpeed: baselineState.attackSpeed,
		loadoutRows: baselineState.loadoutRows,
		loadoutColumns: baselineState.loadoutColumns,
		acknowledgedPerkPoints: baselineState.perkPoints,
		acknowledgedWeaponDefinitionIds: [starterWeaponId],
		ownedWeapons: createStarterOwnedWeapons(),
		loadoutPlacements: createStarterLoadoutPlacements()
	};
}

function createDefaultCampaignProgress(
	userId: string,
	campaignId: number
): InferInsertModel<typeof campaignProgress> {
	return {
		userId,
		campaignId,
		currentLevel: 1,
		highestUnlockedLevel: 1,
		highestClearedLevel: 0,
		completed: false,
		lastPlayedAt: new Date()
	};
}

function toNonNegativeInteger(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return undefined;
	}

	return Math.max(0, Math.floor(value));
}

function toPositiveInteger(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return undefined;
	}

	return Math.max(1, Math.floor(value));
}

function toFiniteNumber(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return undefined;
	}

	return value;
}

async function ensureGameState(userId: string) {
	await db.insert(pixlState).values(createDefaultPixlState(userId)).onConflictDoNothing();

	const existingProgress = await db
		.select({ campaignId: campaignProgress.campaignId })
		.from(campaignProgress)
		.where(eq(campaignProgress.userId, userId));

	const existingCampaignIds = new Set(existingProgress.map((entry) => entry.campaignId));
	const missingCampaigns = defaultCampaigns.filter(
		(campaignId) => !existingCampaignIds.has(campaignId)
	);

	if (missingCampaigns.length > 0) {
		await db
			.insert(campaignProgress)
			.values(
				missingCampaigns.map((campaignId) => createDefaultCampaignProgress(userId, campaignId))
			)
			.onConflictDoNothing();
	}

	const [storedPixlState] = await db.select().from(pixlState).where(eq(pixlState.userId, userId));

	if (!storedPixlState) {
		return;
	}

	const normalizedOwnedWeapons = normalizeOwnedWeapons(storedPixlState.ownedWeapons);
	const normalizedLoadoutPlacements = normalizeLoadoutPlacements(
		storedPixlState.loadoutPlacements,
		normalizedOwnedWeapons
	);
	const normalizedAcknowledgedPerkPoints = normalizeAcknowledgedPerkPoints(
		storedPixlState.acknowledgedPerkPoints
	);
	const normalizedAcknowledgedWeaponDefinitionIds = normalizeAcknowledgedWeaponDefinitionIds(
		storedPixlState.acknowledgedWeaponDefinitionIds,
		normalizedOwnedWeapons
	);
	const normalizedScrap = normalizeScrap(storedPixlState.scrap);

	const normalizedProgression = createUpgradeablePixlState({
		xp: storedPixlState.xp,
		defence: storedPixlState.defence,
		agility: storedPixlState.agility
	});

	if (
		normalizedProgression.xp !== storedPixlState.xp ||
		normalizedProgression.level !== storedPixlState.level ||
		normalizedProgression.perkPoints !== storedPixlState.perkPoints ||
		normalizedScrap !== storedPixlState.scrap ||
		normalizedProgression.defence !== storedPixlState.defence ||
		normalizedProgression.agility !== storedPixlState.agility ||
		normalizedProgression.health !== storedPixlState.health ||
		normalizedProgression.attackSpeed !== storedPixlState.attackSpeed ||
		normalizedProgression.loadoutRows !== storedPixlState.loadoutRows ||
		normalizedProgression.loadoutColumns !== storedPixlState.loadoutColumns ||
		normalizedAcknowledgedPerkPoints !== storedPixlState.acknowledgedPerkPoints ||
		normalizedAcknowledgedWeaponDefinitionIds !== storedPixlState.acknowledgedWeaponDefinitionIds ||
		normalizedOwnedWeapons !== storedPixlState.ownedWeapons ||
		normalizedLoadoutPlacements !== storedPixlState.loadoutPlacements
	) {
		await db
			.update(pixlState)
			.set({
				xp: normalizedProgression.xp,
				level: normalizedProgression.level,
				perkPoints: normalizedProgression.perkPoints,
				scrap: normalizedScrap,
				defence: normalizedProgression.defence,
				agility: normalizedProgression.agility,
				health: normalizedProgression.health,
				attackSpeed: normalizedProgression.attackSpeed,
				loadoutRows: normalizedProgression.loadoutRows,
				loadoutColumns: normalizedProgression.loadoutColumns,
				acknowledgedPerkPoints: normalizedAcknowledgedPerkPoints,
				acknowledgedWeaponDefinitionIds: normalizedAcknowledgedWeaponDefinitionIds,
				ownedWeapons: normalizedOwnedWeapons,
				loadoutPlacements: normalizedLoadoutPlacements,
				updatedAt: new Date()
			})
			.where(eq(pixlState.userId, userId));
	}
}

export async function getOrCreateGameState(userId: string): Promise<GameState> {
	await ensureGameState(userId);

	const [storedPixlState] = await db.select().from(pixlState).where(eq(pixlState.userId, userId));
	const storedCampaignProgress = await db
		.select()
		.from(campaignProgress)
		.where(eq(campaignProgress.userId, userId));

	if (!storedPixlState) {
		throw new Error(`Unable to load pixl state for user ${userId}`);
	}

	return {
		pixlState: storedPixlState,
		campaignProgress: storedCampaignProgress.sort(
			(left, right) => left.campaignId - right.campaignId
		)
	};
}

export function getLastPlayedCampaignId(gameState: GameState) {
	const latestProgress = [...gameState.campaignProgress].sort((left, right) => {
		const leftTime = new Date(left.lastPlayedAt).getTime();
		const rightTime = new Date(right.lastPlayedAt).getTime();

		if (rightTime !== leftTime) {
			return rightTime - leftTime;
		}

		return right.currentLevel - left.currentLevel || left.campaignId - right.campaignId;
	})[0];

	return latestProgress?.campaignId ?? defaultCampaigns[0] ?? 1;
}

export async function updateGameState(userId: string, patch: GameStatePatch): Promise<GameState> {
	await ensureGameState(userId);

	const [storedPixlState] = await db.select().from(pixlState).where(eq(pixlState.userId, userId));

	if (!storedPixlState) {
		throw new Error(`Unable to load pixl state for user ${userId}`);
	}

	if (patch.pixlState) {
		const nextPixlState: Partial<InferInsertModel<typeof pixlState>> = {};

		const xp = toNonNegativeInteger(patch.pixlState.xp) ?? storedPixlState.xp;
		const scrap = toNonNegativeInteger(patch.pixlState.scrap) ?? storedPixlState.scrap;
		const defence = toNonNegativeInteger(patch.pixlState.defence) ?? storedPixlState.defence;
		const agility = toNonNegativeInteger(patch.pixlState.agility) ?? storedPixlState.agility;
		const normalizedProgression = createUpgradeablePixlState({ xp, defence, agility });
		const ownedWeapons = Array.isArray(patch.pixlState.ownedWeapons)
			? normalizeOwnedWeapons(patch.pixlState.ownedWeapons)
			: undefined;
		const loadoutPlacements = Array.isArray(patch.pixlState.loadoutPlacements)
			? normalizeLoadoutPlacements(
					patch.pixlState.loadoutPlacements,
					ownedWeapons ?? normalizeOwnedWeapons(storedPixlState.ownedWeapons)
				)
			: undefined;

		nextPixlState.xp = normalizedProgression.xp;
		nextPixlState.level = normalizedProgression.level;
		nextPixlState.perkPoints = normalizedProgression.perkPoints;
		nextPixlState.scrap = scrap;
		nextPixlState.defence = normalizedProgression.defence;
		nextPixlState.agility = normalizedProgression.agility;
		nextPixlState.health = normalizedProgression.health;
		nextPixlState.attackSpeed = normalizedProgression.attackSpeed;
		nextPixlState.loadoutRows = normalizedProgression.loadoutRows;
		nextPixlState.loadoutColumns = normalizedProgression.loadoutColumns;
		if (ownedWeapons !== undefined) nextPixlState.ownedWeapons = ownedWeapons;
		if (loadoutPlacements !== undefined) nextPixlState.loadoutPlacements = loadoutPlacements;

		if (Object.keys(nextPixlState).length > 0) {
			await db
				.update(pixlState)
				.set({ ...nextPixlState, updatedAt: new Date() })
				.where(eq(pixlState.userId, userId));
		}
	}

	if (patch.campaignProgress && patch.campaignProgress.length > 0) {
		for (const entry of patch.campaignProgress) {
			const campaign = getCampaign(entry.campaignId);
			const currentLevel = Math.min(
				toPositiveInteger(entry.currentLevel) ?? 1,
				campaign.totalLevels
			);
			const highestUnlockedLevel = Math.max(
				currentLevel,
				Math.min(
					toPositiveInteger(entry.highestUnlockedLevel) ?? currentLevel,
					campaign.totalLevels
				)
			);
			const highestClearedLevel = Math.min(
				toNonNegativeInteger(entry.highestClearedLevel) ?? 0,
				highestUnlockedLevel
			);
			const completed = entry.completed ?? highestClearedLevel >= campaign.totalLevels;

			await db
				.insert(campaignProgress)
				.values({
					...createDefaultCampaignProgress(userId, entry.campaignId),
					currentLevel,
					highestUnlockedLevel,
					highestClearedLevel,
					completed,
					lastPlayedAt: new Date()
				})
				.onConflictDoUpdate({
					target: [campaignProgress.userId, campaignProgress.campaignId],
					set: {
						currentLevel,
						highestUnlockedLevel,
						highestClearedLevel,
						completed,
						lastPlayedAt: new Date(),
						updatedAt: new Date()
					}
				});
		}
	}

	return getOrCreateGameState(userId);
}

export async function resetGameStateForUser(userId: string): Promise<GameState> {
	await ensureGameState(userId);

	const defaultPixlState = createDefaultPixlState(userId);

	await db
		.update(pixlState)
		.set({
			xp: defaultPixlState.xp,
			level: defaultPixlState.level,
			perkPoints: defaultPixlState.perkPoints,
			scrap: defaultPixlState.scrap,
			defence: defaultPixlState.defence,
			agility: defaultPixlState.agility,
			health: defaultPixlState.health,
			attackSpeed: defaultPixlState.attackSpeed,
			loadoutRows: defaultPixlState.loadoutRows,
			loadoutColumns: defaultPixlState.loadoutColumns,
			acknowledgedPerkPoints: defaultPixlState.acknowledgedPerkPoints,
			acknowledgedWeaponDefinitionIds: defaultPixlState.acknowledgedWeaponDefinitionIds,
			ownedWeapons: defaultPixlState.ownedWeapons,
			loadoutPlacements: defaultPixlState.loadoutPlacements,
			updatedAt: new Date()
		})
		.where(eq(pixlState.userId, userId));

	await db.delete(campaignProgress).where(eq(campaignProgress.userId, userId));

	await db
		.insert(campaignProgress)
		.values(
			defaultCampaigns.map((campaignId) => createDefaultCampaignProgress(userId, campaignId))
		);

	return getOrCreateGameState(userId);
}

export async function getCampaignProgressForUser(userId: string, campaignId: number) {
	await ensureGameState(userId);

	const [progress] = await db
		.select()
		.from(campaignProgress)
		.where(and(eq(campaignProgress.userId, userId), eq(campaignProgress.campaignId, campaignId)));

	if (!progress) {
		throw new Error(
			`Unable to load campaign progress for user ${userId} and campaign ${campaignId}`
		);
	}

	return progress;
}

export async function acknowledgePerkNotificationsForUser(userId: string) {
	await ensureGameState(userId);

	const [storedPixlState] = await db.select().from(pixlState).where(eq(pixlState.userId, userId));

	if (!storedPixlState || storedPixlState.acknowledgedPerkPoints >= storedPixlState.perkPoints) {
		return;
	}

	await db
		.update(pixlState)
		.set({
			acknowledgedPerkPoints: storedPixlState.perkPoints,
			updatedAt: new Date()
		})
		.where(eq(pixlState.userId, userId));
}

export async function acknowledgeWeaponNotificationsForUser(userId: string) {
	await ensureGameState(userId);

	const [storedPixlState] = await db.select().from(pixlState).where(eq(pixlState.userId, userId));

	if (!storedPixlState) {
		return;
	}

	const ownedDefinitionIds = getOwnedWeaponDefinitionIds(storedPixlState.ownedWeapons);
	const acknowledgedWeaponDefinitionIds = normalizeAcknowledgedWeaponDefinitionIds(
		storedPixlState.acknowledgedWeaponDefinitionIds,
		storedPixlState.ownedWeapons
	);

	if (
		acknowledgedWeaponDefinitionIds.length === ownedDefinitionIds.length &&
		acknowledgedWeaponDefinitionIds.every(
			(definitionId, index) => definitionId === ownedDefinitionIds[index]
		)
	) {
		return;
	}

	await db
		.update(pixlState)
		.set({
			acknowledgedWeaponDefinitionIds: ownedDefinitionIds,
			updatedAt: new Date()
		})
		.where(eq(pixlState.userId, userId));
}
