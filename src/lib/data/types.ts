export type GlitchKind =
	| 'biter'
	| 'swarmer'
	| 'tanker'
	| 'shard'
	| 'bulwark'
	| 'shielder'
	| 'zerglitch'
	| 'boss-melee'
	| 'boss-ranged'
	| 'boss-hybrid';

export type WeaponRarity = 'normal' | 'magic' | 'rare' | 'exotic' | 'legendary';

export type WeaponAttackKind = 'single' | 'dual' | 'spread';

export type WeaponProjectileSize = 'small' | 'medium' | 'large';

export type WeaponProjectileShape = 'square' | 'diamond' | 'orb' | 'spark' | 'knife';

export type WeaponTrailStyle = 'none' | 'streak' | 'pulse';

export type WeaponProjectileMotion = 'straight' | 'wave' | 'accelerate';

export type LoadoutRotation = 0 | 1 | 2 | 3;

export type ElementalInfusionType = 'fire' | 'lightning' | 'cold' | 'void';

export type WeaponSpecialAttackKind =
	| 'judgment-rune'
	| 'ascendance-rune'
	| 'rune-reiterator'
	| 'binding-rune'
	| 'sunbrand-rune'
	| 'idol-of-echoes'
	| 'slowing-rune'
	| 'healing-rune'
	| 'sun-rune'
	| 'force-field'
	| 'laser-sweep'
	| 'knife-sheath'
	| 'laser-rod-network'
	| 'perimeter-mine'
	| 'turret-mine'
	| 'support-pylon'
	| 'ricochet'
	| 'life-steal-mark'
	| 'kill-switch'
	| 'target-painter'
	| 'needle-fan'
	| 'expanding-wave'
	| 'sniper-line'
	| 'shrapnel-burst'
	| 'execution-lattice'
	| 'fork-lightning'
	| 'flamethrower-cone'
	| 'ice-shower'
	| 'void-tendrils'
	| 'void-tunnel'
	| 'phaseshift'
	| 'stasis-field'
	| 'vulnerable-pulse';

export type WeaponTargetingKind =
	| 'current-target'
	| 'nearest-target'
	| 'furthest-target'
	| 'strongest-target'
	| 'weakest-target'
	| 'top-left'
	| 'top-middle'
	| 'top-right'
	| 'middle-left'
	| 'middle-right'
	| 'bottom-left'
	| 'bottom-middle'
	| 'bottom-right';

export type VanishRuneCycleTarget = 'cycle-1' | 'cycle-2' | 'cycle-3' | 'cycle-4';

export type LoadoutPlacementTargetingKind = WeaponTargetingKind | VanishRuneCycleTarget;

export interface PixlBaseStats {
	health: number;
	attackSpeed: number;
}

export interface CollisionConfig {
	pixlRadius: number;
	enemyRadius: number;
	contactRange: number;
}

export interface GlitchStats {
	health: number;
	contactDamage: number;
	attackSpeed: number;
	moveSpeed: number;
	attackPattern?: 'melee' | 'siege' | 'hybrid' | 'beam';
	supportPattern?: 'shield-nearest-non-bulwark' | 'heal-frontline-ally';
	preferredRange?: number;
	orbitSpeed?: number;
	projectileSpeed?: number;
	projectileDamage?: number;
	projectileColor?: string;
	projectileSize?: number;
	allyShieldAmount?: number;
	allyShieldDuration?: number;
	allyHealAmount?: number;
	allyHealRatio?: number;
	onHitShieldDuration?: number;
	onHitShieldCooldown?: number;
	onHitShieldDamageReduction?: number;
	beamColor?: string;
	beamWidth?: number;
	beamDamage?: number;
	beamDuration?: number;
	beamTickInterval?: number;
	shieldColor?: string;
}

export type DungeonExclusiveEnemyKind = 'golem' | 'sunpriest' | 'soldier' | 'high-priest';

export type CombatEnemyKind = GlitchKind | DungeonExclusiveEnemyKind;

