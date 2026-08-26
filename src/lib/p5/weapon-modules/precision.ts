import {
	drawDeadeyeSniperComponent,
	drawNeedleBurstEffect,
	drawSniperChainBurstEffect,
	drawSniperLockEffect
} from '$lib/p5/weapon-component';
import type { WeaponModule } from '$lib/p5/weapon-module-types';

const deadeyeSniperWeaponModule: Partial<WeaponModule> = {
	renderProjectile: (p, props) => {
		drawDeadeyeSniperComponent(p, props);
	}
};

const redlineSniperWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind === 'sniper-lock') {
			drawSniperLockEffect(p, effect);
			return true;
		}

		if (effect.kind === 'sniper-chain-burst') {
			drawSniperChainBurstEffect(p, effect);
			return true;
		}

		return false;
	}
};

const needleWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'needle-burst') {
			return false;
		}

		drawNeedleBurstEffect(p, effect);
		return true;
	}
};

export const precisionWeaponModulesById: Record<string, Partial<WeaponModule>> = {
	'deadeye-sniper': deadeyeSniperWeaponModule,
	'redline-sniper': redlineSniperWeaponModule,
	needle: needleWeaponModule
};
