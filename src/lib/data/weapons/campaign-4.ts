import type { LoadoutItemDefinition } from '$lib/data/types';

export const campaign4Weapons: LoadoutItemDefinition[] = [
	{
		id: 'void-tunnel',
		name: 'Void Tunnel',
		rarity: 'rare',
		shape: {
			width: 4,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[0, 2],
				[1, 2],
				[2, 2],
				[3, 2]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			requiredInfusion: 'void',
			requiredInfusionCount: 1,
			special: {
				type: 'void-tunnel',
				duration: 1.1,
				halfWidth: 190,
				halfHeight: 110,
				pullStrength: 260,
				debuffDuration: 3,
				elementalDamageMultiplier: 1.3
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#a78bfa',
			size: 'large',
			shape: 'spark',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 4,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.12
		},
		role: 'Rare void control weapon that compresses enemies around the closest target and marks them to take more elemental damage'
	},
	{
		id: 'phaseshift',
		name: 'Phaseshift',
		rarity: 'legendary',
		shape: {
			width: 6,
			height: 1,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[4, 0],
				[5, 0]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 5,
			special: {
				type: 'phaseshift',
				durationCycles: 3,
				zoneWidth: 180,
				zoneHeightRatio: 0.5,
				horizontalOffset: 180,
				teleportOffset: 50,
				slowDuration: 2,
				slowMultiplier: 0.67
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#60a5fa',
			size: 'large',
			shape: 'square',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 4,
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.04
		},
		role: 'Legendary control weapon that opens a fixed right-side teleporter lane and throws colliding glitches back outside the arena'
	},
	{
		id: 'force-field-trap',
		name: 'Force Field',
		rarity: 'rare',
		shape: {
			width: 3,
			height: 4,
			cells: [
				[1, 0],
				[0, 1],
				[2, 1],
				[0, 2],
				[2, 2],
				[1, 3]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'stasis-field',
				maxRadius: 88,
				expansionSpeed: 420,
				fieldDurationCycles: 1
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#8b5cf6',
			size: 'medium',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 4,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.09
		},
		role: 'Rare temporal trap that locks nearby glitches in place for one cycle after striking the closest enemy'
	}
];
