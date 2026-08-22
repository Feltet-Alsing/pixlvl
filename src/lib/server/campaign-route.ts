import { fail } from '@sveltejs/kit';

import {
	getCampaign,
	getCampaignCombatProfile,
	getCampaignWeaponPool,
	getLoadoutItemDefinition,
	campaigns,
	weaponDefinitions
} from '$lib/data';
import {
	getActiveLoadoutPlacements,
	normalizeLoadoutSlotIndex,
	normalizePersistedLoadoutState,
	setActiveLoadoutPlacements
} from '$lib/game/loadout-slots';
import { applyUpgradePurchase, isUpgradeKey, resetUpgradeAllocations } from '$lib/game/upgrades';
import {
	acknowledgePerkNotificationsForUser,
	acknowledgeWeaponNotificationsForUser,
	getCampaignProgressForUser,
	getOrCreateGameState,
	resetGameStateForUser,
	updateGameState
} from '$lib/server/game-state';
import {
	getWeaponDisplayName,
	getWeaponTotalScrapInvested,
	getWeaponUpgradeCostForNextLevel,
	getWeaponUpgradeLevel,
	isUpgradeableWeaponInstance,
	MAX_WEAPON_UPGRADE_LEVEL
} from '$lib/game/weapon-upgrades';
import {
	buildShopState,
	createShopOwnedWeaponInstance,
	getScrapableGroupState,
	removeScrappedWeapons
} from '$lib/server/shop';

import {
	getCampaignRouteNotificationCounts,
	type NotificationSnapshot
} from '$lib/game/notifications';
import {
	getPlacementMirrored,
	getPlacementRotation,
	transformWeaponShape
} from '$lib/game/loadout-rotation';

import type {
	LoadoutItemDefinition,
	LoadoutPlacement,
	OwnedWeaponInstance,
	PersistedLoadoutState
} from '$lib/data/types';

type ActionResult<T> = { ok: true; data: T } | { ok: false; status: number; data: T };

export async function loadCampaignRouteData(
	campaignId: number,
	userId?: string,
	acknowledgeRoute?: 'stats' | 'loadout' | null
) {
	const campaign = getCampaign(campaignId);
	const combatProfile = getCampaignCombatProfile(campaignId);
	const weaponPool = getCampaignWeaponPool(campaignId);

	if (userId && acknowledgeRoute === 'stats') {
		await acknowledgePerkNotificationsForUser(userId);
	}

	if (userId && acknowledgeRoute === 'loadout') {
		await acknowledgeWeaponNotificationsForUser(userId);
	}

	const gameState = userId ? await getOrCreateGameState(userId) : null;
	const campaignState = userId ? await getCampaignProgressForUser(userId, campaignId) : null;
	const shopState = userId && gameState ? buildShopState(gameState, userId) : null;
	const notificationSnapshot: NotificationSnapshot | null = gameState
		? {
				perkPoints: gameState.pixlState.perkPoints,
				acknowledgedPerkPoints: gameState.pixlState.acknowledgedPerkPoints,
				ownedWeapons: gameState.pixlState.ownedWeapons,
				acknowledgedWeaponDefinitionIds: gameState.pixlState.acknowledgedWeaponDefinitionIds,
				rewardPacks: gameState.rewardPacks.map((pack) => ({
					campaignId: pack.campaignId,
					status: pack.status
				}))
			}
		: null;

	return {
		campaignId,
		campaign,
		campaignRoutes: Object.values(campaigns).map((entry) => ({
			campaignId: entry.campaign,
			stages: entry.stages,
			totalLevels: entry.totalLevels
		})),
		combatProfile,
		weaponPool,
		weaponDefinitionsById: weaponDefinitions,
		gameState,
		campaignState,
		shopState,
		notificationCounts: getCampaignRouteNotificationCounts(notificationSnapshot, campaignId)
	};
}

function parsePositiveCount(value: FormDataEntryValue | null) {
	if (typeof value !== 'string') {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 1) {
		return null;
	}

	return parsed;
}

