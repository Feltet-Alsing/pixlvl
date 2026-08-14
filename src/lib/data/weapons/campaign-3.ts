import type { LoadoutItemDefinition } from '$lib/data/types';

export const campaign3Weapons: LoadoutItemDefinition[] = [
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
			perLevelDropChance: 0.16
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
			perLevelDropChance: 0.16
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
			perLevelDropChance: 0.16
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
			perLevelDropChance: 0.16
		},
		role: 'Normal utility that generates one void infusion each cycle'
	},
	{
		id: 'zeus-hammer',
		name: 'Zeus Hammer',
		rarity: 'exotic',
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
		baseDamage: 35,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			requiredInfusion: 'lightning',
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
			perLevelDropChance: 0.08
		},
		role: 'Exotic lightning weapon that forks across every available enemy after consuming one lightning infusion'
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
			perLevelDropChance: 0.08
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
				spikeCount: 20,
				durationCycles: 1,
				fallDuration: 0.48,
				impactRadius: 16
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
			perLevelDropChance: 0.08
		},
		role: 'Exotic cold weapon that rains ten ice spikes across the arena after consuming one cold infusion'
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
			perLevelDropChance: 0.08
		},
		role: 'Exotic void weapon that lashes four nearby enemies and heals the pixl for each successful hit'
	}
];
