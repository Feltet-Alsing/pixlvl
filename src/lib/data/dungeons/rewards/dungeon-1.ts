import type { LoadoutItemDefinition } from '$lib/data/types';

import {
	sharedProjectileVisualById,
	sharedUtilityVisualById
} from '$lib/data/visuals/shared-weapons';

export const dungeon1RewardDefinitions: LoadoutItemDefinition[] = [
	{
		id: 'sun-rune',
		name: 'Sun Rune',
		rarity: 'normal',
		rewardMarker: 'ancient',
		shape: {
			width: 3,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[0, 1],
				[2, 1],
				[1, 2]
			]
		},
		baseDamage: 6,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'sun-rune',
				radius: 1,
				durationCycles: 0.67,
				tickInterval: 1,
				impactSize: 14,
				castDuration: 0.32
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['sun-rune'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient normal rune that marks a Nordic cast above the pixl, then sends repeated solar pulses outward from the pixl across the full arena'
	},
	{
		id: 'healing-rune',
		name: 'Healing Rune',
		rarity: 'normal',
		rewardMarker: 'ancient',
		shape: {
			width: 4,
			height: 4,
			cells: [
				[0, 0],
				[1, 1],
				[2, 1],
				[1, 2],
				[3, 2],
				[2, 3]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'healing-rune',
				healFlat: 15,
				healMaxHealthRatio: 0.15,
				durationCycles: 0.75,
				maxRadiusFactor: 0.28,
				castDuration: 0.32
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['healing-rune'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient normal sustain rune that marks a restoration rune above the pixl, then restores 15% of max health plus 15 flat in a short healing bloom'
	},
	{
		id: 'sunbrand-rune',
		name: 'Sunbrand Rune',
		rarity: 'magic',
		rewardMarker: 'ancient',
		shape: {
			width: 4,
			height: 3,
			cells: [
				[1, 0],
				[2, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[1, 2],
				[2, 2]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'sunbrand-rune',
				radius: 1,
				durationCycles: 0.78,
				brandDurationCycles: 2,
				burstBaseDamage: 15,
				triggerDamageMultiplier: 1.3,
				impactSize: 15,
				castDuration: 0.32
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['sunbrand-rune'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient magic rune that sends a branding lightwave from the pixl, marking all enemies hit for 2 cycles; the next direct hit on a branded enemy triggers a burst for 15 plus 1.3x the triggering hit'
	},
	{
		id: 'binding-rune',
		name: 'Binding Rune',
		rarity: 'magic',
		rewardMarker: 'ancient',
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
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'binding-rune',
				radius: 1,
				durationCycles: 0.8,
				damageMultiplierPerHit: 1.33,
				impactSize: 15,
				castDuration: 0.32
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['binding-rune'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient magic binding rune that marks enemies hit with a persistent rune until death; each consecutive direct hit against that specific target ramps damage by x1.33 again'
	},
	{
		id: 'rune-reiterator',
		name: 'Rune Reiterator',
		rarity: 'rare',
		rewardMarker: 'ancient',
		shape: {
			width: 3,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[1, 2],
				[2, 2]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 5,
			special: {
				type: 'rune-reiterator',
				replayDelay: 0.2,
				castDuration: 0.36
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['rune-reiterator'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient rare payoff rune that, on a 5-cycle cooldown, replays every rune activated earlier in the current sweep one after another with a 0.2 second delay between casts'
	},
	{
		id: 'ascendance-rune',
		name: 'Ascendance Rune',
		rarity: 'rare',
		rewardMarker: 'ancient',
		shape: {
			width: 6,
			height: 2,
			cells: [
				[0, 0],
				[2, 0],
				[3, 0],
				[5, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[3, 1],
				[4, 1],
				[5, 1]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 1,
			special: {
				type: 'ascendance-rune',
				requiredUniqueRuneCount: 4,
				damageMultiplier: 2,
				buffDurationCycles: 2,
				successCooldownCycles: 4,
				castDuration: 0.4
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['ascendance-rune'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient rare ritual rune that only fires after 4 different runes have already triggered earlier in the sweep; on success it fully heals the pixl, doubles all weapon damage for 2 cycles, and then goes on a 4-cycle cooldown'
	},
	{
		id: 'judgment-rune',
		name: 'Judgment Rune',
		rarity: 'rare',
		rewardMarker: 'ancient',
		shape: {
			width: 3,
			height: 4,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[0, 2],
				[0, 3]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'judgment-rune',
				baseDamagePerTick: 3,
				damageGrowthPerCycle: 2,
				maxBaseDamagePerTick: 9,
				tickInterval: 0.1,
				damageMultiplierPerTriggeredRune: 0.3,
				minTriggeredRuneCountToRefresh: 5,
				orbitRadius: 128,
				damageRadius: 78,
				sunRadius: 20,
				orbitsPerCycle: 0.45,
				baseDurationCycles: 1,
				durationCyclesPerUniqueRune: 1,
				castDuration: 0.34
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['judgment-rune'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient rare solar finisher rune that, every 3 cycles, conjures a single orbiting sun around the pixl that deals 3 damage every tenth of a second to glitches in its perimeter, gains +0.3x damage for each rune already triggered before the cast, grows by +2 base damage after each cycle to a cap of 9, and only refreshes its persistent duration when at least 5 runes were triggered before the cast'
	},
	{
		id: 'stone-ward',
		name: 'Stone Ward',
		category: 'utility',
		rarity: 'magic',
		rewardMarker: 'ancient',
		shape: {
			width: 3,
			height: 3,
			cells: [
				[1, 0],
				[0, 1],
				[2, 1],
				[1, 2]
			]
		},
		activationKind: 'triggered',
		cycleInterval: 3,
		startCharged: true,
		effect: {
			type: 'shield-pool',
			shieldPercent: 0.1
		},
		utilityVisual: sharedUtilityVisualById['stone-ward'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient magic ward utility that starts charged and wraps the pixl in a stone ring shield equal to an effective 20% of max health, then recharges every 3 cycles'
	},
	{
		id: 'idol-of-echoes',
		name: 'Idol of Echoes',
		rarity: 'magic',
		rewardMarker: 'ancient',
		uniquePerLoadout: true,
		shape: {
			width: 3,
			height: 4,
			cells: [
				[1, 0],
				[0, 1],
				[2, 1],
				[1, 2],
				[1, 3],
				[0, 3],
				[2, 3]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 1,
			special: {
				type: 'idol-of-echoes',
				echoDelay: 0.2,
				echoEfficiency: 0.35
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['idol-of-echoes'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient magic idol that passively causes other rune triggers to echo 0.2 seconds later at 35% efficiency'
	},
	{
		id: 'slowing-rune',
		name: 'Slowing Rune',
		rarity: 'normal',
		rewardMarker: 'ancient',
		shape: {
			width: 3,
			height: 3,
			cells: [
				[1, 0],
				[0, 1],
				[1, 1],
				[2, 1],
				[1, 2],
				[2, 2]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'slowing-rune',
				radius: 1,
				durationCycles: 0.72,
				slowDurationCycles: 1,
				slowMultiplier: 0.5,
				impactSize: 14,
				castDuration: 0.32
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['slowing-rune'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient normal control rune that marks a control rune above the pixl, then sends a slowing lightwave outward that cuts enemy move speed by 50% for 1 cycle'
	},
	{
		id: 'vanish-rune',
		name: 'Vanish Rune',
		category: 'utility',
		rarity: 'exotic',
		rewardMarker: 'ancient',
		shape: {
			width: 3,
			height: 3,
			cells: [
				[1, 0],
				[0, 1],
				[2, 1],
				[1, 2]
			]
		},
		activationKind: 'triggered',
		cycleInterval: 1,
		effect: {
			type: 'vanish-rune',
			requiredUniqueRuneCount: 2,
			durationCycles: 2,
			successCooldownCycles: 4
		},
		utilityVisual: sharedUtilityVisualById['vanish-rune'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient exotic utility rune that requires 2 unique runes to have already triggered, then makes the pixl intangible for 1 turn and goes on a 2-cycle cooldown after a successful cast'
	},
	{
		id: 'natures-wrath',
		name: "Nature's Wrath",
		rarity: 'exotic',
		rewardMarker: 'ancient',
		shape: {
			width: 5,
			height: 4,
			cells: [
				[2, 0],
				[1, 1],
				[2, 1],
				[3, 1],
				[0, 2],
				[1, 2],
				[2, 2],
				[3, 2],
				[4, 2],
				[1, 3],
				[3, 3]
			]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 1,
			special: {
				type: 'natures-wrath',
				latchDuration: 0.38,
				healPulseRatio: 0.1,
				pulseInterval: 0.5,
				durationCycles: 3,
				successCooldownCycles: 2
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['natures-wrath'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient exotic sustain spell that captures a single non-boss glitch for 3 cycles, sends restorative pulses that heal 10% max health twice per second, then consumes the captive and goes on a 2-cycle cooldown'
	},
	{
		id: 'the-ascender',
		name: 'The Ascender',
		rarity: 'legendary',
		rewardMarker: 'ancient',
		uniquePerLoadout: true,
		shape: {
			width: 1,
			height: 1,
			cells: [[0, 0]]
		},
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 0,
			cycleInterval: 1,
			special: {
				type: 'pea-ascender'
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['the-ascender'],
		drop: {
			mode: 'dungeon-pack',
			dungeonId: 1
		},
		role: 'Ancient legendary ascension frame that transforms every equipped Pea Shooter from a sweep-fired projectile into a continuous lightning beam with no cooldown'
	}
];