function parseGridCoordinate(value: FormDataEntryValue | null, maxExclusive: number) {
	if (typeof value !== 'string') {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 0 || parsed >= maxExclusive) {
		return null;
	}

	return parsed;
}

function buildOwnedWeaponById(ownedWeapons: OwnedWeaponInstance[]) {
	return Object.fromEntries(ownedWeapons.map((weapon) => [weapon.instanceId, weapon])) as Record<
		string,
		OwnedWeaponInstance
	>;
}

function isPlacementWithinBounds(
	definition: LoadoutItemDefinition,
	rotation: LoadoutPlacement['rotation'],
	mirrored: boolean,
	x: number,
	y: number,
	columnCount: number,
	rowCount: number
) {
	return transformWeaponShape(definition.shape, rotation, mirrored).cells.every(
		([cellX, cellY]) => {
		const gridX = x + cellX;
		const gridY = y + cellY;

		return gridX >= 0 && gridX < columnCount && gridY >= 0 && gridY < rowCount;
		}
	);
}

function placementsOverlap(
	ownedWeapons: OwnedWeaponInstance[],
	placements: LoadoutPlacement[],
	currentInstanceId: string,
	definition: LoadoutItemDefinition,
	rotation: LoadoutPlacement['rotation'],
	mirrored: boolean,
	x: number,
	y: number
) {
	const ownedWeaponById = buildOwnedWeaponById(ownedWeapons);
	const occupied = new Set<string>();

	for (const placement of placements) {
		if (placement.weaponInstanceId === currentInstanceId) {
			continue;
		}

		const ownedWeapon = ownedWeaponById[placement.weaponInstanceId];

		if (!ownedWeapon) {
			continue;
		}

		const placedDefinition = getLoadoutItemDefinition(ownedWeapon.definitionId);
		const placedShape = transformWeaponShape(
			placedDefinition.shape,
			getPlacementRotation(placement),
			getPlacementMirrored(placement)
		);

		for (const [cellX, cellY] of placedShape.cells) {
			occupied.add(`${placement.x + cellX}:${placement.y + cellY}`);
		}
	}

	return transformWeaponShape(definition.shape, rotation, mirrored).cells.some(([cellX, cellY]) =>
		occupied.has(`${x + cellX}:${y + cellY}`)
	);
}

function validateLoadoutPlacements(
	ownedWeapons: OwnedWeaponInstance[],
	placements: LoadoutPlacement[],
	columnCount: number,
	rowCount: number
): { ok: true } | { ok: false; error: string } {
	const ownedWeaponById = buildOwnedWeaponById(ownedWeapons);
	const seenWeaponInstanceIds = new Set<string>();
	const equippedLegendaryDefinitionIds = new Set<string>();

	for (const placement of placements) {
		if (seenWeaponInstanceIds.has(placement.weaponInstanceId)) {
			return { ok: false, error: 'Each weapon can only be equipped once.' };
		}

		seenWeaponInstanceIds.add(placement.weaponInstanceId);

		const ownedWeapon = ownedWeaponById[placement.weaponInstanceId];

		if (!ownedWeapon) {
			return { ok: false, error: 'Loadout contains an unknown owned weapon.' };
		}

		if (!Number.isInteger(placement.x) || !Number.isInteger(placement.y)) {
			return { ok: false, error: 'Loadout contains an invalid grid coordinate.' };
		}

		const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);

		if (definition.rarity === 'legendary') {
			if (equippedLegendaryDefinitionIds.has(definition.id)) {
				return {
					ok: false,
					error: 'Duplicate legendary weapons cannot be equipped at the same time.'
				};
			}

			equippedLegendaryDefinitionIds.add(definition.id);
		}

		const rotation = getPlacementRotation(placement);
		const mirrored = getPlacementMirrored(placement);

		if (
			!isPlacementWithinBounds(
				definition,
				rotation,
				mirrored,
				placement.x,
				placement.y,
				columnCount,
				rowCount
			)
		) {
			return {
				ok: false,
				error: `A weapon does not fit inside the ${rowCount} x ${columnCount} grid.`
			};
		}

		if (
			placementsOverlap(
				ownedWeapons,
				placements,
				placement.weaponInstanceId,
				definition,
				rotation,
				mirrored,
				placement.x,
				placement.y
			)
		) {
			return { ok: false, error: 'A weapon overlaps another equipped weapon.' };
		}
	}

	return { ok: true };
}

