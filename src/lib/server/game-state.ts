import { and, eq, inArray, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';

import { baselineCombatProfile, campaigns, getCampaign, starterWeaponId } from '$lib/data';
import { getOwnedWeaponDefinitionIds } from '$lib/game/notifications';
import {
	createPersistedLoadoutState,
	normalizePersistedLoadoutState
} from '$lib/game/loadout-slots';
import { getWeaponTotalScrapInvested, getWeaponUpgradeLevel } from '$lib/game/weapon-upgrades';
import { createBaselineUpgradeablePixlState, createUpgradeablePixlState } from '$lib/game/upgrades';
import { db } from '$lib/server/db';
import {
	campaignProgress,
	pixlState,
	progressionLeaderboard,
	rewardPack
} from '$lib/server/db/schema';
import { syncProgressionLeaderboardForUser } from '$lib/server/leaderboard';

import type {
	LoadoutPlacement,
	OwnedWeaponInstance,
	PersistedLoadoutState,
	PersistedRewardPack,
	PersistedRewardPackCard,
	RewardPackKind
} from '$lib/data/types';

export type PersistedPixlState = InferSelectModel<typeof pixlState>;
export type PersistedCampaignProgress = InferSelectModel<typeof campaignProgress>;
export type PersistedRewardPackRecord = InferSelectModel<typeof rewardPack>;

const REWARD_PACK_SOURCE_LEVELS_PER_STAGE = 10;

export interface GameState {
	pixlState: PersistedPixlState;
	campaignProgress: PersistedCampaignProgress[];
	rewardPacks: PersistedRewardPack[];
}

export interface GameStatePatch {
	pixlState?: Partial<
		Pick<
			PersistedPixlState,
			'xp' | 'scrap' | 'defence' | 'agility' | 'ownedWeapons' | 'loadoutPlacements'
		>
	>;
	rewardPacks?: PersistedRewardPack[];
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

export interface OpenRewardPackResult {
	pack: PersistedRewardPack;
	grantedWeapons: OwnedWeaponInstance[];
	alreadyOpened: boolean;
	newDefinitionIds: string[];
}

export interface OpenRewardPacksResult {
	results: OpenRewardPackResult[];
}

const defaultCampaigns = Object.values(campaigns).map((campaign) => campaign.campaign);
const STARTER_WEAPON_INSTANCE_ID = 'starter-pea-shooter';
const STARTER_PACK_CAMPAIGN_ID = 1;
const STARTER_PACK_SOURCE_LEVEL = 0;
const STARTER_PACK_CARD_COUNT = 5;
const STARTER_PACK_FINAL_SLOT_INDEX = 4;
const NO_GUARANTEED_PACK_SLOT_INDEX = -1;
const STARTER_PACK_CONTENT_VERSION = 1;
const STARTER_PACK_DROPPED_AT = new Date(0);

function getStarterPackId(userId: string) {
	return `starter-pack-${userId}-campaign-1`;
}

function createStarterOwnedWeapons(): OwnedWeaponInstance[] {
	return [
		{
			instanceId: STARTER_WEAPON_INSTANCE_ID,
			definitionId: starterWeaponId,
			source: 'starter',
			acquiredAt: new Date(0).toISOString(),
			campaignId: null,
			stage: null,
			level: null,
			upgradeLevel: 0,
			totalScrapInvested: 0
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

function createOwnedWeaponInstanceId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return `pack-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

function createOwnedWeaponFromRewardPackCard(
	pack: PersistedRewardPackRecord,
	card: PersistedRewardPackCard,
	acquiredAt: string
): OwnedWeaponInstance {
	const sourceLevel = pack.sourceCampaignLevel > 0 ? pack.sourceCampaignLevel : null;
	const sourceStage = sourceLevel
		? Math.floor((sourceLevel - 1) / REWARD_PACK_SOURCE_LEVELS_PER_STAGE) + 1
		: null;

	return {
		instanceId: createOwnedWeaponInstanceId(),
		definitionId: card.definitionId,
		source: 'pack',
		acquiredAt,
		campaignId: null,
		stage: sourceStage,
		level: sourceLevel,
		upgradeLevel: 0,
		totalScrapInvested: 0
	};
}

function createStarterRewardPackCards(): PersistedRewardPackCard[] {
	return [
		{
			slotIndex: 0,
			definitionId: 'pea-shooter',
			rarity: 'normal',
			isGuaranteedSlot: false
		},
		{
			slotIndex: 1,
			definitionId: 'blaster',
			rarity: 'magic',
			isGuaranteedSlot: false
		},
		{
			slotIndex: 2,
			definitionId: 'splitter',
			rarity: 'rare',
			isGuaranteedSlot: false
		},
		{
			slotIndex: 3,
			definitionId: 'tide-caster',
			rarity: 'rare',
			isGuaranteedSlot: false
		},
		{
			slotIndex: STARTER_PACK_FINAL_SLOT_INDEX,
			definitionId: 'needle',
			rarity: 'normal',
			isGuaranteedSlot: false
		}
	];
}

function createStarterRewardPack(userId: string): PersistedRewardPack {
	return {
		id: getStarterPackId(userId),
		ownerUserId: userId,
		campaignId: STARTER_PACK_CAMPAIGN_ID,
		sourceCampaignLevel: STARTER_PACK_SOURCE_LEVEL,
		kind: 'normal',
		droppedAt: STARTER_PACK_DROPPED_AT.toISOString(),
		openedAt: null,
		status: 'unopened',
		cardCount: STARTER_PACK_CARD_COUNT,
		guaranteedSlotIndex: NO_GUARANTEED_PACK_SLOT_INDEX,
		contentVersion: STARTER_PACK_CONTENT_VERSION,
		cards: createStarterRewardPackCards()
	};
}

function normalizeRewardPackKind(kind: unknown): RewardPackKind {
	if (kind === 'special' || kind === 'rare') {
		return kind;
	}

	return 'normal';
}

function serializeRewardPackRecord(pack: PersistedRewardPackRecord): PersistedRewardPack {
	return {
		id: pack.id,
		ownerUserId: pack.ownerUserId,
		campaignId: pack.campaignId,
		sourceCampaignLevel: pack.sourceCampaignLevel,
		kind: normalizeRewardPackKind(pack.kind),
		droppedAt: pack.droppedAt.toISOString(),
		openedAt: pack.openedAt ? pack.openedAt.toISOString() : null,
		status: pack.status === 'opened' ? 'opened' : 'unopened',
		cardCount: pack.cardCount,
		guaranteedSlotIndex: pack.guaranteedSlotIndex,
		contentVersion: pack.contentVersion,
		cards: pack.cards
	};
}

function normalizeOwnedWeapons(ownedWeapons?: OwnedWeaponInstance[] | null) {
	if (!Array.isArray(ownedWeapons) || ownedWeapons.length === 0) {
		return createStarterOwnedWeapons();
	}

	const normalizedOwnedWeapons = ownedWeapons.map((weapon) => ({
		...weapon,
		upgradeLevel: getWeaponUpgradeLevel(weapon),
		totalScrapInvested: getWeaponTotalScrapInvested(weapon)
	}));

	const hasStarter = normalizedOwnedWeapons.some(
		(weapon) => weapon.instanceId === STARTER_WEAPON_INSTANCE_ID
	);

	if (hasStarter) {
		return normalizedOwnedWeapons;
	}

	return [...createStarterOwnedWeapons(), ...normalizedOwnedWeapons];
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

function createStarterLoadoutState(): PersistedLoadoutState {
	return createPersistedLoadoutState(0, [createStarterLoadoutPlacements(), [], []]);
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
		loadoutPlacements: createStarterLoadoutState()
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
	const [existingPixlState] = await db.select().from(pixlState).where(eq(pixlState.userId, userId));
	const needsStarterPackSeed = !existingPixlState;

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

	if (needsStarterPackSeed) {
		const starterPack = createStarterRewardPack(userId);

		await db.insert(rewardPack).values({
			...starterPack,
			droppedAt: STARTER_PACK_DROPPED_AT,
			openedAt: null
		});
	}

	const [storedPixlState] = await db.select().from(pixlState).where(eq(pixlState.userId, userId));

	if (!storedPixlState) {
		return;
	}

	const normalizedOwnedWeapons = normalizeOwnedWeapons(storedPixlState.ownedWeapons);
	const normalizedProgression = createUpgradeablePixlState({
		xp: storedPixlState.xp,
		defence: storedPixlState.defence,
		agility: storedPixlState.agility
	});
	const normalizedLoadoutPlacements = normalizePersistedLoadoutState(
		storedPixlState.loadoutPlacements,
		normalizedOwnedWeapons,
		createStarterLoadoutPlacements(),
		normalizedProgression.loadoutColumns,
		normalizedProgression.loadoutRows
	);
	const normalizedAcknowledgedPerkPoints = normalizeAcknowledgedPerkPoints(
		storedPixlState.acknowledgedPerkPoints
	);
	const normalizedAcknowledgedWeaponDefinitionIds = normalizeAcknowledgedWeaponDefinitionIds(
		storedPixlState.acknowledgedWeaponDefinitionIds,
		normalizedOwnedWeapons
	);
	const normalizedScrap = normalizeScrap(storedPixlState.scrap);

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

	await syncProgressionLeaderboardForUser(userId);
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
		),
		rewardPacks: (await db.select().from(rewardPack).where(eq(rewardPack.ownerUserId, userId)))
			.map(serializeRewardPackRecord)
			.sort(
				(left, right) => new Date(right.droppedAt).getTime() - new Date(left.droppedAt).getTime()
			)
	};
}

export async function getRewardPacksForUser(userId: string) {
	await ensureGameState(userId);

	return (await db.select().from(rewardPack).where(eq(rewardPack.ownerUserId, userId)))
		.map(serializeRewardPackRecord)
		.sort(
			(left, right) => new Date(right.droppedAt).getTime() - new Date(left.droppedAt).getTime()
		);
}

export async function createRewardPackForUser(
	pack: Omit<PersistedRewardPack, 'ownerUserId'> & { ownerUserId?: string },
	userId: string
) {
	await ensureGameState(userId);

	const nextPack: PersistedRewardPack = {
		...pack,
		ownerUserId: userId
	};

	await db.insert(rewardPack).values({
		...nextPack,
		droppedAt: new Date(nextPack.droppedAt),
		openedAt: nextPack.openedAt ? new Date(nextPack.openedAt) : null
	});

	return nextPack;
}

export async function openRewardPackForUser(
	userId: string,
	packId: string
): Promise<OpenRewardPackResult> {
	await ensureGameState(userId);

	return db.transaction(async (tx) => {
		const packConditions = [eq(rewardPack.ownerUserId, userId), eq(rewardPack.id, packId)];

		const [storedPack] = await tx
			.select()
			.from(rewardPack)
			.where(and(...packConditions));

		if (!storedPack) {
			throw new Error('Reward pack not found.');
		}

		const [storedPixlState] = await tx.select().from(pixlState).where(eq(pixlState.userId, userId));

		if (!storedPixlState) {
			throw new Error(`Unable to load pixl state for user ${userId}`);
		}

		if (storedPack.status === 'opened') {
			return {
				pack: serializeRewardPackRecord(storedPack),
				grantedWeapons: [],
				alreadyOpened: true,
				newDefinitionIds: []
			} satisfies OpenRewardPackResult;
		}

		const acquiredAt = new Date().toISOString();
		const ownedDefinitionIdsBeforeOpen = new Set(
			storedPixlState.ownedWeapons.map((weapon) => weapon.definitionId)
		);
		const grantedWeapons = storedPack.cards.map((card) =>
			createOwnedWeaponFromRewardPackCard(storedPack, card, acquiredAt)
		);
		const nextOwnedWeapons = normalizeOwnedWeapons([
			...storedPixlState.ownedWeapons,
			...grantedWeapons
		]);
		const openedAt = new Date();

		await tx
			.update(pixlState)
			.set({
				ownedWeapons: nextOwnedWeapons,
				updatedAt: openedAt
			})
			.where(eq(pixlState.userId, userId));

		await tx
			.update(rewardPack)
			.set({
				status: 'opened',
				openedAt,
				updatedAt: openedAt
			})
			.where(eq(rewardPack.id, storedPack.id));

		return {
			pack: serializeRewardPackRecord({
				...storedPack,
				status: 'opened',
				openedAt
			}),
			grantedWeapons,
			alreadyOpened: false,
			newDefinitionIds: storedPack.cards
				.map((card) => card.definitionId)
				.filter((definitionId) => !ownedDefinitionIdsBeforeOpen.has(definitionId))
		} satisfies OpenRewardPackResult;
	});
}

export async function openRewardPacksForUser(
	userId: string,
	packIds: string[]
): Promise<OpenRewardPacksResult> {
	await ensureGameState(userId);

	const uniquePackIds = [...new Set(packIds.filter((packId) => packId.length > 0))];

	if (uniquePackIds.length === 0) {
		throw new Error('No reward packs selected.');
	}

	return db.transaction(async (tx) => {
		const packConditions = [
			eq(rewardPack.ownerUserId, userId),
			inArray(rewardPack.id, uniquePackIds)
		];

		const storedPacks = await tx
			.select()
			.from(rewardPack)
			.where(and(...packConditions));

		if (storedPacks.length === 0) {
			throw new Error('Reward pack not found.');
		}

		const storedPackById = new Map(storedPacks.map((pack) => [pack.id, pack]));
		const orderedPacks = uniquePackIds
			.map((packId) => storedPackById.get(packId) ?? null)
			.filter((pack): pack is PersistedRewardPackRecord => pack !== null);

		const [storedPixlState] = await tx.select().from(pixlState).where(eq(pixlState.userId, userId));

		if (!storedPixlState) {
			throw new Error(`Unable to load pixl state for user ${userId}`);
		}

		let nextOwnedWeapons = [...storedPixlState.ownedWeapons];
		const ownedDefinitionIds = new Set(
			storedPixlState.ownedWeapons.map((weapon) => weapon.definitionId)
		);
		const openedAt = new Date();
		const acquiredAt = openedAt.toISOString();
		const openedPackIds: string[] = [];
		const results: OpenRewardPackResult[] = [];

		for (const storedPack of orderedPacks) {
			if (storedPack.status === 'opened') {
				results.push({
					pack: serializeRewardPackRecord(storedPack),
					grantedWeapons: [],
					alreadyOpened: true,
					newDefinitionIds: []
				});
				continue;
			}

			const grantedWeapons = storedPack.cards.map((card) =>
				createOwnedWeaponFromRewardPackCard(storedPack, card, acquiredAt)
			);
			const newDefinitionIds: string[] = [];

			for (const card of storedPack.cards) {
				if (ownedDefinitionIds.has(card.definitionId)) {
					continue;
				}

				ownedDefinitionIds.add(card.definitionId);
				newDefinitionIds.push(card.definitionId);
			}

			nextOwnedWeapons = normalizeOwnedWeapons([...nextOwnedWeapons, ...grantedWeapons]);
			openedPackIds.push(storedPack.id);
			results.push({
				pack: serializeRewardPackRecord({
					...storedPack,
					status: 'opened',
					openedAt
				}),
				grantedWeapons,
				alreadyOpened: false,
				newDefinitionIds
			});
		}

		if (openedPackIds.length > 0) {
			await tx
				.update(pixlState)
				.set({
					ownedWeapons: nextOwnedWeapons,
					updatedAt: openedAt
				})
				.where(eq(pixlState.userId, userId));

			await tx
				.update(rewardPack)
				.set({
					status: 'opened',
					openedAt,
					updatedAt: openedAt
				})
				.where(inArray(rewardPack.id, openedPackIds));
		}

		return { results } satisfies OpenRewardPacksResult;
	});
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
		const loadoutPlacements =
			patch.pixlState.loadoutPlacements !== undefined
				? normalizePersistedLoadoutState(
						patch.pixlState.loadoutPlacements as PersistedLoadoutState | LoadoutPlacement[],
						ownedWeapons ?? normalizeOwnedWeapons(storedPixlState.ownedWeapons),
						createStarterLoadoutPlacements(),
						normalizedProgression.loadoutColumns,
						normalizedProgression.loadoutRows
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

	if (patch.rewardPacks && patch.rewardPacks.length > 0) {
		await db
			.insert(rewardPack)
			.values(
				patch.rewardPacks.map((entry) => ({
					...entry,
					ownerUserId: userId,
					droppedAt: new Date(entry.droppedAt),
					openedAt: entry.openedAt ? new Date(entry.openedAt) : null
				}))
			)
			.onConflictDoNothing();
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

	await syncProgressionLeaderboardForUser(userId);

	return getOrCreateGameState(userId);
}

export async function resetGameStateForUser(userId: string): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.delete(progressionLeaderboard).where(eq(progressionLeaderboard.userId, userId));
		await tx.delete(rewardPack).where(eq(rewardPack.ownerUserId, userId));
		await tx.delete(campaignProgress).where(eq(campaignProgress.userId, userId));
		await tx.delete(pixlState).where(eq(pixlState.userId, userId));
	});
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
