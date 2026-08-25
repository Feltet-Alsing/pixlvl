import { onslaughtRosterCombatProfile } from './onslaught-roster-v1';

import type { CombatProfile } from '$lib/data/types';

export const endgameRosterCombatProfile: CombatProfile = {
	id: 'endgame-roster-v1',
	pixl: {
		...onslaughtRosterCombatProfile.pixl
	},
	projectileSpeed: onslaughtRosterCombatProfile.projectileSpeed,
	collision: {
		...onslaughtRosterCombatProfile.collision
	},
	glitches: {
		...onslaughtRosterCombatProfile.glitches,
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
