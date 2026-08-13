import type { WeaponDefinition } from './types';

const shopPrices = {
	normal: 50,
	magic: 250,
	rare: 1000,
	exotic: 5000,
	legendary: 25000
} as const;

export const campaign1ShopWeapons: WeaponDefinition[] = [
	{
		id: 'shop-skyrake',
		name: 'Skyrake',
		rarity: 'normal',
		shape: {
			width: 3,
			height: 1,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0]
			]
		},
		baseDamage: 6,
		projectileSpeed: 640,
		attack: {
			kind: 'single',
			projectileCount: 1,
			targeting: 'furthest-target'
		},
		projectileVisual: {
			color: '#8bd3ff',
			size: 'small',
			shape: 'spark',
			trail: 'streak'
		},
		drop: { mode: 'shop', campaignId: 1 },
		shop: { campaignId: 1, price: shopPrices.normal },
		role: 'Shop-exclusive anti-ranged pick that snaps to the furthest target before melee pressure reaches the pixl'
	},
	{
		id: 'shop-crowd-slicer',
		name: 'Crowd Slicer',
		rarity: 'normal',
		shape: {
			width: 3,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[1, 1],
				[2, 1]
			]
		},
		baseDamage: 4,
		projectileSpeed: 360,
		attack: {
			kind: 'spread',
			projectileCount: 3,
			spreadDegrees: 24,
			motion: 'wave',
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#7ef29a',
			size: 'small',
			shape: 'diamond',
			trail: 'streak'
		},
		drop: { mode: 'shop', campaignId: 1 },
		shop: { campaignId: 1, price: shopPrices.normal },
		role: 'Shop-exclusive anti-swarm spreader that widens basic crowd control without waiting for lucky drops'
	},
	{
		id: 'shop-hullcracker',
		name: 'Hullcracker',
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
		baseDamage: 18,
		projectileSpeed: 520,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			pierceCount: 1,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#ffb36a',
			size: 'medium',
			shape: 'diamond',
			trail: 'streak',
			glow: true
		},
		drop: { mode: 'shop', campaignId: 1 },
		shop: { campaignId: 1, price: shopPrices.magic },
		role: 'Shop-exclusive anti-tank puncher that trades cadence for reliable frontliner damage'
	},
	{
		id: 'shop-panic-button',
		name: 'Panic Button',
		rarity: 'rare',
		shape: {
			width: 1,
			height: 4,
			cells: [
				[0, 0],
				[0, 1],
				[0, 2],
				[0, 3]
			]
		},
		baseDamage: 5,
		projectileSpeed: 760,
		attack: {
			kind: 'dual',
			projectileCount: 2,
			cycleInterval: 1,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#fff27a',
			size: 'small',
			shape: 'spark',
			trail: 'streak',
			glow: true
		},
		drop: { mode: 'shop', campaignId: 1 },
		shop: { campaignId: 1, price: shopPrices.rare },
		role: 'Shop-exclusive leak prevention tool built for fast cleanup when swarmers start slipping through'
	},
	{
		id: 'shop-orbit-breaker',
		name: 'Orbit Breaker',
		rarity: 'exotic',
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
		baseDamage: 12,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			special: {
				type: 'laser-sweep',
				duration: 1.08,
				beamLength: 280,
				beamWidth: 7
			},
			targeting: 'furthest-target'
		},
		projectileVisual: {
			color: '#fb7185',
			size: 'medium',
			shape: 'spark',
			trail: 'streak',
			glow: true
		},
		drop: { mode: 'shop', campaignId: 1 },
		shop: { campaignId: 1, price: shopPrices.exotic },
		role: 'Shop-exclusive backline breaker that sweeps outward to catch furthest threats before they stack pressure'
	}
];

export const campaign2ShopWeapons: WeaponDefinition[] = [
	{
		id: 'shop-shard-screen',
		name: 'Shard Screen',
		rarity: 'normal',
		shape: {
			width: 2,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[1, 1]
			]
		},
		baseDamage: 5,
		projectileSpeed: 680,
		attack: {
			kind: 'dual',
			projectileCount: 2,
			targeting: 'furthest-target'
		},
		projectileVisual: {
			color: '#9ae6ff',
			size: 'small',
			shape: 'spark',
			trail: 'streak'
		},
		drop: { mode: 'shop', campaignId: 2 },
		shop: { campaignId: 2, price: shopPrices.normal },
		role: 'Shop-exclusive response to shard pressure that keeps outer-ring ranged threats from free-casting'
	},
	{
		id: 'shop-bulwark-saw',
		name: 'Bulwark Saw',
		rarity: 'normal',
		shape: {
			width: 3,
			height: 1,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0]
			]
		},
		baseDamage: 8,
		projectileSpeed: 470,
		attack: {
			kind: 'single',
			projectileCount: 1,
			pierceCount: 2,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#d6f36b',
			size: 'small',
			shape: 'diamond',
			trail: 'streak'
		},
		drop: { mode: 'shop', campaignId: 2 },
		shop: { campaignId: 2, price: shopPrices.normal },
		role: 'Shop-exclusive sustained cutter for bulwarks and tankers that try to stall the front line'
	},
	{
		id: 'shop-scatter-mine',
		name: 'Scatter Mine',
		rarity: 'magic',
		shape: {
			width: 3,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[1, 1]
			]
		},
		baseDamage: 7,
		projectileSpeed: 240,
		attack: {
			kind: 'single',
			projectileCount: 1,
			impactRadius: 36,
			special: {
				type: 'expanding-wave',
				sizeGrowth: 46,
				maxSize: 40,
				impactRadiusGrowth: 104,
				maxImpactRadius: 132
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#7cf3d0',
			size: 'medium',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: { mode: 'shop', campaignId: 2 },
		shop: { campaignId: 2, price: shopPrices.magic },
		role: 'Shop-exclusive anti-swarm mine that expands on contact to stabilize dense mid-screen packs'
	},
	{
		id: 'shop-pinion-rail',
		name: 'Pinion Rail',
		rarity: 'rare',
		shape: {
			width: 5,
			height: 1,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[4, 0]
			]
		},
		baseDamage: 24,
		projectileSpeed: 960,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'sniper-line',
				chargeDuration: 0.35,
				lineWidth: 2
			},
			targeting: 'furthest-target'
		},
		projectileVisual: {
			color: '#ff8c69',
			size: 'small',
			shape: 'spark',
			trail: 'streak',
			glow: true
		},
		drop: { mode: 'shop', campaignId: 2 },
		shop: { campaignId: 2, price: shopPrices.rare },
		role: 'Shop-exclusive priority killer that reaches shards and supports before frontline noise can body-block them'
	},
	{
		id: 'shop-null-halo',
		name: 'Null Halo',
		rarity: 'legendary',
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
		baseDamage: 12,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'force-field',
				maxRadius: 176,
				expansionSpeed: 250,
				lineWidth: 8,
				burstCount: 3,
				offsetDistance: 0,
				burstDelay: 0.192
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#f5f5f5',
			size: 'large',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: { mode: 'shop', campaignId: 2 },
		shop: { campaignId: 2, price: shopPrices.legendary },
		role: 'Shop-exclusive panic reset that converts Scrap into a full-screen answer when ranged and swarm pressure overlap'
	}
];

