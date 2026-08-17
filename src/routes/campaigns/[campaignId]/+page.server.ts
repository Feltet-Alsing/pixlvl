import { error, fail } from '@sveltejs/kit';

import {
	getCampaign,
	getCampaignCombatProfile,
	getLoadoutItemDefinition,
	getCampaignWeaponPool
} from '$lib/data';
import {
	getActiveLoadoutPlacements,
	normalizePersistedLoadoutState,
	setActiveLoadoutPlacements
} from '$lib/game/loadout-slots';
import { applyUpgradePurchase, isUpgradeKey } from '$lib/game/upgrades';
import {
	getCampaignProgressForUser,
	getOrCreateGameState,
	updateGameState
} from '$lib/server/game-state';
import { getPlacementRotation, rotateWeaponShape } from '$lib/game/loadout-rotation';

import type { LoadoutItemDefinition, LoadoutPlacement, OwnedWeaponInstance } from '$lib/data/types';

import type { Actions, PageServerLoad } from './$types';

const LOADOUT_COLUMN_COUNT = 8;
const LOADOUT_ROW_COUNT = 5;

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
	x: number,
	y: number
) {
	return rotateWeaponShape(definition.shape, rotation).cells.every(([cellX, cellY]) => {
		const gridX = x + cellX;
		const gridY = y + cellY;

		return gridX >= 0 && gridX < LOADOUT_COLUMN_COUNT && gridY >= 0 && gridY < LOADOUT_ROW_COUNT;
	});
}

function placementsOverlap(
	ownedWeapons: OwnedWeaponInstance[],
	placements: LoadoutPlacement[],
	currentInstanceId: string,
	definition: LoadoutItemDefinition,
	rotation: LoadoutPlacement['rotation'],
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
		const placedShape = rotateWeaponShape(placedDefinition.shape, getPlacementRotation(placement));

		for (const [cellX, cellY] of placedShape.cells) {
			occupied.add(`${placement.x + cellX}:${placement.y + cellY}`);
		}
	}

	return rotateWeaponShape(definition.shape, rotation).cells.some(([cellX, cellY]) =>
		occupied.has(`${x + cellX}:${y + cellY}`)
	);
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const campaignId = Number(params.campaignId);

	if (!Number.isInteger(campaignId)) {
		throw error(404, 'Campaign not found');
	}

	try {
		const campaign = getCampaign(campaignId);
		const combatProfile = getCampaignCombatProfile(campaignId);
		const weaponPool = getCampaignWeaponPool(campaignId);
		const gameState = locals.user ? await getOrCreateGameState(locals.user.id) : null;
		const campaignState = locals.user
			? await getCampaignProgressForUser(locals.user.id, campaignId)
			: null;

		return {
			campaignId,
			campaign,
			combatProfile,
			weaponPool,
			gameState,
			campaignState
		};
	} catch {
		throw error(404, 'Campaign not found');
	}
};

