import {
	drawBindingRuneEffect,
	drawHealingRuneEffect,
	drawJudgmentRuneSunEffect,
	drawNaturesWrathEffect,
	drawRuneCastEffect,
	drawSlowingRuneEffect,
	drawSunbrandRuneEffect,
	drawSunRuneEffect
} from '$lib/p5/weapon-component';
import type { WeaponModule } from '$lib/p5/weapon-module-types';

const ancientRuneWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind === 'rune-cast') {
			drawRuneCastEffect(p, effect);
			return true;
		}

		if (effect.kind === 'sun-rune') {
			drawSunRuneEffect(p, effect);
			return true;
		}

		if (effect.kind === 'binding-rune') {
			drawBindingRuneEffect(p, effect);
			return true;
		}

		if (effect.kind === 'judgment-rune-sun') {
			drawJudgmentRuneSunEffect(p, effect);
			return true;
		}

		if (effect.kind === 'healing-rune') {
			drawHealingRuneEffect(p, effect);
			return true;
		}

		if (effect.kind === 'slowing-rune') {
			drawSlowingRuneEffect(p, effect);
			return true;
		}

		if (effect.kind === 'sunbrand-rune') {
			drawSunbrandRuneEffect(p, effect);
			return true;
		}

		if (effect.kind === 'natures-wrath') {
			drawNaturesWrathEffect(p, effect);
			return true;
		}

		return false;
	}
};

export const ancientWeaponModulesById: Record<string, Partial<WeaponModule>> = {
	'judgment-rune': ancientRuneWeaponModule,
	'ascendance-rune': ancientRuneWeaponModule,
	'rune-reiterator': ancientRuneWeaponModule,
	'binding-rune': ancientRuneWeaponModule,
	'sun-rune': ancientRuneWeaponModule,
	'healing-rune': ancientRuneWeaponModule,
	'slowing-rune': ancientRuneWeaponModule,
	'sunbrand-rune': ancientRuneWeaponModule,
	'natures-wrath': ancientRuneWeaponModule
};
