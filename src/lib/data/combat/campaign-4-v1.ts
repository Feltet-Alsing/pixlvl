import type { CombatProfile } from '$lib/data/types';

export const campaign4CombatProfile: CombatProfile = {
	id: 'campaign-4-v1',
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
			health: 18,
			contactDamage: 10,
			attackSpeed: 1.02,
			moveSpeed: 64
		},
		swarmer: {
			health: 13,
			contactDamage: 7,
			attackSpeed: 1.5,
			moveSpeed: 108
		},
		tanker: {
			health: 58,
			contactDamage: 18,
			attackSpeed: 0.62,
			moveSpeed: 42
		},
		shard: {
			health: 28,
			contactDamage: 7,
			attackSpeed: 0.78,
			moveSpeed: 66,
			attackPattern: 'siege',
			preferredRange: 148,
			orbitSpeed: 32,
			projectileSpeed: 232,
			projectileDamage: 8,
			projectileColor: '#7ae7ff',
			projectileSize: 8
		},
		bulwark: {
			health: 88,
			contactDamage: 24,
			attackSpeed: 0.46,
			moveSpeed: 32,
			onHitShieldDuration: 1.25,
			onHitShieldCooldown: 2.1,
			onHitShieldDamageReduction: 0.7,
			shieldColor: '#ffd36b'
		},
		shielder: {
			health: 120,
			contactDamage: 0,
			attackSpeed: 0.58,
			moveSpeed: 62,
			attackPattern: 'siege',
			supportPattern: 'shield-nearest-non-bulwark',
			preferredRange: 148,
			orbitSpeed: 32,
			allyShieldAmount: 36,
			allyShieldDuration: 1.2,
			shieldColor: '#7fb7ff'
		},
		zerglitch: {
			health: 146,
			contactDamage: 26,
			attackSpeed: 0.38,
			moveSpeed: 28
		},
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
