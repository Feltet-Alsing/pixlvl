import type { LoadoutItemDefinition } from '$lib/data/types';

export const anomalyWeapons: LoadoutItemDefinition[] = [
	{
		id: 'grave-threader',
		name: 'Grave Threader',
		rarity: 'magic',
		shape: {
			width: 2,
			height: 4,
			cells: [
				[0, 0],
				[1, 0],
				[1, 1],
				[0, 2],
				[1, 2],
				[1, 3]
			]
		},
		baseDamage: 4,
		projectileSpeed: 600,
		attack: {
			kind: 'single',
			projectileCount: 2,
			pierceCount: 1,
			special: {
				type: 'life-steal-mark',
				lifeStealRatio: 0.2,
				duration: 2.4
			},
			targeting: 'strongest-target'
		},
		projectileVisual: {
			color: '#c084fc',
			size: 'small',
			shape: 'knife',
			trail: 'streak',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 4,
			stageStart: 1,
			stageEnd: 3,
			perLevelDropChance: 0.07
		},
		role: 'Magic sustain enabler that threads enemies with a short soul-leech mark, causing all allied damage into those targets to return health for a brief window'
	},
	{
		id: 'ruin-choir',
		name: 'Ruin Choir',
		rarity: 'magic',
		shape: {
			width: 4,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[1, 1],
				[2, 1]
			]
		},
		baseDamage: 5,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'vulnerable-pulse',
				maxRadius: 170,
				expansionSpeed: 500,
				lineWidth: 12,
				damageMultiplier: 1.3,
				duration: 2.5
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#f472b6',
			size: 'large',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 4,
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.05
		},
		role: 'Magic battlefield debuffer that releases a low-damage curse pulse, softening groups so every other weapon hits harder for the next few cycles'
	},
	{
		id: 'parasite-bloom',
		name: 'Parasite Bloom',
		rarity: 'rare',
		shape: {
			width: 4,
			height: 3,
			cells: [
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
		baseDamage: 8,
		projectileSpeed: 360,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'parasite-bloom',
				duration: 3.2,
				healRatio: 0.14,
				pulseRadius: 96
			},
			targeting: 'strongest-target'
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
			campaignId: 4,
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.045
		},
		role: "Rare anomaly sustain weapon that infects the strongest glitch with a short-lived parasite; if the host dies before it withers, it emits a healing pulse that restores pixl health based on the host's max health"
	},
	{
		id: 'prism-prison',
		name: 'Prism Prison',
		rarity: 'rare',
		shape: {
			width: 5,
			height: 4,
			cells: [
				[1, 0],
				[2, 0],
				[3, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[3, 1],
				[4, 1],
				[1, 2],
				[2, 2],
				[3, 2],
				[2, 3]
			]
		},
		baseDamage: 12,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'prism-prison',
				durationCycles: 1.4,
				radius: 72,
				sides: 6,
				lineWidth: 10,
				edgeHitCooldown: 0.38
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#67e8f9',
			size: 'large',
			shape: 'diamond',
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
		role: 'Rare anomaly trap weapon that drops a geometric cage over the chosen cluster; glitches that push through its edges get cut repeatedly until the prison collapses'
	},
	{
		id: 'mirror-array',
		name: 'Mirror Array',
		category: 'utility',
		rarity: 'exotic',
		shape: {
			width: 5,
			height: 4,
			cells: [
				[1, 0],
				[3, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[3, 1],
				[4, 1],
				[1, 2],
				[2, 2],
				[3, 2],
				[1, 3],
				[3, 3]
			]
		},
		activationKind: 'triggered',
		cycleInterval: 3,
		effect: {
			type: 'mirror-array',
			radiusFactor: 0.56,
			duration: 2.8,
			reflectedDamageMultiplier: 0.85,
			reflectedImpactRadius: 62
		},
		utilityVisual: {
			color: '#93c5fd',
			shape: 'ring',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 4,
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.028
		},
		role: 'Exotic anomaly reflector that marks a forward half-arena mirror; shots that pierce through or miss into the mirror rebound once as wider splash echoes'
	},
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
			perLevelDropChance: 0.06
		},
		role: 'Rare void control weapon that compresses enemies around the closest target and marks them to take more elemental damage'
	},
	{
		id: 'black-hole',
		name: 'Black Hole',
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
				[1, 2],
				[2, 2],
				[1, 3],
				[2, 3]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			requiredInfusion: 'void',
			requiredInfusionCount: 2,
			special: {
				type: 'void-tunnel',
				duration: 2,
				halfWidth: 190,
				halfHeight: 190,
				pullStrength: 300,
				debuffDuration: 3,
				elementalDamageMultiplier: 1.3
			},
			targeting: 'furthest-target'
		},
		projectileVisual: {
			color: '#a78bfa',
			size: 'large',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 4,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.06
		},
		role: 'Legendary void control weapon that consumes two void infusions to form a large black hole around the furthest target, pulling nearby glitches inward, marking them to take more elemental damage, and healing the pixl for damage dealt inside the field'
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
			perLevelDropChance: 0
		},
		role: 'Legendary control weapon currently disabled from the Campaign 4 drop pool while the design is being reworked'
	},
	{
		id: 'napalm-grenade',
		name: 'Napalm Grenade',
		rarity: 'exotic',
		shape: {
			width: 4,
			height: 3,
			cells: [
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
		baseDamage: 9,
		projectileSpeed: 280,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			motion: 'accelerate',
			requiredInfusion: 'fire',
			requiredInfusionCount: 1,
			special: {
				type: 'burning-ground',
				radius: 74,
				durationCycles: 2,
				tickInterval: 0.35,
				impactSize: 18
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#fb923c',
			size: 'large',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 4,
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.03
		},
		role: 'Exotic fire payoff weapon that leaves a persistent burn patch for two cycles after consuming one fire infusion'
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
			perLevelDropChance: 0.045
		},
		role: 'Rare temporal trap that locks nearby glitches in place for one cycle after striking the closest enemy'
	},
	{
		id: 'the-bomb',
		name: 'The Bomb',
		rarity: 'legendary',
		shape: {
			width: 2,
			height: 4,
			cells: [
				[0, 0],
				[1, 0],
				[0, 1],
				[1, 1],
				[0, 2],
				[1, 2],
				[0, 3],
				[1, 3]
			]
		},
		baseDamage: 150,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'delayed-bomb',
				radius: 96,
				detonationDelayCycles: 1,
				markerSize: 28
			},
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
			campaignId: 4,
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.015
		},
		role: 'Legendary delayed finisher that plants a bomb for one cycle before detonating for massive local damage'
	}
];
