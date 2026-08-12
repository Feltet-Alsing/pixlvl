import type { LoadoutItemDefinition } from '$lib/data/types';

export const campaign2Weapons: LoadoutItemDefinition[] = [
	{
		id: 'force-field',
		name: 'Force Field',
		rarity: 'exotic',
		shape: {
			width: 5,
			height: 5,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[4, 0],
				[0, 1],
				[4, 1],
				[0, 2],
				[4, 2],
				[0, 3],
				[4, 3],
				[0, 4],
				[1, 4],
				[2, 4],
				[3, 4],
				[4, 4]
			]
		},
		baseDamage: 14,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'force-field',
				maxRadius: 156,
				expansionSpeed: 220,
				lineWidth: 22
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#8b5cf6',
			size: 'large',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.06
		},
		role: 'Expanding 360 wave that detonates outward from the pixl and pulses once every three sweep cycles'
	},
	{
		id: 'lazer-rail',
		name: 'Lazer Rail',
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
		baseDamage: 8,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			special: {
				type: 'laser-sweep',
				duration: 1.18,
				beamLength: 260,
				beamWidth: 6
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#ef4444',
			size: 'medium',
			shape: 'spark',
			trail: 'streak',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.03
		},
		role: 'Legendary rotating beam that takes longer to complete a full accelerating sweep around the pixl'
	},
	{
		id: 'ricochet-zigzag',
		name: 'Ricochet Zigzag',
		rarity: 'rare',
		shape: {
			width: 4,
			height: 2,
			cells: [
				[0, 0],
				[1, 1],
				[2, 0],
				[3, 1]
			]
		},
		baseDamage: 6,
		projectileSpeed: 430,
		attack: {
			kind: 'single',
			projectileCount: 1,
			special: {
				type: 'ricochet',
				bounceCount: 4
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#22c55e',
			size: 'medium',
			shape: 'diamond',
			trail: 'streak',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.11
		},
		role: 'Chain-hit projectile that bounces through the nearest enemies before dissipating'
	},
	{
		id: 'arc-caster',
		name: 'Arc Caster',
		rarity: 'magic',
		shape: {
			width: 3,
			height: 2,
			cells: [
				[1, 0],
				[0, 1],
				[1, 1],
				[2, 1]
			]
		},
		baseDamage: 4,
		projectileSpeed: 420,
		attack: {
			kind: 'spread',
			projectileCount: 3,
			spreadDegrees: 14,
			motion: 'wave',
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#67e8f9',
			size: 'medium',
			shape: 'spark',
			trail: 'streak',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 1,
			stageEnd: 2,
			perLevelDropChance: 0.18
		},
		role: 'Early fan-fire weapon with a brighter projectile profile than the baseline campaign'
	},
	{
		id: 'ember-lance',
		name: 'Ember Lance',
		rarity: 'rare',
		shape: {
			width: 2,
			height: 2,
			cells: [
				[0, 1],
				[1, 0],
				[1, 1]
			]
		},
		baseDamage: 7,
		projectileSpeed: 560,
		attack: {
			kind: 'single',
			projectileCount: 1,
			motion: 'accelerate',
			pierceCount: 2,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#fb923c',
			size: 'small',
			shape: 'diamond',
			trail: 'streak',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 1,
			stageEnd: 4,
			perLevelDropChance: 0.14
		},
		role: 'Fast single-shot piercer tuned for picking off priority targets in dense waves'
	},
	{
		id: 'shiver-fork',
		name: 'Shiver Fork',
		rarity: 'normal',
		shape: {
			width: 2,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[0, 1],
				[0, 2],
				[1, 2]
			]
		},
		baseDamage: 3,
		projectileSpeed: 390,
		attack: {
			kind: 'dual',
			projectileCount: 2,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#e2e8f0',
			size: 'small',
			shape: 'diamond',
			trail: 'none'
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.26
		},
		role: 'Compact twin-shot filler that keeps up with the faster sweep tempo'
	},
	{
		id: 'pulse-array',
		name: 'Pulse Array',
		rarity: 'exotic',
		shape: {
			width: 4,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[3, 1],
				[1, 2],
				[2, 2]
			]
		},
		baseDamage: 5,
		projectileSpeed: 360,
		attack: {
			kind: 'spread',
			projectileCount: 4,
			spreadDegrees: 24,
			impactRadius: 22,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#f472b6',
			size: 'medium',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.09
		},
		role: 'Mid-campaign scatter weapon built to light up wider enemy packs'
	},
	{
		id: 'comet-rig',
		name: 'Comet Rig',
		rarity: 'rare',
		shape: {
			width: 3,
			height: 4,
			cells: [
				[1, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[0, 2],
				[1, 2],
				[2, 2],
				[1, 3]
			]
		},
		baseDamage: 8,
		projectileSpeed: 310,
		attack: {
			kind: 'dual',
			projectileCount: 2,
			motion: 'accelerate',
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#60a5fa',
			size: 'large',
			shape: 'orb',
			trail: 'streak',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.08
		},
		role: 'Heavy paired volley that makes the projectile animation read larger on screen'
	},
	{
		id: 'nova-rack',
		name: 'Nova Rack',
		rarity: 'legendary',
		shape: {
			width: 4,
			height: 4,
			cells: [
				[1, 0],
				[2, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[3, 1],
				[0, 2],
				[1, 2],
				[2, 2],
				[3, 2],
				[1, 3],
				[2, 3]
			]
		},
		baseDamage: 6,
		projectileSpeed: 340,
		attack: {
			kind: 'spread',
			projectileCount: 5,
			spreadDegrees: 30,
			impactRadius: 30,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#facc15',
			size: 'large',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 4,
			stageEnd: 5,
			perLevelDropChance: 0.02
		},
		role: 'Endgame spread battery that trades footprint for the flashiest projectile burst in the game'
	},
	{
		id: 'shield-matrix',
		name: 'Shield Matrix',
		category: 'utility',
		rarity: 'normal',
		shape: {
			width: 2,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[0, 1],
				[1, 1]
			]
		},
		activationKind: 'triggered',
		cycleInterval: 3,
		effect: {
			type: 'shield-pool',
			shieldAmount: 20,
			durationCycles: 1
		},
		utilityVisual: {
			color: '#60a5fa',
			shape: 'ring',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.16
		},
		role: 'Defensive utility that grants a temporary 20-point shield pool around the pixl'
	},
	{
		id: 'cycle-booster',
		name: 'Cycle Booster',
		category: 'utility',
		rarity: 'legendary',
		shape: {
			width: 1,
			height: 1,
			cells: [[0, 0]]
		},
		activationKind: 'passive',
		effect: {
			type: 'cycle-adjacency-reduction',
			reduction: 1,
			minimumCycleInterval: 1
		},
		utilityVisual: {
			color: '#facc15',
			shape: 'column-glow',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 5,
			stageEnd: 5,
			perLevelDropChance: 0.02
		},
		role: 'Passive utility that reduces the cycle interval of touching weapons by 1'
	},
	{
		id: 'damage-spire',
		name: 'Damage Spire',
		category: 'utility',
		rarity: 'rare',
		shape: {
			width: 1,
			height: 5,
			cells: [
				[0, 0],
				[0, 1],
				[0, 2],
				[0, 3],
				[0, 4]
			]
		},
		activationKind: 'triggered',
		cycleInterval: 4,
		effect: {
			type: 'cycle-damage-boost',
			damageMultiplier: 1.2,
			duration: 'rest-of-cycle'
		},
		utilityVisual: {
			color: '#fb7185',
			shape: 'column-glow',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 2,
			stageStart: 4,
			stageEnd: 5,
			perLevelDropChance: 0.08
		},
		role: 'Timed utility that boosts all weapon damage by 20% for the rest of the current cycle'
	}
];
