import {
	drawBlizzardStormEffect,
	drawForkLightningEffect,
	drawIceSpikeEffect,
	drawVoidTendrilEffect
} from '$lib/p5/weapon-component';
import type { WeaponModule } from '$lib/p5/weapon-module-types';

const forkLightningWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'fork-lightning') {
			return false;
		}

		drawForkLightningEffect(p, effect);
		return true;
	}
};

const blizzardWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind === 'ice-spike') {
			drawIceSpikeEffect(p, effect);
			return true;
		}

		if (effect.kind === 'blizzard-storm') {
			drawBlizzardStormEffect(p, effect);
			return true;
		}

		return false;
	}
};

const voidTendrilsWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'void-tendril') {
			return false;
		}

		drawVoidTendrilEffect(p, effect);
		return true;
	}
};

export const elementalWeaponModulesById: Record<string, Partial<WeaponModule>> = {
	'zeus-hammer': forkLightningWeaponModule,
	blizzard: blizzardWeaponModule,
	'void-tendrils': voidTendrilsWeaponModule
};