export const campaign3ShopWeapons: WeaponDefinition[] = [
	{
		id: 'shop-shield-needle',
		name: 'Shield Needle',
		rarity: 'normal',
		shape: {
			width: 2,
			height: 2,
			cells: [
				[1, 0],
				[0, 1],
				[1, 1]
			]
		},
		baseDamage: 7,
		projectileSpeed: 820,
		attack: {
			kind: 'single',
			projectileCount: 1,
			targeting: 'furthest-target'
		},
		projectileVisual: {
			color: '#c4b5fd',
			size: 'small',
			shape: 'spark',
			trail: 'streak'
		},
		drop: { mode: 'shop', campaignId: 3 },
		shop: { campaignId: 3, price: shopPrices.normal },
		role: 'Shop-exclusive answer to shielders and backline supports that hides no ambiguity about its target priority'
	},
	{
		id: 'shop-breaker-fan',
		name: 'Breaker Fan',
		rarity: 'normal',
		shape: {
			width: 3,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[0, 1],
				[2, 1]
			]
		},
		baseDamage: 5,
		projectileSpeed: 420,
		attack: {
			kind: 'spread',
			projectileCount: 4,
			spreadDegrees: 18,
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#86efac',
			size: 'small',
			shape: 'diamond',
			trail: 'streak'
		},
		drop: { mode: 'shop', campaignId: 3 },
		shop: { campaignId: 3, price: shopPrices.normal },
		role: 'Shop-exclusive cleanup fan for screens where shield support lets swarm pressure pile up too long'
	},
	{
		id: 'shop-crowd-anchor',
		name: 'Crowd Anchor',
		rarity: 'magic',
		shape: {
			width: 4,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[1, 1],
				[2, 1],
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
				bounceCount: 5
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#60a5fa',
			size: 'medium',
			shape: 'diamond',
			trail: 'streak',
			glow: true
		},
		drop: { mode: 'shop', campaignId: 3 },
		shop: { campaignId: 3, price: shopPrices.magic },
		role: 'Shop-exclusive chain clearer that stabilizes crowded waves after shielded frontliners start stacking'
	},
	{
		id: 'shop-siege-pulse',
		name: 'Siege Pulse',
		rarity: 'rare',
		shape: {
			width: 4,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[0, 1],
				[2, 1],
				[1, 2],
				[2, 2]
			]
		},
		baseDamage: 9,
		projectileSpeed: 250,
		attack: {
			kind: 'single',
			projectileCount: 1,
			impactRadius: 34,
			special: {
				type: 'expanding-wave',
				sizeGrowth: 38,
				maxSize: 34,
				impactRadiusGrowth: 112,
				maxImpactRadius: 144
			},
			targeting: 'current-target'
		},
		projectileVisual: {
			color: '#fca5a5',
			size: 'medium',
			shape: 'orb',
			trail: 'pulse',
			glow: true
		},
		drop: { mode: 'shop', campaignId: 3 },
		shop: { campaignId: 3, price: shopPrices.rare },
		role: 'Shop-exclusive siege answer that breaks shielded frontlines by turning sustained contact into layered AOE'
	},
	{
		id: 'shop-execution-lattice',
		name: 'Execution Lattice',
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
				[3, 1],
				[1, 2],
				[2, 2]
			]
		},
		baseDamage: 30,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'execution-lattice',
				targetCount: 5,
				dropHeight: 92,
				dropDuration: 0.5,
				markerSize: 8
			},
			targeting: 'furthest-target'
		},
		projectileVisual: {
			color: '#ef4444',
			size: 'medium',
			shape: 'spark',
			glow: true,
			trail: 'streak'
		},
		drop: { mode: 'shop', campaignId: 3 },
		shop: { campaignId: 3, price: shopPrices.legendary },
		role: 'Shop-exclusive execution strike that marks the five furthest enemies and drops a 30-damage triangle on each'
	}
];

export const shopWeaponPools = {
	1: campaign1ShopWeapons,
	2: campaign2ShopWeapons,
	3: campaign3ShopWeapons
} as const;

export const shopWeaponDefinitions = Object.fromEntries(
	Object.values(shopWeaponPools)
		.flat()
		.map((item) => [item.id, item])
);
