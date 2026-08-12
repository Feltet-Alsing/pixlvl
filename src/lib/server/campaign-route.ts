import { fail } from '@sveltejs/kit';

import {
	getCampaign,
	getCampaignCombatProfile,
	getCampaignWeaponPool,
	getLoadoutItemDefinition,
	getWeaponDefinition,
	weaponDefinitions
} from '$lib/data';
import { applyUpgradePurchase, isUpgradeKey } from '$lib/game/upgrades';
import {
	acknowledgePerkNotificationsForUser,
	acknowledgeWeaponNotificationsForUser,
	getCampaignProgressForUser,
	getOrCreateGameState,
	resetGameStateForUser,
	updateGameState
} from '$lib/server/game-state';

import { getCampaignRouteNotificationCounts } from '$lib/game/notifications';

import type { LoadoutItemDefinition, LoadoutPlacement, OwnedWeaponInstance } from '$lib/data/types';

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

	return {
		campaignId,
		campaign,
		combatProfile,
		weaponPool,
		weaponDefinitionsById: weaponDefinitions,
		gameState,
		campaignState,
		notificationCounts: getCampaignRouteNotificationCounts(gameState?.pixlState)
	};
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
	x: number,
	y: number,
	columnCount: number,
	rowCount: number
) {
	return definition.shape.cells.every(([cellX, cellY]) => {
		const gridX = x + cellX;
		const gridY = y + cellY;

		return gridX >= 0 && gridX < columnCount && gridY >= 0 && gridY < rowCount;
	});
}

function placementsOverlap(
	ownedWeapons: OwnedWeaponInstance[],
	placements: LoadoutPlacement[],
	currentInstanceId: string,
	definition: LoadoutItemDefinition,
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

		for (const [cellX, cellY] of placedDefinition.shape.cells) {
			occupied.add(`${placement.x + cellX}:${placement.y + cellY}`);
		}
	}

	return definition.shape.cells.some(([cellX, cellY]) => occupied.has(`${x + cellX}:${y + cellY}`));
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

		if (!isPlacementWithinBounds(definition, placement.x, placement.y, columnCount, rowCount)) {
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
			loadoutPlacements: placements
		}
	});

	return {
		ok: true as const,
		data: { loadoutSuccess: 'Loadout saved' }
	};
}

function parseLoadoutPlacementsFromFormData(formData: FormData) {
	const rawPlacements = formData.get('loadoutPlacements');

	if (typeof rawPlacements !== 'string') {
		return null;
	}

	try {
		const parsed = JSON.parse(rawPlacements);

		if (!Array.isArray(parsed)) {
			return null;
		}

		return parsed
			.map((entry) => {
				if (
					typeof entry !== 'object' ||
					entry === null ||
					typeof entry.weaponInstanceId !== 'string' ||
					typeof entry.x !== 'number' ||
					typeof entry.y !== 'number'
				) {
					return null;
				}

				return {
					weaponInstanceId: entry.weaponInstanceId,
					x: entry.x,
					y: entry.y
				} satisfies LoadoutPlacement;
			})
			.filter((entry): entry is LoadoutPlacement => entry !== null);
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
	const columnCount = gameState.pixlState.loadoutColumns;
	const rowCount = gameState.pixlState.loadoutRows;
	const weaponInstanceId = formData.get('weaponInstanceId');
	const x = parseGridCoordinate(formData.get('x'), columnCount);
	const y = parseGridCoordinate(formData.get('y'), rowCount);

	if (typeof weaponInstanceId !== 'string' || x === null || y === null) {
		return { ok: false, status: 400, data: { loadoutError: 'Invalid loadout placement request.' } };
	}

	const ownedWeapon = gameState.pixlState.ownedWeapons.find(
		(weapon) => weapon.instanceId === weaponInstanceId
	);

	if (!ownedWeapon) {
		return { ok: false, status: 400, data: { loadoutError: 'Unknown owned weapon instance.' } };
	}

	const alreadyPlaced = gameState.pixlState.loadoutPlacements.some(
		(placement) => placement.weaponInstanceId === weaponInstanceId
	);

	if (alreadyPlaced) {
		return { ok: false, status: 400, data: { loadoutError: 'That weapon is already equipped.' } };
	}

	const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);
	const nextPlacements = [
		...gameState.pixlState.loadoutPlacements,
		{
			weaponInstanceId,
			x,
			y
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
	const nextPlacements = gameState.pixlState.loadoutPlacements.filter(
		(placement) => placement.weaponInstanceId !== weaponInstanceId
	);

	if (nextPlacements.length === gameState.pixlState.loadoutPlacements.length) {
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

	const placements = parseLoadoutPlacementsFromFormData(formData);

	if (!placements) {
		return { ok: false, status: 400, data: { loadoutError: 'Invalid loadout save request.' } };
	}

	return persistLoadoutPlacementsForUser(userId, placements);
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

	return { ok: true, data: { resetSuccess: 'Pixl reset to defaults.' } };
}

export function toActionFailure<T>(result: ActionResult<T>) {
	if (result.ok) {
		return result.data;
	}

	return fail(result.status, result.data);
}