async function persistLoadoutPlacementsForUser(userId: string, placements: LoadoutPlacement[]) {
	const gameState = await getOrCreateGameState(userId);
	const currentLoadoutState = normalizePersistedLoadoutState(
		gameState.pixlState.loadoutPlacements,
		gameState.pixlState.ownedWeapons
	);
	const validation = validateLoadoutPlacements(
		gameState.pixlState.ownedWeapons,
		placements,
		gameState.pixlState.loadoutColumns,
		gameState.pixlState.loadoutRows
	);

	if (!validation.ok) {
		return {
			ok: false as const,
			status: 400,
			data: { loadoutError: validation.error }
		};
	}

	await updateGameState(userId, {
		pixlState: {
			loadoutPlacements: setActiveLoadoutPlacements(currentLoadoutState, placements)
		}
	});

	return {
		ok: true as const,
		data: { loadoutSuccess: 'Loadout saved' }
	};
}

async function persistLoadoutStateForUser(userId: string, loadoutState: PersistedLoadoutState) {
	const gameState = await getOrCreateGameState(userId);
	const normalizedState = normalizePersistedLoadoutState(
		loadoutState,
		gameState.pixlState.ownedWeapons
	);

	for (const placements of normalizedState.slots) {
		const validation = validateLoadoutPlacements(
			gameState.pixlState.ownedWeapons,
			placements,
			gameState.pixlState.loadoutColumns,
			gameState.pixlState.loadoutRows
		);

		if (!validation.ok) {
			return {
				ok: false as const,
				status: 400,
				data: { loadoutError: validation.error }
			};
		}
	}

	await updateGameState(userId, {
		pixlState: {
			loadoutPlacements: normalizedState
		}
	});

	return {
		ok: true as const,
		data: { loadoutSuccess: 'Loadout saved' }
	};
}

function parseLoadoutStateFromFormData(formData: FormData) {
	const rawState = formData.get('loadoutState');

	if (typeof rawState !== 'string') {
		return null;
	}

	try {
		const parsed = JSON.parse(rawState) as {
			activeSlot?: unknown;
			slots?: unknown;
		};

		if (!Array.isArray(parsed.slots) || parsed.slots.length !== 3) {
			return null;
		}

		const normalizedSlots = parsed.slots.map((slot) => {
			if (!Array.isArray(slot)) {
				return null;
			}

			return slot
				.map((entry) => {
					if (
						typeof entry !== 'object' ||
						entry === null ||
						typeof (entry as LoadoutPlacement).weaponInstanceId !== 'string' ||
						typeof (entry as LoadoutPlacement).x !== 'number' ||
						typeof (entry as LoadoutPlacement).y !== 'number'
					) {
						return null;
					}

					const placement: LoadoutPlacement = {
						weaponInstanceId: (entry as LoadoutPlacement).weaponInstanceId,
						x: (entry as LoadoutPlacement).x,
						y: (entry as LoadoutPlacement).y,
						rotation: getPlacementRotation(entry as LoadoutPlacement)
						,
						mirrored: getPlacementMirrored(entry as LoadoutPlacement)
					};

					if (typeof (entry as LoadoutPlacement).targeting === 'string') {
						placement.targeting = (entry as LoadoutPlacement).targeting;
					}

					return placement;
				})
				.filter((entry): entry is LoadoutPlacement => entry !== null);
		});

		if (normalizedSlots.some((slot) => slot === null)) {
			return null;
		}

		return {
			activeSlot: normalizeLoadoutSlotIndex(parsed.activeSlot),
			slots: normalizedSlots as PersistedLoadoutState['slots']
		} satisfies PersistedLoadoutState;
	} catch {
		return null;
	}
}