export interface CombatProfile {
	id: string;
	pixl: PixlBaseStats;
	projectileSpeed: number;
	collision: CollisionConfig;
	glitches: Record<GlitchKind, GlitchStats> &
		Partial<Record<DungeonExclusiveEnemyKind, GlitchStats>>;
}

export interface WeaponShape {
	width: number;
	height: number;
	cells: Array<[number, number]>;
}

export interface WeaponProjectileVisual {
	color: string;
	size: WeaponProjectileSize;
	shape?: WeaponProjectileShape;
	trail?: WeaponTrailStyle;
	glow?: boolean;
}

export interface WeaponAttackBehavior {
	kind: WeaponAttackKind;
	projectileCount: number;
	cycleInterval?: number;
	spreadDegrees?: number;
	motion?: WeaponProjectileMotion;
	pierceCount?: number;
	impactRadius?: number;
	requiredInfusion?: ElementalInfusionType;
	requiredInfusionCount?: number;
	special?:
		| {
				type: 'judgment-rune';
				baseDamagePerTick: number;
				damageGrowthPerCycle: number;
				maxBaseDamagePerTick: number;
				tickInterval: number;
				damageMultiplierPerTriggeredRune: number;
				minTriggeredRuneCountToRefresh: number;
				orbitRadius: number;
				damageRadius: number;
				sunRadius: number;
				orbitsPerCycle: number;
				baseDurationCycles: number;
				durationCyclesPerUniqueRune: number;
				castDuration: number;
		  }
		| {
				type: 'ascendance-rune';
				requiredUniqueRuneCount: number;
				damageMultiplier: number;
				buffDurationCycles: number;
				successCooldownCycles: number;
				castDuration: number;
		  }
		| {
				type: 'rune-reiterator';
				replayDelay: number;
				castDuration: number;
		  }
		| {
				type: 'binding-rune';
				radius: number;
				durationCycles: number;
				damageMultiplierPerHit: number;
				impactSize: number;
				castDuration: number;
		  }
		| {
				type: 'sunbrand-rune';
				radius: number;
				durationCycles: number;
				brandDurationCycles: number;
				burstBaseDamage: number;
				triggerDamageMultiplier: number;
				impactSize: number;
				castDuration: number;
		  }
		| {
				type: 'idol-of-echoes';
				echoDelay: number;
				echoEfficiency: number;
		  }
		| {
				type: 'slowing-rune';
				radius: number;
				durationCycles: number;
				slowDurationCycles: number;
				slowMultiplier: number;
				impactSize: number;
				castDuration: number;
		  }
		| {
				type: 'healing-rune';
				healFlat: number;
				healMaxHealthRatio: number;
				durationCycles: number;
				maxRadiusFactor: number;
				castDuration: number;
		  }
		| {
				type: 'sun-rune';
				radius: number;
				durationCycles: number;
				tickInterval: number;
				impactSize: number;
				castDuration: number;
		  }
		| {
				type: 'natures-wrath';
				latchDuration: number;
				healPulseRatio: number;
				pulseInterval: number;
				durationCycles: number;
				successCooldownCycles: number;
		  }
		| {
				type: 'pea-ascender';
		  }
		| {
				type: 'knife-sheath';
		  }
		| {
				type: 'laser-rod-network';
				variant: 'ember-rods' | 'coldwire-rods' | 'sunder-rods';
				fieldDurationCycles: number;
				lineWidth: number;
				rodLength: number;
				damagePerSecond?: number;
				chillPerSecond?: number;
				freezeDuration?: number;
				fireDamageMultiplier?: number;
				fireDebuffDuration?: number;
				vulnerableDuration?: number;
		  }
		| {
				type: 'perimeter-mine';
				placementCount?: number;
				maxActiveMines?: number;
				placementRadius: number;
				triggerRadius: number;
				blastRadius: number;
				markerSize: number;
				detonationBurningGround?: {
					radius: number;
					durationCycles: number;
					tickInterval: number;
					impactSize: number;
					damageMultiplier?: number;
				};
				detonationShrapnel?: {
					fragmentCount: number;
					fragmentDamageMultiplier: number;
					fragmentSearchRadius: number;
					fragmentSpeedMultiplier: number;
				};
		  }
		| {
				type: 'turret-mine';
				placementRadius: number;
				turretDurationCycles: number;
				markerSize: number;
				maxActiveTurrets?: number;
				projectileSpeedMultiplier?: number;
				fallbackBlastRadius?: number;
		  }
		| {
				type: 'support-pylon';
				variant: 'mark-beacon' | 'cold-lattice' | 'mine-calibrator' | 'hemorrhage-relay';
				radius: number;
				fieldDurationCycles: number;
				markDamageMultiplier?: number;
				chillPerSecond?: number;
				freezeDuration?: number;
				pullStrength?: number;
				mineTriggerRadiusBonus?: number;
				mineBlastRadiusMultiplier?: number;
				minePayloadDamageMultiplier?: number;
				bleedDamageMultiplier?: number;
				bleedSpreadRatio?: number;
				bleedSpreadRadius?: number;
		  }
		| {
				type: 'force-field';
				maxRadius: number;
				expansionSpeed: number;
				lineWidth: number;
				pushDistance?: number;
				burstCount?: number;
				offsetDistance?: number;
				burstDelay?: number;
		  }
		| {
				type: 'laser-sweep';
				duration: number;
				beamLength: number;
				beamWidth: number;
		  }
		| {
				type: 'ricochet';
				bounceCount: number;
		  }
		| {
				type: 'shield-steal';
				shieldRatio: number;
		  }
		| {
				type: 'life-steal-mark';
				lifeStealRatio: number;
				duration: number;
		  }
		| {
				type: 'parasite-bloom';
				duration: number;
				healRatio: number;
				pulseRadius: number;
		  }
		| {
				type: 'kill-switch';
				maxRadius: number;
				expansionSpeed: number;
				lineWidth: number;
				executeThresholdRatio: number;
		  }
		| {
				type: 'vulnerable-hit';
				damageMultiplier: number;
				duration: number;
		  }
		| {
				type: 'target-painter';
				damageMultiplier: number;
		  }
		| {
				type: 'bleed-hit';
				damageRatio: number;
				duration: number;
		  }
		| {
				type: 'next-weapon-boost';
				damageMultiplier: number;
		  }
		| {
				type: 'needle-fan';
				duration: number;
				maxReach: number;
				lineWidth: number;
		  }
		| {
				type: 'expanding-wave';
				sizeGrowth: number;
				maxSize: number;
				impactRadiusGrowth: number;
				maxImpactRadius: number;
		  }
		| {
				type: 'sniper-line';
				chargeDuration: number;
				lineWidth: number;
				maxChainTargets?: number;
				chainTargetsPerUpgrade?: number;
				maxUpgradeChainTargets?: number;
				bounceRange?: number;
				rangedOnly?: boolean;
		  }
		| {
				type: 'shrapnel-burst';
				fragmentCount: number;
				fragmentDamageMultiplier: number;
				fragmentSearchRadius: number;
				fragmentSpeedMultiplier: number;
		  }
		| {
				type: 'execution-lattice';
				targetCount: number;
				dropHeight: number;
				dropDuration: number;
				markerSize: number;
		  }
		| {
				type: 'fork-lightning';
				duration: number;
				branchWidth: number;
		  }
		| {
				type: 'prism-prison';
				durationCycles: number;
				radius: number;
				sides: number;
				lineWidth: number;
				edgeHitCooldown: number;
		  }
		| {
				type: 'flamethrower-cone';
				durationCycles: number;
				tickInterval: number;
				reach: number;
				coneAngleDegrees: number;
		  }
		| {
				type: 'ice-shower';
				spikeCount: number;
				durationCycles: number;
				fallDuration: number;
				impactRadius: number;
				fullScreen?: boolean;
				chillAmount?: number;
				freezeDuration?: number;
				frozenDamageMultiplier?: number;
				frozenMaxHealthDamageRatio?: number;
		  }
		| {
				type: 'void-tendrils';
				targetCount: number;
				latchDuration: number;
				consumeDelayCycles: number;
		  }
		| {
				type: 'void-rift';
				durationCycles: number;
				tickInterval: number;
				halfWidth: number;
				halfHeight: number;
				pullStrength: number;
				maxTargets: number;
				finalPulseRadius: number;
				finalPulseBaseDamage: number;
				finalPulseDamageRatio: number;
		  }
		| {
				type: 'void-tunnel';
				duration: number;
				halfWidth: number;
				halfHeight: number;
				pullStrength: number;
				debuffDuration: number;
				elementalDamageMultiplier: number;
		  }
		| {
				type: 'phaseshift';
				durationCycles: number;
				zoneWidth: number;
				zoneHeightRatio: number;
				horizontalOffset: number;
				teleportOffset: number;
				slowDuration: number;
				slowMultiplier: number;
		  }
		| {
				type: 'stasis-field';
				maxRadius: number;
				expansionSpeed: number;
				fieldDurationCycles: number;
		  }
		| {
				type: 'vulnerable-pulse';
				maxRadius: number;
				expansionSpeed: number;
				lineWidth: number;
				damageMultiplier: number;
				duration: number;
		  }
		| {
				type: 'burning-ground';
				radius: number;
				durationCycles: number;
				tickInterval: number;
				impactSize: number;
		  }
		| {
				type: 'delayed-bomb';
				radius: number;
				detonationDelayCycles: number;
				markerSize: number;
		  };
	targeting: WeaponTargetingKind;
}

