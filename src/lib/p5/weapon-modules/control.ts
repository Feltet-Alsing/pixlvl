import {
	drawForceFieldEffect,
	drawKillSwitchPulseEffect,
	drawLaserSweepEffect,
	drawVulnerablePulseEffect
} from '$lib/p5/weapon-component';
import type { WeaponModule } from '$lib/p5/weapon-module-types';

const forceFieldWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'force-field') {
			return false;
		}

		drawForceFieldEffect(p, effect);
		return true;
	}
};

const killSwitchWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'kill-switch-pulse') {
			return false;
		}

		drawKillSwitchPulseEffect(p, effect);
		return true;
	}
};

const vulnerablePulseWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'vulnerable-pulse') {
			return false;
		}

		drawVulnerablePulseEffect(p, effect);
		return true;
	}
};

const laserSweepWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'laser-sweep') {
			return false;
		}

		drawLaserSweepEffect(p, effect);
		return true;
	}
};

export const controlWeaponModulesById: Record<string, Partial<WeaponModule>> = {
	'force-field': forceFieldWeaponModule,
	'kill-switch': killSwitchWeaponModule,
	'ruin-choir': vulnerablePulseWeaponModule,
	'lazer-rail': laserSweepWeaponModule
};