export async function placeLoadoutWeaponForUser(
	userId: string | undefined,
	campaignId: number,
	formData: FormData
): Promise<ActionResult<{ loadoutError?: string; loadoutSuccess?: string }>> {
	if (!userId) {
		return {
			ok: false,
			status: 401,
			data: { loadoutError: 'Sign in to manage your loadout.' }
		};
	}

	const gameState = await getOrCreateGameState(userId);
	const activePlacements = getActiveLoadoutPlacements(
		normalizePersistedLoadoutState(
			gameState.pixlState.loadoutPlacements,
			gameState.pixlState.ownedWeapons
		)
	);
	const columnCount = gameState.pixlState.loadoutColumns;
	const rowCount = gameState.pixlState.loadoutRows;
	const weaponInstanceId = formData.get('weaponInstanceId');
	const x = parseGridCoordinate(formData.get('x'), columnCount);
	const y = parseGridCoordinate(formData.get('y'), rowCount);
	const rotation = getPlacementRotation({
		rotation: formData.get('rotation') ? Number(formData.get('rotation')) : 0
	});
	const mirrored = getPlacementMirrored({ mirrored: formData.get('mirrored') === 'true' });

	if (typeof weaponInstanceId !== 'string' || x === null || y === null) {
		return { ok: false, status: 400, data: { loadoutError: 'Invalid loadout placement request.' } };
	}

	const ownedWeapon = gameState.pixlState.ownedWeapons.find(
		(weapon) => weapon.instanceId === weaponInstanceId
	);

	if (!ownedWeapon) {
		return { ok: false, status: 400, data: { loadoutError: 'Unknown owned weapon instance.' } };
	}

	const alreadyPlaced = activePlacements.some(
		(placement) => placement.weaponInstanceId === weaponInstanceId
	);

	if (alreadyPlaced) {
		return { ok: false, status: 400, data: { loadoutError: 'That weapon is already equipped.' } };
	}

	const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);
	const nextPlacements = [
		...activePlacements,
		{
			weaponInstanceId,
			x,
			y,
			rotation,
			mirrored,
			targeting: 'current-target' as const
		}
	];
	const result = await persistLoadoutPlacementsForUser(userId, nextPlacements);

	if (!result.ok) {
		return result;
	}

	return { ok: true, data: { loadoutSuccess: `${definition.name} placed at (${x}, ${y})` } };
}

export async function removeLoadoutPlacementForUser(
	userId: string | undefined,
	campaignId: number,
	formData: FormData
): Promise<ActionResult<{ loadoutError?: string; loadoutSuccess?: string }>> {
	if (!userId) {
		return {
			ok: false,
			status: 401,
			data: { loadoutError: 'Sign in to manage your loadout.' }
		};
	}

	const weaponInstanceId = formData.get('weaponInstanceId');

	if (typeof weaponInstanceId !== 'string') {
		return { ok: false, status: 400, data: { loadoutError: 'Invalid loadout removal request.' } };
	}

	const gameState = await getOrCreateGameState(userId);
	const activePlacements = getActiveLoadoutPlacements(
		normalizePersistedLoadoutState(
			gameState.pixlState.loadoutPlacements,
			gameState.pixlState.ownedWeapons
		)
	);
	const nextPlacements = activePlacements.filter(
		(placement) => placement.weaponInstanceId !== weaponInstanceId
	);

	if (nextPlacements.length === activePlacements.length) {
		return {
			ok: false,
			status: 400,
			data: { loadoutError: 'That weapon is not currently equipped.' }
		};
	}

	const ownedWeapon = gameState.pixlState.ownedWeapons.find(
		(weapon) => weapon.instanceId === weaponInstanceId
	);
	const definition = ownedWeapon ? getLoadoutItemDefinition(ownedWeapon.definitionId) : null;

	const result = await persistLoadoutPlacementsForUser(userId, nextPlacements);

	if (!result.ok) {
		return result;
	}

	return {
		ok: true,
		data: { loadoutSuccess: `${definition?.name ?? 'Weapon'} removed from loadout` }
	};
}

