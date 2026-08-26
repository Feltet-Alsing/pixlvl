import type P5 from 'p5';

import type {
	WeaponActivationContext,
	WeaponActivationResult,
	WeaponBehaviorState,
	WeaponTargetState
} from '$lib/p5/weapon-behavior-types';
import type { WeaponArenaEffectProps, WeaponVariantComponentProps } from '$lib/p5/weapon-component';

export interface WeaponModule {
	activate: (
		weapon: WeaponBehaviorState,
		target: WeaponTargetState,
		context: WeaponActivationContext
	) => WeaponActivationResult;
	renderProjectile: (p: P5, props: WeaponVariantComponentProps) => void;
	renderArenaEffect: (p: P5, effect: WeaponArenaEffectProps) => boolean;
}