export interface WeaponDropConfig {
	mode: 'starter' | 'drop' | 'shop' | 'dungeon-pack';
	campaignId?: number;
	dungeonId?: number;
	stageStart?: number;
	stageEnd?: number;
	perLevelDropChance?: number;
	perEnemyDropChance?: number;
}

export type LoadoutItemRewardMarker = 'ancient';

export interface ShopItemConfig {
	campaignId: number;
	price: number;
}

export type UtilityActivationKind = 'triggered' | 'passive';

export interface UtilityVisual {
	color: string;
	shape?: 'ring' | 'column-glow';
	glow?: boolean;
}

export interface UtilityDefinition {
	id: string;
	name: string;
	category: 'utility';
	rarity: WeaponRarity;
	rewardMarker?: LoadoutItemRewardMarker;
	uniquePerLoadout?: boolean;
	shape: WeaponShape;
	activationKind: UtilityActivationKind;
	cycleInterval?: number;
	startCharged?: boolean;
	requiredInfusion?: ElementalInfusionType;
	requiredInfusionCount?: number;
	effect:
		| {
				type: 'shield-pool';
				shieldPercent: number;
		  }
		| {
				type: 'elemental-infuser';
				element: ElementalInfusionType;
		  }
		| {
				type: 'cycle-adjacency-reduction';
				reduction: number;
				minimumCycleInterval: number;
		  }
		| {
				type: 'adjacent-weapon-damage-boost';
				damageMultiplier: number;
		  }
		| {
				type: 'adjacent-shield-boost';
				shieldMultiplier: number;
		  }
		| {
				type: 'adjacent-projectile-speed-boost';
				projectileSpeedMultiplier: number;
		  }
		| {
				type: 'adjacent-weapon-lifesteal-boost';
				lifeStealRatio: number;
		  }
		| {
				type: 'adjacent-weapon-shield-steal-boost';
				shieldStealRatio: number;
		  }
		| {
				type: 'cycle-damage-boost';
				damageMultiplier: number;
				duration: 'rest-of-cycle';
		  }
		| {
				type: 'elemental-cycle-boost';
				element: ElementalInfusionType;
				damageMultiplier: number;
				duration: 'rest-of-cycle';
		  }
		| {
				type: 'elemental-mastery';
				damageMultiplier: number;
				duration: 'rest-of-cycle';
		  }
		| {
				type: 'hemorrhage-burst';
				thresholdRatio: number;
				radiusFactor: number;
				bounceCount: number;
		  }
		| {
				type: 'bleed-catalyst';
				multiplier: number;
				maxTotalMultiplier: number;
		  }
		| {
				type: 'knife-siphon';
				lifeStealRatio: number;
		  }
		| {
				type: 'knife-ricochet-fork';
				forkCount: number;
		  }
		| {
				type: 'mine-trigger-echo';
		  }
		| {
				type: 'mine-gravity-augment';
				pullRadius: number;
				pullStrength: number;
		  }
		| {
				type: 'mine-shield-turret';
				shieldRatioFromMineDamage: number;
				placementRadius: number;
				markerSize: number;
		  }
		| {
				type: 'oathbreaker-sigil';
				radiusFactor: number;
				duration: number;
				slowMultiplier: number;
				damageShareRatio: number;
		  }
		| {
				type: 'mirror-array';
				radiusFactor: number;
				duration: number;
				reflectedDamageMultiplier: number;
				reflectedImpactRadius: number;
		  }
		| {
				type: 'vanish-rune';
				requiredUniqueRuneCount: number;
				durationCycles: number;
				successCooldownCycles: number;
		  };
	utilityVisual?: UtilityVisual;
	drop: WeaponDropConfig;
	role: string;
	shop?: ShopItemConfig;
}