export const actions: Actions = {
	placeLoadoutWeapon: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { loadoutError: 'Sign in to manage your loadout.' });
		}

		const campaignId = Number(params.campaignId);

		if (!Number.isInteger(campaignId)) {
			return fail(404, { loadoutError: 'Campaign not found.' });
		}

		const formData = await request.formData();
		const weaponInstanceId = formData.get('weaponInstanceId');
		const x = parseGridCoordinate(formData.get('x'), LOADOUT_COLUMN_COUNT);
		const y = parseGridCoordinate(formData.get('y'), LOADOUT_ROW_COUNT);
		const rotation = getPlacementRotation({
			rotation: formData.get('rotation') ? Number(formData.get('rotation')) : 0
		});

		if (typeof weaponInstanceId !== 'string' || x === null || y === null) {
			return fail(400, { loadoutError: 'Invalid loadout placement request.' });
		}

		const gameState = await getOrCreateGameState(locals.user.id);
		const activePlacements = getActiveLoadoutPlacements(
			normalizePersistedLoadoutState(
				gameState.pixlState.loadoutPlacements,
				gameState.pixlState.ownedWeapons
			)
		);
		const ownedWeapon = gameState.pixlState.ownedWeapons.find(
			(weapon) => weapon.instanceId === weaponInstanceId
		);

		if (!ownedWeapon) {
			return fail(400, { loadoutError: 'Unknown owned weapon instance.' });
		}

		const alreadyPlaced = activePlacements.some(
			(placement) => placement.weaponInstanceId === weaponInstanceId
		);

		if (alreadyPlaced) {
			return fail(400, { loadoutError: 'That weapon is already equipped.' });
		}

		const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);

		if (!isPlacementWithinBounds(definition, rotation, x, y)) {
			return fail(400, { loadoutError: 'That placement does not fit inside the 5 x 8 grid.' });
		}

		if (
			placementsOverlap(
				gameState.pixlState.ownedWeapons,
				activePlacements,
				weaponInstanceId,
				definition,
				rotation,
				x,
				y
			)
		) {
			return fail(400, { loadoutError: 'That placement overlaps an equipped weapon.' });
		}

		await updateGameState(locals.user.id, {
			pixlState: {
				loadoutPlacements: setActiveLoadoutPlacements(
					normalizePersistedLoadoutState(
						gameState.pixlState.loadoutPlacements,
						gameState.pixlState.ownedWeapons
					),
					[
						...activePlacements,
						{
							weaponInstanceId,
							x,
							y,
							rotation
						}
					]
				)
			}
		});

		return {
			loadoutSuccess: `${definition.name} placed at (${x}, ${y})`
		};
	},
	removeLoadoutPlacement: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { loadoutError: 'Sign in to manage your loadout.' });
		}

		const campaignId = Number(params.campaignId);

		if (!Number.isInteger(campaignId)) {
			return fail(404, { loadoutError: 'Campaign not found.' });
		}

		const formData = await request.formData();
		const weaponInstanceId = formData.get('weaponInstanceId');

		if (typeof weaponInstanceId !== 'string') {
			return fail(400, { loadoutError: 'Invalid loadout removal request.' });
		}

		const gameState = await getOrCreateGameState(locals.user.id);
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
			return fail(400, { loadoutError: 'That weapon is not currently equipped.' });
		}

		const ownedWeapon = gameState.pixlState.ownedWeapons.find(
			(weapon) => weapon.instanceId === weaponInstanceId
		);
		const definition = ownedWeapon ? getLoadoutItemDefinition(ownedWeapon.definitionId) : null;

		await updateGameState(locals.user.id, {
			pixlState: {
				loadoutPlacements: setActiveLoadoutPlacements(
					normalizePersistedLoadoutState(
						gameState.pixlState.loadoutPlacements,
						gameState.pixlState.ownedWeapons
					),
					nextPlacements
				)
			}
		});

		return {
			loadoutSuccess: `${definition?.name ?? 'Weapon'} removed from loadout`
		};
	},
	selectStage: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { stageError: 'Sign in to manage stage selection.' });
		}

		const campaignId = Number(params.campaignId);

		if (!Number.isInteger(campaignId)) {
			return fail(404, { stageError: 'Campaign not found.' });
		}

		const campaign = getCampaign(campaignId);
		const campaignState = await getCampaignProgressForUser(locals.user.id, campaignId);
		const formData = await request.formData();
		const rawStage = formData.get('stage');
		const stage = typeof rawStage === 'string' ? Number(rawStage) : NaN;

		if (!Number.isInteger(stage) || stage < 1 || stage > campaign.stages) {
			return fail(400, { stageError: 'Unknown stage selection.' });
		}

		const targetLevel = (stage - 1) * campaign.levelsPerStage + 1;

		if (targetLevel > campaignState.highestUnlockedLevel) {
			return fail(400, { stageError: 'That stage is not unlocked yet.' });
		}

		await updateGameState(locals.user.id, {
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

		return {
			stageSuccess: `Stage ${stage} selected`
		};
	},
	purchaseUpgrade: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { purchaseError: 'Sign in to assign perk points.' });
		}

		const campaignId = Number(params.campaignId);

		if (!Number.isInteger(campaignId)) {
			return fail(404, { purchaseError: 'Campaign not found.' });
		}

		const formData = await request.formData();
		const rawUpgrade = formData.get('upgrade');

		if (typeof rawUpgrade !== 'string' || !isUpgradeKey(rawUpgrade)) {
			return fail(400, { purchaseError: 'Unknown upgrade selection.' });
		}

		const gameState = await getOrCreateGameState(locals.user.id);

		try {
			const nextPixlState = applyUpgradePurchase(rawUpgrade, gameState.pixlState);

			await updateGameState(locals.user.id, {
				pixlState: {
					xp: nextPixlState.xp,
					defence: nextPixlState.defence,
					agility: nextPixlState.agility
				}
			});

			return {
				purchaseSuccess: `${rawUpgrade} upgraded`
			};
		} catch (err) {
			return fail(400, {
				purchaseError: err instanceof Error ? err.message : 'Upgrade purchase failed.'
			});
		}
	}
};
