import { and, eq, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';

import { campaigns, getCampaign, baselineCombatProfile } from '$lib/data';
import { db } from '$lib/server/db';
import { campaignProgress, pixlState } from '$lib/server/db/schema';

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
			| 'gold'
			| 'health'
			| 'damage'
			| 'attackSpeed'
			| 'healthUpgrades'
			| 'damageUpgrades'
			| 'attackSpeedUpgrades'
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

function createDefaultPixlState(userId: string): InferInsertModel<typeof pixlState> {
	return {
		userId,
		gold: 0,
		health: baselineCombatProfile.pixl.health,
		damage: baselineCombatProfile.pixl.damage,
		attackSpeed: baselineCombatProfile.pixl.attackSpeed,
		healthUpgrades: 0,
		damageUpgrades: 0,
		attackSpeedUpgrades: 0
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
	const missingCampaigns = defaultCampaigns.filter((campaignId) => !existingCampaignIds.has(campaignId));

	if (missingCampaigns.length > 0) {
		await db
			.insert(campaignProgress)
			.values(missingCampaigns.map((campaignId) => createDefaultCampaignProgress(userId, campaignId)))
			.onConflictDoNothing();
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
		campaignProgress: storedCampaignProgress.sort((left, right) => left.campaignId - right.campaignId)
	};
}

export async function updateGameState(userId: string, patch: GameStatePatch): Promise<GameState> {
	await ensureGameState(userId);

	if (patch.pixlState) {
		const nextPixlState: Partial<InferInsertModel<typeof pixlState>> = {};

		const gold = toNonNegativeInteger(patch.pixlState.gold);
		const health = toPositiveInteger(patch.pixlState.health);
		const damage = toPositiveInteger(patch.pixlState.damage);
		const attackSpeed = toFiniteNumber(patch.pixlState.attackSpeed);
		const healthUpgrades = toNonNegativeInteger(patch.pixlState.healthUpgrades);
		const damageUpgrades = toNonNegativeInteger(patch.pixlState.damageUpgrades);
		const attackSpeedUpgrades = toNonNegativeInteger(patch.pixlState.attackSpeedUpgrades);

		if (gold !== undefined) nextPixlState.gold = gold;
		if (health !== undefined) nextPixlState.health = health;
		if (damage !== undefined) nextPixlState.damage = damage;
		if (attackSpeed !== undefined && attackSpeed > 0) nextPixlState.attackSpeed = attackSpeed;
		if (healthUpgrades !== undefined) nextPixlState.healthUpgrades = healthUpgrades;
		if (damageUpgrades !== undefined) nextPixlState.damageUpgrades = damageUpgrades;
		if (attackSpeedUpgrades !== undefined) nextPixlState.attackSpeedUpgrades = attackSpeedUpgrades;

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
				Math.min(toPositiveInteger(entry.highestUnlockedLevel) ?? currentLevel, campaign.totalLevels)
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

export async function getCampaignProgressForUser(userId: string, campaignId: number) {
	await ensureGameState(userId);

	const [progress] = await db
		.select()
		.from(campaignProgress)
		.where(and(eq(campaignProgress.userId, userId), eq(campaignProgress.campaignId, campaignId)));

	if (!progress) {
		throw new Error(`Unable to load campaign progress for user ${userId} and campaign ${campaignId}`);
	}

	return progress;
}