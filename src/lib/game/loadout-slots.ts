import { getLoadoutItemDefinition } from '$lib/data';
import { allSelectableWeaponTargetingKinds } from '$lib/game/weapon-targeting';
import {
	getPlacementMirrored,
	getPlacementRotation,
	normalizeLoadoutMirror,
	normalizeLoadoutRotation,
	transformWeaponShape
} from '$lib/game/loadout-rotation';

import type {
	LoadoutPlacement,
	LoadoutSlotIndex,
	LoadoutSlots,
	OwnedWeaponInstance,
	PersistedLoadoutState,
	WeaponTargetingKind
} from '$lib/data/types';

export const LOADOUT_SLOT_COUNT = 3;

export function normalizeLoadoutSlotIndex(value: unknown): LoadoutSlotIndex {
	if (typeof value !== 'number' || !Number.isInteger(value)) {
		return 0;
	}

	if (value <= 0) {
		return 0;
	}

	if (value >= LOADOUT_SLOT_COUNT - 1) {
		return 2;
	}

	return value as LoadoutSlotIndex;
}

export function createEmptyLoadoutSlots(): LoadoutSlots {
	return [[], [], []];
}

export function cloneLoadoutPlacements(placements: LoadoutPlacement[]) {
	return placements.map((placement) => ({
		...placement,
		rotation: normalizeLoadoutRotation(placement.rotation),
		mirrored: normalizeLoadoutMirror(placement.mirrored)
	}));
}

export function cloneLoadoutSlots(slots: LoadoutSlots): LoadoutSlots {
	return slots.map((slot) => cloneLoadoutPlacements(slot)) as LoadoutSlots;
}

export function createPersistedLoadoutState(
	activeSlot: LoadoutSlotIndex,
	slots: LoadoutSlots
): PersistedLoadoutState {
	return {
		activeSlot,
		slots
	};
}

export function isPersistedLoadoutState(value: unknown): value is PersistedLoadoutState {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as PersistedLoadoutState;
	return Array.isArray(candidate.slots) && candidate.slots.length === LOADOUT_SLOT_COUNT;
}

export function normalizeLoadoutPlacements(
	loadoutPlacements: LoadoutPlacement[] | null | undefined,
	ownedWeapons: OwnedWeaponInstance[]
) {
	if (!Array.isArray(loadoutPlacements)) {
		return [];
	}

	if (loadoutPlacements.length === 0) {
		return [];
	}

	const ownedWeaponIds = new Set(ownedWeapons.map((weapon) => weapon.instanceId));
	const validTargetingKinds = new Set<WeaponTargetingKind>([
		'current-target',
		...allSelectableWeaponTargetingKinds
	]);

	return loadoutPlacements
		.filter((placement) => ownedWeaponIds.has(placement.weaponInstanceId))
		.map((placement) => ({
			weaponInstanceId: placement.weaponInstanceId,
			x: placement.x,
			y: placement.y,
			rotation: normalizeLoadoutRotation(placement.rotation),
			mirrored: getPlacementMirrored(placement),
			targeting: validTargetingKinds.has(placement.targeting as WeaponTargetingKind)
				? placement.targeting
				: undefined
		}));
}

