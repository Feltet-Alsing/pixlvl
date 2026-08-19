export type GlitchKind =
	'biter' | 'swarmer' | 'tanker' | 'shard' | 'bulwark' | 'shielder' | 'zerglitch';

export type WeaponRarity = 'normal' | 'magic' | 'rare' | 'exotic' | 'legendary';

export type WeaponAttackKind = 'single' | 'dual' | 'spread';

export type WeaponProjectileSize = 'small' | 'medium' | 'large';

export type WeaponProjectileShape = 'square' | 'diamond' | 'orb' | 'spark';

export type WeaponTrailStyle = 'none' | 'streak' | 'pulse';

export type WeaponProjectileMotion = 'straight' | 'wave' | 'accelerate';

export type LoadoutRotation = 0 | 1 | 2 | 3;

export type ElementalInfusionType = 'fire' | 'lightning' | 'cold' | 'void';

export type WeaponSpecialAttackKind =
	| 'force-field'
	| 'laser-sweep'
	| 'ricochet'
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
	| 'stasis-field';

export type WeaponTargetingKind =
	'current-target' | 'nearest-target' | 'furthest-target' | 'strongest-target' | 'weakest-target';

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
	attackPattern?: 'melee' | 'siege';
	supportPattern?: 'shield-nearest-non-bulwark';
	preferredRange?: number;
	orbitSpeed?: number;
	projectileSpeed?: number;
	projectileDamage?: number;
	projectileColor?: string;
	projectileSize?: number;
	allyShieldAmount?: number;
	allyShieldDuration?: number;
	onHitShieldDuration?: number;
	onHitShieldCooldown?: number;
	onHitShieldDamageReduction?: number;
	shieldColor?: string;
}

export interface CombatProfile {
	id: string;
	pixl: PixlBaseStats;
	projectileSpeed: number;
	collision: CollisionConfig;
	glitches: Record<GlitchKind, GlitchStats>;
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
				type: 'force-field';
				maxRadius: number;
				expansionSpeed: number;
				lineWidth: number;
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
				type: 'vulnerable-hit';
				damageMultiplier: number;
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
				healPerHit: number;
				duration: number;
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
	mode: 'starter' | 'drop' | 'shop';
	campaignId?: number;
	stageStart?: number;
	stageEnd?: number;
	perLevelDropChance?: number;
	perEnemyDropChance?: number;
}

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
	shape: WeaponShape;
	activationKind: UtilityActivationKind;
	cycleInterval?: number;
	startCharged?: boolean;
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
				type: 'cycle-damage-boost';
				damageMultiplier: number;
				duration: 'rest-of-cycle';
		  };
	utilityVisual?: UtilityVisual;
	drop: WeaponDropConfig;
	role: string;
	shop?: ShopItemConfig;
}

export interface WeaponDefinition {
	id: string;
	name: string;
	rarity: WeaponRarity;
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
	source: 'starter' | 'drop' | 'shop';
	acquiredAt: string;
	campaignId: number | null;
	stage: number | null;
	level: number | null;
	upgradeLevel: number | null;
	totalScrapInvested: number | null;
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
	targeting?: WeaponTargetingKind;
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
}

export interface XpPerEnemy {
	biter?: number;
	swarmer?: number;
	tanker?: number;
	shard?: number;
	bulwark?: number;
	shielder?: number;
	zerglitch?: number;
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
	};
}

export interface CampaignDefinition {
	campaign: number;
	stages: number;
	levelsPerStage: number;
	totalLevels: number;
	combatProfile: string;
	baseline: CampaignBaseline;
	levels: CampaignLevel[];
}
