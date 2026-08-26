import { activateWeaponBehavior } from '$lib/p5/weapon-behaviors';
import { drawDefaultWeaponComponent } from '$lib/p5/weapon-component';
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