export interface WeaponDefinition {
	id: string;
	name: string;
	family?: 'mine' | 'pylon' | 'laser-rod';
	rarity: WeaponRarity;
	rewardMarker?: LoadoutItemRewardMarker;
	uniquePerLoadout?: boolean;
	shape: WeaponShape;
	baseDamage: number;
	projectileSpeed: number;
	attack: WeaponAttackBehavior;
	projectileVisual: WeaponProjectileVisual;
	drop: WeaponDropConfig;
	role: string;
	shop?: ShopItemConfig;
}

export type LoadoutItemDefinition = WeaponDefinition | UtilityDefinition;

export interface OwnedWeaponInstance {
	instanceId: string;
	definitionId: string;
	source: 'starter' | 'drop' | 'shop' | 'pack';
	acquiredAt: string;
	campaignId: number | null;
	stage: number | null;
	level: number | null;
	upgradeLevel: number | null;
	totalScrapInvested: number | null;
}

export type RewardPackStatus = 'unopened' | 'opened';

export type RewardPackKind = 'normal' | 'special' | 'rare' | 'dungeon';

export type DungeonKeyId =
	'dungeon-1-key' | 'dungeon-2-key' | 'dungeon-3-key' | 'dungeon-4-key' | 'dungeon-5-key';

export type DungeonKeyInventory = Record<DungeonKeyId, number>;

