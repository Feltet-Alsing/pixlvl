import { normalizeLoadoutRotation } from '$lib/game/loadout-rotation';

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
		rotation: normalizeLoadoutRotation(placement.rotation)
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
		'nearest-target',
		'furthest-target',
		'strongest-target',
		'weakest-target'
	]);

	return loadoutPlacements
		.filter((placement) => ownedWeaponIds.has(placement.weaponInstanceId))
		.map((placement) => ({
			weaponInstanceId: placement.weaponInstanceId,
			x: placement.x,
			y: placement.y,
			rotation: normalizeLoadoutRotation(placement.rotation),
			targeting: validTargetingKinds.has(placement.targeting as WeaponTargetingKind)
				? placement.targeting
				: undefined
		}));
}

export function normalizePersistedLoadoutState(
	value: PersistedLoadoutState | LoadoutPlacement[] | null | undefined,
	ownedWeapons: OwnedWeaponInstance[],
	fallbackPlacements: LoadoutPlacement[] = []
): PersistedLoadoutState {
	if (isPersistedLoadoutState(value)) {
		const slots = createEmptyLoadoutSlots();
		for (let index = 0; index < LOADOUT_SLOT_COUNT; index += 1) {
			slots[index] = normalizeLoadoutPlacements(value.slots[index] ?? [], ownedWeapons);
		}

		return {
			activeSlot: normalizeLoadoutSlotIndex(value.activeSlot),
			slots
		};
	}

	const slots = createEmptyLoadoutSlots();
	const normalizedPrimary = normalizeLoadoutPlacements(value ?? fallbackPlacements, ownedWeapons);
	slots[0] =
		normalizedPrimary.length > 0 ? normalizedPrimary : cloneLoadoutPlacements(fallbackPlacements);

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
