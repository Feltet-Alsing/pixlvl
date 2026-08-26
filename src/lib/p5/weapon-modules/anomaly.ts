import {
	drawBurningGroundEffect,
	drawDelayedBombEffect,
	drawExecutionLatticeStrikeEffect,
	drawNapalmGrenadeComponent,
	drawPhaseshiftEffect,
	drawStasisFieldEffect,
	drawVoidTunnelEffect
} from '$lib/p5/weapon-component';
import type { WeaponModule } from '$lib/p5/weapon-module-types';

const voidTunnelWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'void-tunnel') {
			return false;
		}

		drawVoidTunnelEffect(p, effect);
		return true;
	}
};

const phaseshiftWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'phaseshift') {
			return false;
		}

		drawPhaseshiftEffect(p, effect);
		return true;
	}
};

const stasisFieldWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'stasis-field') {
			return false;
		}

		drawStasisFieldEffect(p, effect);
		return true;
	}
};

const napalmGrenadeWeaponModule: Partial<WeaponModule> = {
	renderProjectile: (p, props) => {
		drawNapalmGrenadeComponent(p, props);
	},
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'burning-ground') {
			return false;
		}

		drawBurningGroundEffect(p, effect);
		return true;
	}
};

const delayedBombWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'delayed-bomb') {
			return false;
		}

		drawDelayedBombEffect(p, effect);
		return true;
	}
};

const executionLatticeWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'execution-lattice-strike') {
			return false;
		}

		drawExecutionLatticeStrikeEffect(p, effect);
		return true;
	}
};

export const anomalyWeaponModulesById: Record<string, Partial<WeaponModule>> = {
	'void-tunnel': voidTunnelWeaponModule,
	'black-hole': voidTunnelWeaponModule,
	phaseshift: phaseshiftWeaponModule,
	'force-field-trap': stasisFieldWeaponModule,
	'napalm-grenade': napalmGrenadeWeaponModule,
	'the-bomb': delayedBombWeaponModule,
	'execution-lattice': executionLatticeWeaponModule
};