export interface PersistedRewardPackCard {
	slotIndex: number;
	definitionId: string;
	rarity: WeaponRarity;
	isGuaranteedSlot: boolean;
}

export interface PersistedRewardPack {
	id: string;
	ownerUserId: string;
	campaignId: number;
	sourceCampaignLevel: number;
	kind: RewardPackKind;
	droppedAt: string;
	openedAt: string | null;
	status: RewardPackStatus;
	cardCount: number;
	guaranteedSlotIndex: number;
	contentVersion: number;
	cards: PersistedRewardPackCard[];
}

export interface ShopOffer {
	definitionId: string;
	name: string;
	rarity: WeaponRarity;
	role: string;
	price: number;
	campaignId: number;
	weight: number;
	category: 'weapon' | 'utility';
}

export type OwnedLoadoutItemInstance = OwnedWeaponInstance;

export interface LoadoutPlacement {
	weaponInstanceId: string;
	x: number;
	y: number;
	rotation: LoadoutRotation;
	mirrored?: boolean;
	targeting?: LoadoutPlacementTargetingKind;
}

export type LoadoutSlotIndex = 0 | 1 | 2;

export type LoadoutSlots = [LoadoutPlacement[], LoadoutPlacement[], LoadoutPlacement[]];

export interface PersistedLoadoutState {
	activeSlot: LoadoutSlotIndex;
	slots: LoadoutSlots;
}

