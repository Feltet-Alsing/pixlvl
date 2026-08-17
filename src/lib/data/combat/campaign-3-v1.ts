import type { CombatProfile } from '$lib/data/types';

export const campaign3CombatProfile: CombatProfile = {
	id: 'campaign-3-v1',
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
			health: 14,
			contactDamage: 8,
			attackSpeed: 0.95,
			moveSpeed: 60
		},
		swarmer: {
			health: 11,
			contactDamage: 6,
			attackSpeed: 1.38,
			moveSpeed: 96
		},
		tanker: {
			health: 44,
			contactDamage: 15,
			attackSpeed: 0.58,
			moveSpeed: 40
		},
		shard: {
			health: 22,
			contactDamage: 6,
			attackSpeed: 0.72,
			moveSpeed: 62,
			attackPattern: 'siege',
			preferredRange: 138,
			orbitSpeed: 30,
			projectileSpeed: 224,
			projectileDamage: 7,
			projectileColor: '#7ae7ff',
			projectileSize: 8
		},
		bulwark: {
			health: 68,
			contactDamage: 20,
			attackSpeed: 0.44,
			moveSpeed: 30,
			onHitShieldDuration: 1.2,
			onHitShieldCooldown: 2.2,
			onHitShieldDamageReduction: 0.68,
			shieldColor: '#ffd36b'
		},
		shielder: {
			health: 92,
			contactDamage: 0,
			attackSpeed: 0.55,
			moveSpeed: 60,
			attackPattern: 'siege',
			supportPattern: 'shield-nearest-non-bulwark',
			preferredRange: 138,
			orbitSpeed: 30,
			allyShieldAmount: 30,
			allyShieldDuration: 1,
			shieldColor: '#7fb7ff'
		},
		zerglitch: {
			health: 124,
			contactDamage: 23,
			attackSpeed: 0.38,
			moveSpeed: 29
		}
	}
};