export async function saveLoadoutForUser(
	userId: string | undefined,
	campaignId: number,
	formData: FormData
): Promise<ActionResult<{ loadoutError?: string; loadoutSuccess?: string }>> {
	if (!userId) {
		return {
			ok: false,
			status: 401,
			data: { loadoutError: 'Sign in to manage your loadout.' }
		};
	}

	const loadoutState = parseLoadoutStateFromFormData(formData);

	if (!loadoutState) {
		return { ok: false, status: 400, data: { loadoutError: 'Invalid loadout save request.' } };
	}

	return persistLoadoutStateForUser(userId, loadoutState);
}

export async function scrapOwnedWeaponsForUser(
	userId: string | undefined,
	formData: FormData
): Promise<ActionResult<{ loadoutError?: string; loadoutSuccess?: string }>> {
	if (!userId) {
		return {
			ok: false,
			status: 401,
			data: { loadoutError: 'Sign in to manage scrapping.' }
		};
	}

	const definitionId = formData.get('definitionId');
	const weaponInstanceId = formData.get('weaponInstanceId');
	const quantity = parsePositiveCount(formData.get('quantity'));
	const confirmedHighRarity = formData.get('confirmHighRarity') === 'yes';

	if (typeof definitionId !== 'string' || quantity === null) {
		return { ok: false, status: 400, data: { loadoutError: 'Invalid scrap request.' } };
	}

	const gameState = await getOrCreateGameState(userId);
	const scrapState = getScrapableGroupState(
		gameState.pixlState.ownedWeapons,
		gameState.pixlState.loadoutPlacements,
		definitionId,
		typeof weaponInstanceId === 'string' ? weaponInstanceId : null
	);

	if (!scrapState || quantity > scrapState.scrapableCount) {
		return { ok: false, status: 400, data: { loadoutError: 'Not enough scrapable items.' } };
	}

	if (scrapState.requiresWarning && !confirmedHighRarity) {
		return {
			ok: false,
			status: 400,
			data: { loadoutError: `Confirm scrapping ${scrapState.name} before continuing.` }
		};
	}

	const nextOwnedWeapons = removeScrappedWeapons(
		gameState.pixlState.ownedWeapons,
		definitionId,
		quantity,
		gameState.pixlState.loadoutPlacements,
		typeof weaponInstanceId === 'string' ? weaponInstanceId : null
	);
	const scrapEarned = quantity * scrapState.scrapValuePerItem;

	await updateGameState(userId, {
		pixlState: {
			scrap: gameState.pixlState.scrap + scrapEarned,
			ownedWeapons: nextOwnedWeapons
		}
	});

	return {
		ok: true,
		data: {
			loadoutSuccess: `Scrapped ${quantity} ${scrapState.name}${quantity === 1 ? '' : ' items'} for ${scrapEarned} Scrap.`
		}
	};
}