export interface WaveComposition {
	biters?: number;
	swarmers?: number;
	tankers?: number;
	shard?: number;
	bulwark?: number;
	shielder?: number;
	zerglitch?: number;
	bossMelee?: number;
	bossRanged?: number;
	bossHybrid?: number;
}

export interface XpPerEnemy {
	biter?: number;
	swarmer?: number;
	tanker?: number;
	shard?: number;
	bulwark?: number;
	shielder?: number;
	zerglitch?: number;
	bossMelee?: number;
	bossRanged?: number;
	bossHybrid?: number;
}

export interface CampaignLevel {
	campaign: number;
	stage: number;
	stageLevel: number;
	campaignLevel: number;
	isStageBoss: boolean;
	isCampaignBoss: boolean;
	totalEnemies: number;
	composition: WaveComposition;
	xpPerEnemy: XpPerEnemy;
	totalXpReward: number;
	spawnRatePerSecond: number;
	enemyHealthMultiplier?: number;
	enemyDamageMultiplier?: number;
	enemyDamageBonus?: number;
	bossHealthMultiplier?: number;
	bossDamageMultiplier?: number;
	bossDamageBonus?: number;
}

export interface CampaignBaseline {
	startingEnemies: number;
	stageEnemyIncrease: number;
	stageLevelBonusScale: number;
	stageLevelGrowthFactor: number;
	spawnRatePerSecond: number;
	enemyStageScaling?: {
		healthPerStage: number;
		damagePerStage: number;
	};
	tutorialLevels: number[];
	compositionRules: {
		tutorial: string;
		standard: {
			biters?: string;
			swarmers?: string;
			tankers?: string;
			shard?: string;
			bulwark?: string;
			shielder?: string;
			zerglitch?: string;
			bossMelee?: string;
			bossRanged?: string;
			bossHybrid?: string;
		};
	};
	bossEnemyMultipliers: {
		stage: number;
		campaign: number;
	};
	xpDropRules: {
		biter?: string;
		swarmer?: string;
		tanker?: string;
		shard?: string;
		bulwark?: string;
		shielder?: string;
		zerglitch?: string;
		bossMelee?: string;
		bossRanged?: string;
		bossHybrid?: string;
	};
}

export interface CampaignDefinition {
	campaign: number;
	name?: string;
	mode?: 'campaign' | 'endless';
	stages: number;
	levelsPerStage: number;
	totalLevels: number;
	combatProfile: string;
	baseline: CampaignBaseline;
	levels: CampaignLevel[];
}

export type DungeonEnemyKind = CombatEnemyKind;

export type DungeonWaveComposition = Partial<Record<DungeonEnemyKind, number>>;

export type DungeonXpPerEnemy = Partial<Record<DungeonEnemyKind, number>>;

export interface DungeonFloor {
	dungeonId: number;
	stage: 1;
	floor: number;
	dungeonLevel: number;
	isBossFloor: boolean;
	totalEnemies: number;
	composition: DungeonWaveComposition;
	xpPerEnemy?: DungeonXpPerEnemy;
	totalXpReward?: number;
	spawnRatePerSecond: number;
	enemyHealthMultiplier?: number;
	enemyDamageMultiplier?: number;
	bossHealthMultiplier?: number;
	bossDamageMultiplier?: number;
	bossDamageBonus?: number;
}

export type CombatLevelDefinition = CampaignLevel | DungeonFloor;

export interface DungeonDefinition {
	dungeonId: number;
	sourceCampaignId: number;
	keyId: DungeonKeyId;
	name: string;
	rewardPackName: string;
	theme: string;
	stages: 1;
	levelsPerStage: 5;
	totalLevels: 5;
	combatProfile: string;
	floors: DungeonFloor[];
}
