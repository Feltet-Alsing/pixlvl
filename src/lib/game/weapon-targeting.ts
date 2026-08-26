import type { WeaponTargetingKind } from '$lib/data/types';

export interface WeaponTargetingOption {
	value: WeaponTargetingKind;
	label: string;
}

export const standardWeaponTargetingKinds = [
	'nearest-target',
	'furthest-target',
	'strongest-target',
	'weakest-target'
] as const satisfies WeaponTargetingKind[];

export const placementWeaponTargetingKinds = [
	'top-left',
	'top-middle',
	'top-right',
	'middle-left',
	'middle-right',
	'bottom-left',
	'bottom-middle',
	'bottom-right'
] as const satisfies WeaponTargetingKind[];

export const allSelectableWeaponTargetingKinds = [
	...standardWeaponTargetingKinds,
	...placementWeaponTargetingKinds
] as const satisfies WeaponTargetingKind[];

export const targetingLabelByKind: Record<WeaponTargetingKind, string> = {
	'current-target': 'current target',
	'nearest-target': 'nearest target',
	'furthest-target': 'furthest target',
	'strongest-target': 'strongest target',
	'weakest-target': 'weakest target',
	'top-left': 'top left',
	'top-middle': 'top middle',
	'top-right': 'top right',
	'middle-left': 'middle left',
	'middle-right': 'middle right',
	'bottom-left': 'bottom left',
	'bottom-middle': 'bottom middle',
	'bottom-right': 'bottom right'
};

export const standardWeaponTargetingOptions = standardWeaponTargetingKinds.map((value) => ({
	value,
	label: targetingLabelByKind[value]
})) satisfies WeaponTargetingOption[];

export const placementWeaponTargetingOptions = placementWeaponTargetingKinds.map((value) => ({
	value,
	label: targetingLabelByKind[value]
})) satisfies WeaponTargetingOption[];

export const targetingAbbreviationByKind: Partial<Record<WeaponTargetingKind, string>> = {
	'current-target': 'NT',
	'nearest-target': 'NT',
	'furthest-target': 'FT',
	'strongest-target': 'ST',
	'weakest-target': 'WT',
	'top-left': 'TL',
	'top-middle': 'TM',
	'top-right': 'TR',
	'middle-left': 'ML',
	'middle-right': 'MR',
	'bottom-left': 'BL',
	'bottom-middle': 'BM',
	'bottom-right': 'BR'
};

export function isPlacementWeaponTargetingKind(
	targeting: WeaponTargetingKind | string | null | undefined
): targeting is (typeof placementWeaponTargetingKinds)[number] {
	return placementWeaponTargetingKinds.includes(
		targeting as (typeof placementWeaponTargetingKinds)[number]
	);
}

export function isSelectableWeaponTargetingKind(
	targeting: WeaponTargetingKind | string | null | undefined
): targeting is (typeof allSelectableWeaponTargetingKinds)[number] {
	return allSelectableWeaponTargetingKinds.includes(
		targeting as (typeof allSelectableWeaponTargetingKinds)[number]
	);
}

export function normalizeSelectableWeaponTargeting(
	targeting: WeaponTargetingKind | string | null | undefined,
	fallback: WeaponTargetingKind
) {
	if (targeting === 'current-target' || !targeting) {
		return fallback;
	}

	return isSelectableWeaponTargetingKind(targeting) ? targeting : fallback;
}
