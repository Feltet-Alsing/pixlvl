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
		},
		shielder: {
			health: 52,
			contactDamage: 0,
			attackSpeed: 0.45,
			moveSpeed: 28,
			attackPattern: 'siege',
			supportPattern: 'shield-nearest-non-bulwark',
			preferredRange: 138,
			orbitSpeed: 24,
			allyShieldAmount: 16,
			allyShieldDuration: 1,
			shieldColor: '#7fb7ff'
		},
		soldier: {
			health: 18,
			contactDamage: 16,
			attackSpeed: 1.4,
			moveSpeed: 108
		},
		golem: {
			health: 240,
			contactDamage: 24,
			attackSpeed: 0.4,
			moveSpeed: 12
		},
		sunpriest: {
			health: 54,
			contactDamage: 6,
			attackSpeed: 0.45,
			moveSpeed: 30,
			attackPattern: 'siege',
			supportPattern: 'heal-frontline-ally',
			preferredRange: 168,
			orbitSpeed: 18,
			projectileSpeed: 185,
			projectileDamage: 16,
			projectileColor: '#ffd36b',
			projectileSize: 12,
			allyHealRatio: 0.5
		},
		zerglitch: {
			health: 90,
			contactDamage: 18,
			attackSpeed: 0.4,
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
		},
		'high-priest': {
			health: 4200,
			contactDamage: 20,
			attackSpeed: 0.3,
			moveSpeed: 18,
			attackPattern: 'beam',
			supportPattern: 'heal-frontline-ally',
			preferredRange: 192,
			orbitSpeed: 14,
			beamColor: '#ffd36b',
			beamWidth: 22,
			beamDamage: 28,
			beamDuration: 2.4,
			beamTickInterval: 0.24,
			allyHealRatio: 0.5
		}
	}
};
