import type { CombatProfile } from '$lib/data/types';

export const baselineCombatProfile: CombatProfile = {
	id: 'baseline-v1',
	pixl: {
		health: 100,
		attackSpeed: 0.5
	},
	projectileSpeed: 360,
	collision: {
		pixlRadius: 20,
		enemyRadius: 14,
		contactRange: 26
	},
	glitches: {
		biter: {
			health: 10,
			contactDamage: 6,
			attackSpeed: 0.8,
			moveSpeed: 55
		},
		swarmer: {
			health: 7,
			contactDamage: 4,
			attackSpeed: 1.2,
			moveSpeed: 85
		},
		tanker: {
			health: 30,
			contactDamage: 12,
			attackSpeed: 0.5,
			moveSpeed: 35
		},
		shard: {
			health: 14,
			contactDamage: 8,
			attackSpeed: 1,
			moveSpeed: 70
		},
		bulwark: {
			health: 42,
			contactDamage: 15,
			attackSpeed: 0.4,
			moveSpeed: 28
		}
	}
};
