import type { LoadoutItemDefinition } from '$lib/data/types';

export const campaign3Weapons: LoadoutItemDefinition[] = [
	{
		id: 'aegis-leech',
		name: 'Aegis Leech',
		rarity: 'magic',
		shape: {
			width: 3,
			height: 3,
			cells: [
				[1, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[1, 2]
			]
		},
		baseDamage: 4,
		projectileSpeed: 420,
		attack: {
			kind: 'spread',
			projectileCount: 4,
			spreadDegrees: 32,
			motion: 'wave',
			special: {
				type: 'shield-steal',
				shieldRatio: 1.15
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#67e8f9',
			size: 'small',
			shape: 'spark',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 3,
			perLevelDropChance: 0.07
		},
		role: 'Magic shield-support weapon that sprays weak arc bolts and converts the damage dealt into pixl shielding, giving fragile multihit boards room to stabilize'
	},
	{
		id: 'prism-brand',
		name: 'Prism Brand',
		rarity: 'magic',
		shape: {
			width: 3,
			height: 3,
			cells: [
				[1, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[1, 2]
			]
		},
		baseDamage: 3,
		projectileSpeed: 520,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'target-painter',
				damageMultiplier: 1.4
			},
			targeting: 'strongest-target'
		},
		projectileVisual: {
			color: '#f59e0b',
			size: 'medium',
			shape: 'diamond',
			trail: 'streak',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.065
		},
		role: 'Magic focus-support weapon that brands the strongest enemy so the rest of the board collapses onto one priority target with amplified direct-hit damage'
	},
	{
		id: 'relay-torch',
		name: 'Relay Torch',
		rarity: 'magic',
		shape: {
			width: 2,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[0, 1]
			]
		},
		baseDamage: 5,
		projectileSpeed: 560,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 1,
			motion: 'accelerate',
			special: {
				type: 'next-weapon-boost',
				damageMultiplier: 1.25
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#fb7185',
			size: 'small',
			shape: 'spark',
			trail: 'streak',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.07
		},
		role: 'Magic sequencing weapon that fires often and passes a 25% damage boost forward to the next weapon in the sweep, letting combo boards stack deliberate payoffs'
	},
	{
		id: 'fire-infuser',
		name: 'Fire Infuser',
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
		cycleInterval: 1,
		effect: {
			type: 'elemental-infuser',
			element: 'fire'
		},
		utilityVisual: {
			color: '#fb923c',
			shape: 'column-glow',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.08
		},
		role: 'Normal utility that generates one fire infusion each cycle'
	},
	{
		id: 'lightning-infuser',
		name: 'Lightning Infuser',
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
		cycleInterval: 1,
		effect: {
			type: 'elemental-infuser',
			element: 'lightning'
		},
		utilityVisual: {
			color: '#fde047',
			shape: 'column-glow',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.08
		},
		role: 'Normal utility that generates one lightning infusion each cycle'
	},
	{
		id: 'cold-infuser',
		name: 'Cold Infuser',
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
		cycleInterval: 1,
		effect: {
			type: 'elemental-infuser',
			element: 'cold'
		},
		utilityVisual: {
			color: '#7dd3fc',
			shape: 'column-glow',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.08
		},
		role: 'Normal utility that generates one cold infusion each cycle'
	},
	{
		id: 'void-infuser',
		name: 'Void Infuser',
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
		cycleInterval: 1,
		effect: {
			type: 'elemental-infuser',
			element: 'void'
		},
		utilityVisual: {
			color: '#a78bfa',
			shape: 'column-glow',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.08
		},
		role: 'Normal utility that generates one void infusion each cycle'
	},
	{
		id: 'zeus-hammer',
		name: "Thor's Hammer",
		rarity: 'legendary',
		shape: {
			width: 5,
			height: 4,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[4, 0],
				[1, 1],
				[2, 1],
				[3, 1],
				[2, 2],
				[2, 3]
			]
		},
		baseDamage: 20,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			requiredInfusion: 'lightning',
			requiredInfusionCount: 3,
			special: {
				type: 'fork-lightning',
				duration: 0.18,
				branchWidth: 3
			},
			targeting: 'furthest-target'
		},
		projectileVisual: {
			color: '#fde047',
			size: 'large',
			shape: 'spark',
			glow: true,
			trail: 'streak'
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.04
		},
		role: 'Legendary lightning weapon that forks across every available enemy after consuming three lightning infusions'
	},
	{
		id: 'flamethrower',
		name: 'Flamethrower',
		rarity: 'exotic',
		shape: {
			width: 6,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[4, 0],
				[1, 1],
				[2, 1],
				[3, 1],
				[4, 1],
				[5, 1]
			]
		},
		baseDamage: 10,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 4,
			requiredInfusion: 'fire',
			special: {
				type: 'flamethrower-cone',
				durationCycles: 2,
				tickInterval: 0.2,
				reach: 190,
				coneAngleDegrees: 34
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#fb923c',
			size: 'large',
			shape: 'spark',
			glow: true,
			trail: 'pulse'
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.04
		},
		role: 'Exotic fire weapon that sustains a long red flame stream for two cycles after consuming one fire infusion'
	},
	{
		id: 'blizzard',
		name: 'Blizzard',
		rarity: 'exotic',
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
		baseDamage: 12,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			requiredInfusion: 'cold',
			special: {
				type: 'ice-shower',
				spikeCount: 28,
				durationCycles: 1,
				fallDuration: 0.6,
				impactRadius: 16,
				fullScreen: true,
				chillAmount: 0.5,
				freezeDuration: 2,
				frozenDamageMultiplier: 2,
				frozenMaxHealthDamageRatio: 0.2
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#f5f5f5',
			size: 'medium',
			shape: 'diamond',
			glow: true,
			trail: 'pulse'
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.04
		},
		role: 'Exotic cold weapon that blankets the full arena in freezing pressure, applying 50% chill and freezing enemies that reach 100% chill'
	},
	{
		id: 'void-tendrils',
		name: 'Void Tendrils',
		rarity: 'exotic',
		shape: {
			width: 5,
			height: 4,
			cells: [
				[0, 0],
				[2, 0],
				[4, 0],
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
		baseDamage: 20,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			requiredInfusion: 'void',
			special: {
				type: 'void-tendrils',
				targetCount: 4,
				healPerHit: 5,
				duration: 0.7
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#a78bfa',
			size: 'medium',
			shape: 'spark',
			glow: true,
			trail: 'streak'
		},
		drop: {
			mode: 'drop',
			campaignId: 3,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.04
		},
		role: 'Exotic void weapon that lashes four nearby enemies and heals the pixl for each successful hit'
	}
];