export async function upgradeOwnedWeaponForUser(
	userId: string | undefined,
	formData: FormData
): Promise<ActionResult<{ loadoutError?: string; loadoutSuccess?: string }>> {
	if (!userId) {
		return {
			ok: false,
			status: 401,
			data: { loadoutError: 'Sign in to upgrade weapons.' }
		};
	}

	const weaponInstanceId = formData.get('weaponInstanceId');

	if (typeof weaponInstanceId !== 'string') {
		return { ok: false, status: 400, data: { loadoutError: 'Invalid upgrade request.' } };
	}

	const gameState = await getOrCreateGameState(userId);
	const ownedWeaponIndex = gameState.pixlState.ownedWeapons.findIndex(
		(weapon) => weapon.instanceId === weaponInstanceId
	);

	if (ownedWeaponIndex < 0) {
		return { ok: false, status: 400, data: { loadoutError: 'Unknown owned weapon instance.' } };
	}

	const ownedWeapon = gameState.pixlState.ownedWeapons[ownedWeaponIndex];
	const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);

	if (!isUpgradeableWeaponInstance(ownedWeapon, definition)) {
		return {
			ok: false,
			status: 400,
			data: { loadoutError: 'That item cannot be upgraded.' }
		};
	}

	const currentUpgradeLevel = getWeaponUpgradeLevel(ownedWeapon);

	if (currentUpgradeLevel >= MAX_WEAPON_UPGRADE_LEVEL) {
		return {
			ok: false,
			status: 400,
			data: { loadoutError: 'That weapon is already at max upgrade level.' }
		};
	}

	const upgradeCost = getWeaponUpgradeCostForNextLevel(ownedWeapon, definition.rarity);

	if (upgradeCost === null) {
		return {
			ok: false,
			status: 400,
			data: { loadoutError: 'That weapon cannot be upgraded further.' }
		};
	}

	if (gameState.pixlState.scrap < upgradeCost) {
		return {
			ok: false,
			status: 400,
			data: { loadoutError: `You need ${upgradeCost - gameState.pixlState.scrap} more Scrap.` }
		};
	}

	const nextUpgradeLevel = currentUpgradeLevel + 1;
	const nextOwnedWeapons = gameState.pixlState.ownedWeapons.map((weapon) =>
		weapon.instanceId === weaponInstanceId
			? {
					...weapon,
					upgradeLevel: nextUpgradeLevel,
					totalScrapInvested: getWeaponTotalScrapInvested(weapon) + upgradeCost
				}
			: weapon
	);

	await updateGameState(userId, {
		pixlState: {
			scrap: gameState.pixlState.scrap - upgradeCost,
			ownedWeapons: nextOwnedWeapons
		}
	});

	return {
		ok: true,
		data: {
			loadoutSuccess: `${getWeaponDisplayName(definition.name, nextUpgradeLevel)} upgraded for ${upgradeCost} Scrap.`
		}
	};
}

export async function buyShopItemForUser(
	userId: string | undefined,
	formData: FormData
): Promise<ActionResult<{ shopError?: string; shopSuccess?: string }>> {
	if (!userId) {
		return {
			ok: false,
			status: 401,
			data: { shopError: 'Sign in to buy shop items.' }
		};
	}

	const definitionId = formData.get('definitionId');
	const refreshStartedAt = formData.get('refreshStartedAt');

	if (typeof definitionId !== 'string' || typeof refreshStartedAt !== 'string') {
		return { ok: false, status: 400, data: { shopError: 'Invalid shop purchase request.' } };
	}

	const gameState = await getOrCreateGameState(userId);
	const shopState = buildShopState(gameState, userId);

	if (!shopState.isUnlocked) {
		return {
			ok: false,
			status: 400,
			data: { shopError: 'Finish a campaign before the shop unlocks.' }
		};
	}

	if (shopState.refreshStartedAt !== refreshStartedAt) {
		return {
			ok: false,
			status: 409,
			data: { shopError: 'The shop refreshed. Review the new stock and try again.' }
		};
	}

	const offer = shopState.offers.find((candidate) => candidate.definitionId === definitionId);

	if (!offer) {
		return {
			ok: false,
			status: 400,
			data: { shopError: 'That item is not in the current shop rotation.' }
		};
	}

	if (gameState.pixlState.scrap < offer.price) {
		return {
			ok: false,
			status: 400,
			data: { shopError: `You need ${offer.price - gameState.pixlState.scrap} more Scrap.` }
		};
	}

	await updateGameState(userId, {
		pixlState: {
			scrap: gameState.pixlState.scrap - offer.price,
			ownedWeapons: [
				...gameState.pixlState.ownedWeapons,
				createShopOwnedWeaponInstance(offer.definitionId, offer.campaignId)
			]
		}
	});

	return {
		ok: true,
		data: { shopSuccess: `${offer.name} purchased for ${offer.price} Scrap.` }
	};
}

