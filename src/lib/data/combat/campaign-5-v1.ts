import { campaign4CombatProfile } from './campaign-4-v1';

import type { CombatProfile } from '$lib/data/types';

export const campaign5CombatProfile: CombatProfile = {
	id: 'campaign-5-v1',
	pixl: {
		...campaign4CombatProfile.pixl
	},
	projectileSpeed: campaign4CombatProfile.projectileSpeed,
	collision: {
		...campaign4CombatProfile.collision
	},
	glitches: {
		...campaign4CombatProfile.glitches,
		'boss-melee': {
			health: 1752,
			contactDamage: 1000,
			attackSpeed: 1,
			moveSpeed: 18
		},
		'boss-ranged': {
			health: 2352,
			contactDamage: 0,
			attackSpeed: 1,
			moveSpeed: 26,
			attackPattern: 'siege',
			preferredRange: 210,
			orbitSpeed: 18,
			projectileSpeed: 210,
			projectileDamage: 250,
			projectileColor: '#9be7ff',
			projectileSize: 18
		},
		'boss-hybrid': {
			health: 13800,
			contactDamage: 1000,
			attackSpeed: 1,
			moveSpeed: 16,
			attackPattern: 'hybrid',
			projectileSpeed: 220,
			projectileDamage: 250,
			projectileColor: '#ffd36b',
			projectileSize: 20
		}
	}
};
