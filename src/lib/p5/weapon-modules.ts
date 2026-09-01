import { ancientWeaponModulesById } from '$lib/p5/weapon-modules/ancient';
import { anomalyWeaponModulesById } from '$lib/p5/weapon-modules/anomaly';
import { controlWeaponModulesById } from '$lib/p5/weapon-modules/control';
import { defaultWeaponModule, defaultWeaponModulesById } from '$lib/p5/weapon-modules/default';
import { elementalWeaponModulesById } from '$lib/p5/weapon-modules/elemental';
import { precisionWeaponModulesById } from '$lib/p5/weapon-modules/precision';
import type { WeaponModule } from '$lib/p5/weapon-module-types';

export type { WeaponModule } from '$lib/p5/weapon-module-types';

const weaponModulesById: Record<string, Partial<WeaponModule>> = {
	...ancientWeaponModulesById,
	...defaultWeaponModulesById,
	...precisionWeaponModulesById,
	...controlWeaponModulesById,
	...elementalWeaponModulesById,
	...anomalyWeaponModulesById
};

export function getWeaponModule(weaponId: string): WeaponModule {
	const module = weaponModulesById[weaponId];

	if (!module) {
		return defaultWeaponModule;
	}

	return {
		activate: module.activate ?? defaultWeaponModule.activate,
		renderProjectile: module.renderProjectile ?? defaultWeaponModule.renderProjectile,
		renderArenaEffect: module.renderArenaEffect ?? defaultWeaponModule.renderArenaEffect
	};
}
