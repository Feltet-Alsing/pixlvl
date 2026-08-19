import type { LoadoutItemDefinition } from '$lib/data/types';

export const campaign1Weapons: LoadoutItemDefinition[] = [
	{
		id: 'pea-shooter',
		name: 'Pea Shooter',
		rarity: 'normal',
		shape: {
			width: 3,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[0, 1],
				[1, 1],
				[2, 1]
			]
		},
		baseDamage: 5,
		projectileSpeed: 200,
		attack: {
			kind: 'single',
			projectileCount: 1,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#67d96f',
			size: 'small'
		},
		drop: {
			mode: 'starter'
		},
		role: 'Baseline filler weapon that teaches the sweep system'
	},
	{
		id: 'blaster',
		name: 'Blaster',
		rarity: 'magic',
		shape: {
			width: 4,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[3, 1],
				[0, 2],
				[1, 2]
			]
		},
		baseDamage: 6,
		projectileSpeed: 500,
		attack: {
			kind: 'single',
			projectileCount: 3,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#ff4d4d',
			size: 'large'
		},
		drop: {
			mode: 'drop',
			campaignId: 1,
			stageStart: 1,
			stageEnd: 3,
			perLevelDropChance: 0.11
		},
		role: 'Early high-impact burst upgrade that fires a fast three-shot line into the current target'
	},
	{
		id: 'needle',
		name: 'Needle',
		rarity: 'normal',
		shape: {
			width: 3,
			height: 3,
			cells: [
				[1, 0],
				[1, 1],
				[0, 2],
				[1, 2],
				[2, 2]
			]
		},
		baseDamage: 3,
		projectileSpeed: 520,
		attack: {
			kind: 'single',
			projectileCount: 3,
			special: {
				type: 'needle-fan',
				duration: 0.42,
				maxReach: 240,
				lineWidth: 1
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#f8f8f8',
			size: 'small',
			shape: 'spark',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 1,
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.14
		},
		role: 'Triple needle burst that lashes out from the pixl toward different targets before snapping back'
	},
	{
		id: 'splitter',
		name: 'Splitter',
		rarity: 'rare',
		shape: {
			width: 2,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[0, 1],
				[1, 1],
				[0, 2],
				[1, 2]
			]
		},
		baseDamage: 5,
		projectileSpeed: 340,
		attack: {
			kind: 'single',
			projectileCount: 3,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#ffd84d',
			size: 'small'
		},
		drop: {
			mode: 'drop',
			campaignId: 1,
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.07
		},
		role: 'Early splitter weapon that launches three projectiles at different enemies when available'
	},
	{
		id: 'heavy-orb',
		name: 'Heavy Orb',
		rarity: 'legendary',
		shape: {
			width: 4,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[3, 1],
				[0, 2],
				[1, 2],
				[2, 2],
				[3, 2]
			]
		},
		baseDamage: 60,
		projectileSpeed: 176,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 4,
			special: {
				type: 'shrapnel-burst',
				fragmentCount: 8,
				fragmentDamageMultiplier: 0.4,
				fragmentSearchRadius: 170,
				fragmentSpeedMultiplier: 1.45
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#d44a38',
			size: 'large',
			shape: 'orb',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 1,
			stageStart: 4,
			stageEnd: 5,
			perLevelDropChance: 0.03
		},
		role: 'Legendary heavy orb that locks onto its spawned target, slowly homes in, and cracks on impact into heavy shrapnel'
	},
	{
		id: 'tide-caster',
		name: 'Tide Caster',
		rarity: 'rare',
		shape: {
			width: 4,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[1, 1],
				[2, 1],
				[2, 2],
				[3, 2]
			]
		},
		baseDamage: 6,
		projectileSpeed: 260,
		attack: {
			kind: 'single',
			projectileCount: 1,
			impactRadius: 32,
			special: {
				type: 'expanding-wave',
				sizeGrowth: 42,
				maxSize: 38,
				impactRadiusGrowth: 96,
				maxImpactRadius: 124
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#67e8f9',
			size: 'medium',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 1,
			stageStart: 4,
			stageEnd: 5,
			perLevelDropChance: 0.05
		},
		role: 'Late-campaign rare that launches a swelling wave orb whose hit zone expands the farther it travels'
	},
	{
		id: 'redline-sniper',
		name: 'Redline Sniper',
		rarity: 'rare',
		shape: {
			width: 5,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[4, 0],
				[2, 1],
				[3, 1]
			]
		},
		baseDamage: 30,
		projectileSpeed: 900,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 1,
			special: {
				type: 'sniper-line',
				chargeDuration: 0.45,
				lineWidth: 2
			},
			targeting: 'furthest-target'
		},
		projectileVisual: {
			color: '#ef4444',
			size: 'small',
			shape: 'spark',
			trail: 'streak',
			glow: true
		},
		drop: {
			mode: 'drop',
			campaignId: 1,
			stageStart: 5,
			stageEnd: 5,
			perLevelDropChance: 0.04
		},
		role: 'Late-campaign precision rifle that paints the furthest glitch with a red lock line before firing a heavy delayed shot'
	}
];
