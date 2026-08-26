import type { LoadoutItemDefinition } from '$lib/data/types';

import {
	sharedProjectileVisualById,
	sharedUtilityVisualById
} from '$lib/data/visuals/shared-weapons';

export const sharedWeapons: LoadoutItemDefinition[] = [
	{
		id: 'target-painter',
		name: 'Target Painter',
		rarity: 'normal',
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
		baseDamage: 2,
		projectileSpeed: 520,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'target-painter',
				damageMultiplier: 1.35
			},
			targeting: 'strongest-target'
		},
		projectileVisual: sharedProjectileVisualById['target-painter'],
		drop: {
			mode: 'drop',
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.12
		},
		role: 'Shared focus-fire relay that keeps one enemy painted so direct hits converge on the same priority target across long waves'
	},
	{
		id: 'the-knife',
		name: 'The Knife',
		rarity: 'normal',
		shape: {
			width: 2,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[0, 1],
				[0, 2]
			]
		},
		baseDamage: 5,
		projectileSpeed: 560,
		attack: {
			kind: 'single',
			projectileCount: 3,
			special: {
				type: 'bleed-hit',
				damageRatio: 2.5,
				duration: 10
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['the-knife'],
		drop: {
			mode: 'drop',
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.13
		},
		role: 'Starter-tier bleed weapon that throws three splitter-style knives at distinct enemies and converts each hit into a heavy ten-second wound'
	},
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
		projectileVisual: sharedProjectileVisualById['pea-shooter'],
		drop: {
			mode: 'starter'
		},
		role: 'Baseline filler weapon that teaches the sweep system'
	},
	{
		id: 'the-mine',
		name: 'The Mine',
		family: 'mine',
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
		baseDamage: 8,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 1,
			special: {
				type: 'perimeter-mine',
				maxActiveMines: 10,
				placementRadius: 92,
				triggerRadius: 14,
				blastRadius: 48,
				markerSize: 14
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['the-mine'],
		drop: {
			mode: 'drop',
			stageStart: 1,
			stageEnd: 5,
			perLevelDropChance: 0.12
		},
		role: 'Normal perimeter mine that arms outside the pixl and grants all mine effects +20% damage per copy each cycle'
	},
	{
		id: 'mark-beacon',
		name: 'Mark Beacon',
		family: 'pylon',
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
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'support-pylon',
				variant: 'mark-beacon',
				radius: 92,
				fieldDurationCycles: 2.4,
				markDamageMultiplier: 1.45
			},
			targeting: 'strongest-target'
		},
		projectileVisual: sharedProjectileVisualById['mark-beacon'],
		drop: {
			mode: 'drop',
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.07
		},
		role: 'Magic support pylon that tags a forward threat zone so non-pylon weapons hit enemies inside it substantially harder'
	},
	{
		id: 'cold-lattice',
		name: 'Cold Lattice',
		family: 'pylon',
		rarity: 'magic',
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
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'support-pylon',
				variant: 'cold-lattice',
				radius: 98,
				fieldDurationCycles: 2.8,
				chillPerSecond: 0.75,
				freezeDuration: 0.5,
				pullStrength: 54
			},
			targeting: 'nearest-target'
		},
		projectileVisual: sharedProjectileVisualById['cold-lattice'],
		drop: {
			mode: 'drop',
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.07
		},
		role: 'Magic support pylon that chills and subtly compresses enemy movement inside its field so slower and area weapons connect more reliably'
	},
	{
		id: 'ember-rods',
		name: 'Ember Rods',
		family: 'laser-rod',
		rarity: 'magic',
		shape: {
			width: 1,
			height: 2,
			cells: [
				[0, 0],
				[0, 1]
			]
		},
		baseDamage: 8,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'laser-rod-network',
				variant: 'ember-rods',
				fieldDurationCycles: 4,
				lineWidth: 14,
				rodLength: 26,
				damagePerSecond: 9
			},
			targeting: 'top-middle'
		},
		projectileVisual: sharedProjectileVisualById['ember-rods'],
		drop: {
			mode: 'drop',
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.07
		},
		role: 'Magic helper rods that anchor on fixed arena slots and burn glitches crossing the links only once you have at least two rods online'
	},
	{
		id: 'coldwire-rods',
		name: 'Coldwire Rods',
		family: 'laser-rod',
		rarity: 'rare',
		shape: {
			width: 1,
			height: 2,
			cells: [
				[0, 0],
				[0, 1]
			]
		},
		baseDamage: 3,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'laser-rod-network',
				variant: 'coldwire-rods',
				fieldDurationCycles: 4,
				lineWidth: 18,
				rodLength: 28,
				damagePerSecond: 6,
				chillPerSecond: 0.85,
				freezeDuration: 0.55
			},
			targeting: 'top-left'
		},
		projectileVisual: sharedProjectileVisualById['coldwire-rods'],
		drop: {
			mode: 'drop',
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.05
		},
		role: 'Rare helper rods that weave freezing lanes across fixed anchor points so slow and splash builds can keep enemy packs pinned in transit'
	},
	{
		id: 'sunder-rods',
		name: 'Sunder Rods',
		family: 'laser-rod',
		rarity: 'rare',
		shape: {
			width: 1,
			height: 2,
			cells: [
				[0, 0],
				[0, 1]
			]
		},
		baseDamage: 5,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'laser-rod-network',
				variant: 'sunder-rods',
				fieldDurationCycles: 4.5,
				lineWidth: 20,
				rodLength: 30,
				damagePerSecond: 4,
				vulnerableDuration: 0.8
			},
			targeting: 'top-right'
		},
		projectileVisual: sharedProjectileVisualById['sunder-rods'],
		drop: {
			mode: 'drop',
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.05
		},
		role: 'Rare helper rods that score enemies crossing the link and leave them vulnerable so direct-fire follow-up weapons hit materially harder'
	},
	{
		id: 'cluster-mines',
		name: 'Cluster Mines',
		family: 'mine',
		rarity: 'magic',
		shape: {
			width: 4,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[1, 1],
				[2, 1],
				[3, 1],
				[1, 2],
				[2, 2]
			]
		},
		baseDamage: 3,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 5,
			cycleInterval: 2,
			special: {
				type: 'perimeter-mine',
				placementCount: 5,
				maxActiveMines: 15,
				placementRadius: 88,
				triggerRadius: 10,
				blastRadius: 24,
				markerSize: 8
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['cluster-mines'],
		drop: {
			mode: 'drop',
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.08
		},
		role: 'Magic mine spreader that seeds five small perimeter mines each trigger and adds +1 projectile to all mine-family weapons'
	},
	{
		id: 'mine-calibrator',
		name: 'Mine Calibrator',
		family: 'pylon',
		rarity: 'rare',
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
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'support-pylon',
				variant: 'mine-calibrator',
				radius: 88,
				fieldDurationCycles: 3.4,
				mineTriggerRadiusBonus: 8,
				mineBlastRadiusMultiplier: 1.25,
				minePayloadDamageMultiplier: 1.25
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['mine-calibrator'],
		drop: {
			mode: 'drop',
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.05
		},
		role: 'Rare support pylon that tunes mine fields in its radius, widening mine triggers and amplifying the detonation payloads that fire there'
	},
	{
		id: 'shrapnel-mine',
		name: 'Shrapnel Mine',
		family: 'mine',
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
		baseDamage: 10,
		projectileSpeed: 210,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'perimeter-mine',
				maxActiveMines: 8,
				placementRadius: 96,
				triggerRadius: 14,
				blastRadius: 34,
				markerSize: 11,
				detonationShrapnel: {
					fragmentCount: 20,
					fragmentDamageMultiplier: 0.4,
					fragmentSearchRadius: 170,
					fragmentSpeedMultiplier: 1.45
				}
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['shrapnel-mine'],
		drop: {
			mode: 'drop',
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.06
		},
		role: 'Rare mine that detonates into heavy-orb style shrapnel and gives all mines a 20% chance per copy to trigger without being consumed'
	},
	{
		id: 'hemorrhage-relay',
		name: 'Hemorrhage Relay',
		family: 'pylon',
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
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 3,
			special: {
				type: 'support-pylon',
				variant: 'hemorrhage-relay',
				radius: 94,
				fieldDurationCycles: 3,
				bleedDamageMultiplier: 1.4,
				bleedSpreadRatio: 0.35,
				bleedSpreadRadius: 82
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['hemorrhage-relay'],
		drop: {
			mode: 'drop',
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.05
		},
		role: 'Rare support pylon that intensifies bleed inside its field and relays part of each bleed tick into nearby enemies to keep knife builds spreading forward'
	},
	{
		id: 'napalm-mine',
		name: 'Napalm Mine',
		family: 'mine',
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
		baseDamage: 8,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			special: {
				type: 'perimeter-mine',
				maxActiveMines: 8,
				placementRadius: 94,
				triggerRadius: 13,
				blastRadius: 30,
				markerSize: 12,
				detonationBurningGround: {
					radius: 68,
					durationCycles: 2,
					tickInterval: 0.35,
					impactSize: 18,
					damageMultiplier: 0.8
				}
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['napalm-mine'],
		drop: {
			mode: 'drop',
			stageStart: 4,
			stageEnd: 5,
			perLevelDropChance: 0.03
		},
		role: 'Exotic mine that detonates into a persistent napalm patch, turning each trigger into lingering area denial after the initial blast'
	},
	{
		id: 'turret-mine',
		name: 'Turret Mine',
		family: 'mine',
		rarity: 'legendary',
		shape: {
			width: 5,
			height: 4,
			cells: [
				[1, 0],
				[2, 0],
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
		projectileSpeed: 260,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 4,
			special: {
				type: 'turret-mine',
				placementRadius: 118,
				turretDurationCycles: 3,
				markerSize: 13,
				maxActiveTurrets: 1,
				projectileSpeedMultiplier: 2.5,
				fallbackBlastRadius: 36
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['turret-mine'],
		drop: {
			mode: 'drop',
			stageStart: 5,
			stageEnd: 5,
			perLevelDropChance: 0.01
		},
		role: 'Legendary mine that deploys a tiny perimeter turret on the arena edge for three sweeps; while active it replicates each other mine weapon that triggers and fires that mine effect from turret position'
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
			pierceCount: Number.POSITIVE_INFINITY,
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById.blaster,
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
		id: 'kill-switch',
		name: 'Kill Switch',
		rarity: 'rare',
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
		baseDamage: 0,
		projectileSpeed: 0,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 4,
			special: {
				type: 'kill-switch',
				maxRadius: 248,
				expansionSpeed: 720,
				lineWidth: 7,
				executeThresholdRatio: 0.15
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['kill-switch'],
		drop: {
			mode: 'drop',
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.06
		},
		role: 'Shared cleanup pulse that executes already-weakened enemies in a thin outward wave instead of adding generic raw DPS'
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
		projectileVisual: sharedProjectileVisualById.needle,
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
		projectileVisual: sharedProjectileVisualById.splitter,
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
		id: 'hemorrhage-burst',
		name: 'Hemorrhage Burst',
		category: 'utility',
		rarity: 'magic',
		shape: {
			width: 2,
			height: 3,
			cells: [
				[0, 0],
				[1, 0],
				[0, 1],
				[1, 1],
				[0, 2]
			]
		},
		activationKind: 'passive',
		effect: {
			type: 'hemorrhage-burst',
			thresholdRatio: 1,
			radiusFactor: 0.18
		},
		utilityVisual: sharedUtilityVisualById['hemorrhage-burst'],
		drop: {
			mode: 'drop',
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.08
		},
		role: 'Passive rupture utility that detonates enemies whose stored bleed exceeds max health, cashing the whole wound out into a large blood explosion'
	},
	{
		id: 'mine-echo',
		name: 'Mine Echo',
		category: 'utility',
		rarity: 'magic',
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
		activationKind: 'passive',
		effect: {
			type: 'mine-trigger-echo'
		},
		utilityVisual: sharedUtilityVisualById['mine-echo'],
		drop: {
			mode: 'drop',
			stageStart: 2,
			stageEnd: 5,
			perLevelDropChance: 0.06
		},
		role: 'Large magic mine utility that duplicates each mine-family trigger once across the build; extra copies do not stack'
	},
	{
		id: 'gravity-mine-augment',
		name: 'Gravity Mine Augment',
		category: 'utility',
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
		activationKind: 'passive',
		requiredInfusion: 'void',
		requiredInfusionCount: 1,
		effect: {
			type: 'mine-gravity-augment',
			pullRadius: 76,
			pullStrength: 88
		},
		utilityVisual: sharedUtilityVisualById['gravity-mine-augment'],
		drop: {
			mode: 'drop',
			stageStart: 4,
			stageEnd: 5,
			perLevelDropChance: 0.03
		},
		role: 'Exotic void mine utility that gives each armed mine a gentle gravity field, bending nearby glitches inward whenever one void infusion is available in the current sweep'
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
		projectileVisual: sharedProjectileVisualById['heavy-orb'],
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
		id: 'fan-of-knives',
		name: 'Fan of Knives',
		rarity: 'rare',
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
		projectileSpeed: 430,
		attack: {
			kind: 'single',
			projectileCount: 18,
			cycleInterval: 2,
			special: {
				type: 'fan-knives',
				projectileCount: 18,
				radiusFactor: 0.56,
				burstArcDegrees: 360
			},
			targeting: 'current-target'
		},
		projectileVisual: sharedProjectileVisualById['fan-of-knives'],
		drop: {
			mode: 'drop',
			stageStart: 3,
			stageEnd: 5,
			perLevelDropChance: 0.06
		},
		role: 'Rare radial knife burst that fans twelve blades out from the pixl and becomes a bleed spreader when adjacent to The Knife'
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
			pierceCount: Number.POSITIVE_INFINITY,
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
		projectileVisual: sharedProjectileVisualById['tide-caster'],
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
		id: 'blood-catalyst',
		name: 'Blood Catalyst',
		category: 'utility',
		rarity: 'exotic',
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
				[0, 3]
			]
		},
		activationKind: 'passive',
		effect: {
			type: 'bleed-catalyst',
			multiplier: 2,
			maxTotalMultiplier: 6
		},
		utilityVisual: sharedUtilityVisualById['blood-catalyst'],
		drop: {
			mode: 'drop',
			stageStart: 4,
			stageEnd: 5,
			perLevelDropChance: 0.03
		},
		role: 'Exotic passive that doubles all bleed damage dealt by the build, stacking up to a total six-times multiplier'
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
				lineWidth: 2,
				maxChainTargets: 5,
				chainTargetsPerUpgrade: 2,
				maxUpgradeChainTargets: 15,
				bounceRange: 180,
				rangedOnly: true
			},
			targeting: 'furthest-target'
		},
		projectileVisual: sharedProjectileVisualById['redline-sniper'],
		drop: {
			mode: 'drop',
			campaignId: 1,
			stageStart: 5,
			stageEnd: 5,
			perLevelDropChance: 0.04
		},
		role: 'Late-campaign precision rifle that paints ranged threats, then chains between nearby ranged glitches to stabilize backline-heavy waves'
	},
	{
		id: 'deadeye-sniper',
		name: 'Deadeye Sniper',
		rarity: 'exotic',
		shape: {
			width: 5,
			height: 2,
			cells: [
				[0, 0],
				[1, 0],
				[2, 0],
				[3, 0],
				[4, 0],
				[1, 1],
				[2, 1]
			]
		},
		baseDamage: 120,
		projectileSpeed: 1100,
		attack: {
			kind: 'single',
			projectileCount: 1,
			cycleInterval: 2,
			pierceCount: 999,
			targeting: 'furthest-target'
		},
		projectileVisual: sharedProjectileVisualById['deadeye-sniper'],
		drop: {
			mode: 'drop',
			stageStart: 5,
			stageEnd: 5,
			perLevelDropChance: 0.025
		},
		role: 'Exotic pure single-target sniper that fires every two cycles for massive backline damage, piercing through the whole line without any splash or chain behavior'
	},
	{
		id: 'siphoning-knife',
		name: 'Siphoning Knife',
		category: 'utility',
		rarity: 'legendary',
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
		activationKind: 'passive',
		effect: {
			type: 'knife-siphon',
			lifeStealRatio: 0.5,
			damageMultiplier: 2
		},
		utilityVisual: sharedUtilityVisualById['siphoning-knife'],
		drop: {
			mode: 'drop',
			stageStart: 5,
			stageEnd: 5,
			perLevelDropChance: 0.015
		},
		role: 'Legendary passive that empowers Fan of Knives when it sits adjacent to both The Knife and this relic, adding heavy lifesteal and a raw damage spike'
	},
	{
		id: 'oathbreaker-sigil',
		name: 'Oathbreaker Sigil',
		category: 'utility',
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
		activationKind: 'triggered',
		cycleInterval: 3,
		effect: {
			type: 'oathbreaker-sigil',
			radiusFactor: 0.5,
			duration: 2.8,
			slowMultiplier: 0.2,
			damageShareRatio: 0.6
		},
		utilityVisual: sharedUtilityVisualById['oathbreaker-sigil'],
		drop: {
			mode: 'drop',
			stageStart: 5,
			stageEnd: 5,
			perLevelDropChance: 0.015
		},
		role: 'Legendary 3-cycle conversion keystone that chains a forward pack together, heavily slows it, and duplicates 60% of direct-hit damage across the linked enemies for a short window'
	}
];
