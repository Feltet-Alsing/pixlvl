import type { CombatProfile } from '$lib/data/types';

export const fullRosterCombatProfile: CombatProfile = {
	id: 'full-roster-v1',
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
			health: 12,
			contactDamage: 7,
			attackSpeed: 0.9,
			moveSpeed: 58
		},
		swarmer: {
			health: 9,
			contactDamage: 5,
			attackSpeed: 1.3,
			moveSpeed: 92
		},
		tanker: {
			health: 36,
			contactDamage: 13,
			attackSpeed: 0.55,
			moveSpeed: 38
		},
		shard: {
			health: 18,
			contactDamage: 5,
			attackSpeed: 0.65,
			moveSpeed: 60,
			attackPattern: 'siege',
			preferredRange: 138,
			orbitSpeed: 28,
			projectileSpeed: 212,
			projectileDamage: 6,
			projectileColor: '#7ae7ff',
			projectileSize: 8
		},
		bulwark: {
			health: 54,
			contactDamage: 18,
			attackSpeed: 0.42,
			moveSpeed: 29,
			onHitShieldDuration: 1.1,
			onHitShieldCooldown: 2.4,
			onHitShieldDamageReduction: 0.65,
			shieldColor: '#ffd36b'
		},
		shielder: {
			health: 72,
			contactDamage: 0,
			attackSpeed: 0.55,
			moveSpeed: 56,
			attackPattern: 'siege',
			supportPattern: 'shield-nearest-non-bulwark',
			preferredRange: 138,
			orbitSpeed: 28,
			allyShieldAmount: 24,
			allyShieldDuration: 1,
			shieldColor: '#7fb7ff'
		},
		zerglitch: {
			health: 108,
			contactDamage: 20,
			attackSpeed: 0.38,
			moveSpeed: 30
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
