import {
	activateProjectilePattern,
	specialTypeActivators,
	weaponIdActivators
} from '$lib/p5/weapon-behavior-primitives';

export type {
	WeaponActivationContext,
	WeaponActivationResult,
	WeaponBehaviorState,
	WeaponTargetState
} from '$lib/p5/weapon-behavior-types';
import type {
	WeaponBehaviorState,
	WeaponTargetState,
	WeaponActivationContext,
	WeaponActivationResult
} from '$lib/p5/weapon-behavior-types';

export function activateWeaponBehavior(
	weapon: WeaponBehaviorState,
	target: WeaponTargetState,
	context: WeaponActivationContext
): WeaponActivationResult {
	const special = weapon.definition.attack.special;

	if (special?.type && specialTypeActivators[special.type]) {
		return specialTypeActivators[special.type]!(weapon, target, context);
	}

	if (weaponIdActivators[weapon.definition.id]) {
		return weaponIdActivators[weapon.definition.id](weapon, target, context);
	}

	return activateProjectilePattern(weapon, target, context);
}