export async function selectStageForUser(
	userId: string | undefined,
	campaignId: number,
	formData: FormData
): Promise<ActionResult<{ stageError?: string; stageSuccess?: string }>> {
	if (!userId) {
		return {
			ok: false,
			status: 401,
			data: { stageError: 'Sign in to manage stage selection.' }
		};
	}

	const campaign = getCampaign(campaignId);
	const campaignState = await getCampaignProgressForUser(userId, campaignId);
	const rawStage = formData.get('stage');
	const stage = typeof rawStage === 'string' ? Number(rawStage) : NaN;

	if (!Number.isInteger(stage) || stage < 1 || stage > campaign.stages) {
		return { ok: false, status: 400, data: { stageError: 'Unknown stage selection.' } };
	}

	const targetLevel = (stage - 1) * campaign.levelsPerStage + 1;

	if (targetLevel > campaignState.highestUnlockedLevel) {
		return { ok: false, status: 400, data: { stageError: 'That stage is not unlocked yet.' } };
	}

	await updateGameState(userId, {
		campaignProgress: [
			{
				campaignId,
				currentLevel: targetLevel,
				highestUnlockedLevel: campaignState.highestUnlockedLevel,
				highestClearedLevel: campaignState.highestClearedLevel,
				completed: campaignState.completed
			}
		]
	});

	return { ok: true, data: { stageSuccess: `Stage ${stage} selected` } };
}

export async function purchaseUpgradeForUser(
	userId: string | undefined,
	campaignId: number,
	formData: FormData
): Promise<ActionResult<{ purchaseError?: string; purchaseSuccess?: string }>> {
	if (!userId) {
		return { ok: false, status: 401, data: { purchaseError: 'Sign in to assign perk points.' } };
	}

	const rawUpgrade = formData.get('upgrade');

	if (typeof rawUpgrade !== 'string' || !isUpgradeKey(rawUpgrade)) {
		return { ok: false, status: 400, data: { purchaseError: 'Unknown upgrade selection.' } };
	}

	const gameState = await getOrCreateGameState(userId);

	try {
		const nextPixlState = applyUpgradePurchase(rawUpgrade, gameState.pixlState);

		await updateGameState(userId, {
			pixlState: {
				xp: nextPixlState.xp,
				defence: nextPixlState.defence,
				agility: nextPixlState.agility
			}
		});

		return { ok: true, data: { purchaseSuccess: `${rawUpgrade} upgraded` } };
	} catch (err) {
		return {
			ok: false,
			status: 400,
			data: {
				purchaseError: err instanceof Error ? err.message : 'Upgrade purchase failed.'
			}
		};
	}
}

export async function resetUpgradesForUser(
	userId: string | undefined,
	campaignId: number
): Promise<ActionResult<{ purchaseError?: string; purchaseSuccess?: string }>> {
	if (!userId) {
		return { ok: false, status: 401, data: { purchaseError: 'Sign in to reset perk points.' } };
	}

	try {
		getCampaign(campaignId);
	} catch {
		return { ok: false, status: 404, data: { purchaseError: 'Campaign not found.' } };
	}

	const gameState = await getOrCreateGameState(userId);
	const nextPixlState = resetUpgradeAllocations(gameState.pixlState);

	await updateGameState(userId, {
		pixlState: {
			xp: nextPixlState.xp,
			defence: nextPixlState.defence,
			agility: nextPixlState.agility
		}
	});

	return { ok: true, data: { purchaseSuccess: 'Perk points reset.' } };
}

export async function resetPixlForUser(
	userId: string | undefined,
	campaignId: number
): Promise<ActionResult<{ resetError?: string; resetSuccess?: string }>> {
	if (!userId) {
		return { ok: false, status: 401, data: { resetError: 'Sign in to reset your pixl.' } };
	}

	try {
		getCampaign(campaignId);
	} catch {
		return { ok: false, status: 404, data: { resetError: 'Campaign not found.' } };
	}

	await resetGameStateForUser(userId);

	return { ok: true, data: { resetSuccess: 'All pixl data deleted.' } };
}

export function toActionFailure<T>(result: ActionResult<T>) {
	if (result.ok) {
		return result.data;
	}

	return fail(result.status, result.data);
}