function sanitizeLoadoutPlacements(
	placements: LoadoutPlacement[],
	ownedWeapons: OwnedWeaponInstance[],
	columnCount: number,
	rowCount: number
) {
	const ownedWeaponById = new Map(ownedWeapons.map((weapon) => [weapon.instanceId, weapon]));
	const sanitizedPlacements: LoadoutPlacement[] = [];
	const occupiedCells = new Set<string>();
	const seenWeaponInstanceIds = new Set<string>();
	const equippedLegendaryDefinitionIds = new Set<string>();
	const equippedUniqueDefinitionIds = new Set<string>();
	let hasEquippedTheKnife = false;

	for (const placement of placements) {
		if (seenWeaponInstanceIds.has(placement.weaponInstanceId)) {
			continue;
		}

		const ownedWeapon = ownedWeaponById.get(placement.weaponInstanceId);

		if (!ownedWeapon) {
			continue;
		}

		const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);

		if (definition.id === 'the-knife') {
			if (hasEquippedTheKnife) {
				continue;
			}

			hasEquippedTheKnife = true;
		}

		if (definition.rarity === 'legendary' && equippedLegendaryDefinitionIds.has(definition.id)) {
			continue;
		}

		if (definition.uniquePerLoadout && equippedUniqueDefinitionIds.has(definition.id)) {
			continue;
		}

		const rotation = getPlacementRotation(placement);
		const mirrored = getPlacementMirrored(placement);
		const shape = transformWeaponShape(definition.shape, rotation, mirrored);
		const occupiedByPlacement: string[] = [];
		let isValidPlacement = true;

		for (const [cellX, cellY] of shape.cells) {
			const gridX = placement.x + cellX;
			const gridY = placement.y + cellY;
			const key = `${gridX}:${gridY}`;

			if (
				gridX < 0 ||
				gridX >= columnCount ||
				gridY < 0 ||
				gridY >= rowCount ||
				occupiedCells.has(key)
			) {
				isValidPlacement = false;
				break;
			}

			occupiedByPlacement.push(key);
		}

		if (!isValidPlacement) {
			continue;
		}

		seenWeaponInstanceIds.add(placement.weaponInstanceId);
		if (definition.rarity === 'legendary') {
			equippedLegendaryDefinitionIds.add(definition.id);
		}

		if (definition.uniquePerLoadout) {
			equippedUniqueDefinitionIds.add(definition.id);
		}

		for (const key of occupiedByPlacement) {
			occupiedCells.add(key);
		}

		sanitizedPlacements.push({
			...placement,
			rotation,
			mirrored
		});
	}

	return sanitizedPlacements;
}

export function normalizePersistedLoadoutState(
	value: PersistedLoadoutState | LoadoutPlacement[] | null | undefined,
	ownedWeapons: OwnedWeaponInstance[],
	fallbackPlacements: LoadoutPlacement[] = [],
	columnCount?: number,
	rowCount?: number
): PersistedLoadoutState {
	if (isPersistedLoadoutState(value)) {
		const slots = createEmptyLoadoutSlots();
		for (let index = 0; index < LOADOUT_SLOT_COUNT; index += 1) {
			const normalizedPlacements = normalizeLoadoutPlacements(
				value.slots[index] ?? [],
				ownedWeapons
			);
			slots[index] =
				columnCount !== undefined && rowCount !== undefined
					? sanitizeLoadoutPlacements(normalizedPlacements, ownedWeapons, columnCount, rowCount)
					: normalizedPlacements;
		}

		return {
			activeSlot: normalizeLoadoutSlotIndex(value.activeSlot),
			slots
		};
	}

	const slots = createEmptyLoadoutSlots();
	const normalizedPrimary = normalizeLoadoutPlacements(value ?? fallbackPlacements, ownedWeapons);
	const sanitizedPrimary =
		columnCount !== undefined && rowCount !== undefined
			? sanitizeLoadoutPlacements(normalizedPrimary, ownedWeapons, columnCount, rowCount)
			: normalizedPrimary;
	slots[0] =
		sanitizedPrimary.length > 0 ? sanitizedPrimary : cloneLoadoutPlacements(fallbackPlacements);

	return {
		activeSlot: 0,
		slots
	};
}

export function getActiveLoadoutPlacements(state: PersistedLoadoutState): LoadoutPlacement[] {
	return state.slots[state.activeSlot] ?? [];
}

export function setActiveLoadoutPlacements(
	state: PersistedLoadoutState,
	placements: LoadoutPlacement[]
): PersistedLoadoutState {
	const slots = cloneLoadoutSlots(state.slots);
	slots[state.activeSlot] = cloneLoadoutPlacements(placements);
	return {
		activeSlot: state.activeSlot,
		slots
	};
}
