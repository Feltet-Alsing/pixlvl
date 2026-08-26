import { activateWeaponBehavior } from '$lib/p5/weapon-behaviors';
import {
	drawDefaultWeaponComponent,
	drawPerimeterMineEffect,
	drawSupportPylonEffect,
	drawTurretMineEffect
} from '$lib/p5/weapon-component';
import type { WeaponModule } from '$lib/p5/weapon-module-types';

export const defaultWeaponModule: WeaponModule = {
	activate: activateWeaponBehavior,
	renderProjectile: (p, props) => {
		drawDefaultWeaponComponent(p, props);
	},
	renderArenaEffect: () => {
		return false;
	}
};

export const defaultProjectileWeaponModule: Partial<WeaponModule> = {
	renderProjectile: defaultWeaponModule.renderProjectile,
	renderArenaEffect: defaultWeaponModule.renderArenaEffect
};

const mineWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind === 'perimeter-mine') {
			drawPerimeterMineEffect(p, effect);
			return true;
		}

		if (effect.kind === 'turret-mine') {
			drawTurretMineEffect(p, effect);
			return true;
		}

		return false;
	}
};

const pylonWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind === 'support-pylon') {
			drawSupportPylonEffect(p, effect);
			return true;
		}

		return false;
	}
};

export const defaultProjectileWeaponIds = [
	'target-painter',
	'the-knife',
	'pea-shooter',
	'blaster',
	'splitter',
	'heavy-orb',
	'fan-of-knives',
	'tide-caster',
	'ricochet-zigzag',
	'arc-caster',
	'ember-lance',
	'shiver-fork',
	'pulse-array',
	'comet-rig',
	'nova-rack',
	'aegis-leech',
	'prism-brand',
	'relay-torch',
	'flamethrower',
	'grave-threader'
] as const;

export const defaultWeaponModulesById = Object.fromEntries(
	defaultProjectileWeaponIds.map((weaponId) => [weaponId, defaultProjectileWeaponModule])
) as Record<string, Partial<WeaponModule>>;

defaultWeaponModulesById['the-mine'] = mineWeaponModule;
defaultWeaponModulesById['cluster-mines'] = mineWeaponModule;
defaultWeaponModulesById['shrapnel-mine'] = mineWeaponModule;
defaultWeaponModulesById['napalm-mine'] = mineWeaponModule;
defaultWeaponModulesById['turret-mine'] = mineWeaponModule;
defaultWeaponModulesById['mark-beacon'] = pylonWeaponModule;
defaultWeaponModulesById['cold-lattice'] = pylonWeaponModule;
defaultWeaponModulesById['mine-calibrator'] = pylonWeaponModule;
defaultWeaponModulesById['hemorrhage-relay'] = pylonWeaponModule;
