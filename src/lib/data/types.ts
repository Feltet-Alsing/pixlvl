export type GlitchKind = 'biter' | 'swarmer' | 'tanker' | 'shard' | 'bulwark';

export type WeaponRarity = 'normal' | 'magic' | 'rare' | 'exotic' | 'legendary';

export type WeaponAttackKind = 'single' | 'dual' | 'spread';

export type WeaponProjectileSize = 'small' | 'medium' | 'large';

export type WeaponProjectileShape = 'square' | 'diamond' | 'orb' | 'spark';

export type WeaponTrailStyle = 'none' | 'streak' | 'pulse';

export type WeaponProjectileMotion = 'straight' | 'wave' | 'accelerate';

export type WeaponSpecialAttackKind =
	| 'force-field'
	| 'laser-sweep'
	| 'ricochet'
	| 'needle-fan'
	| 'expanding-wave'
	| 'sniper-line'
	| 'shrapnel-burst';

export type WeaponTargetingKind = 'current-target' | 'furthest-target';

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
	preferredRange?: number;
	orbitSpeed?: number;
	projectileSpeed?: number;
	projectileDamage?: number;
	projectileColor?: string;
	projectileSize?: number;
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
	special?:
		| {
				type: 'force-field';
				maxRadius: number;
				expansionSpeed: number;
				lineWidth: number;
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
		  }
		| {
				type: 'shrapnel-burst';
				fragmentCount: number;
				fragmentDamageMultiplier: number;
				fragmentSearchRadius: number;
				fragmentSpeedMultiplier: number;
		  };
	targeting: WeaponTargetingKind;
}

export interface WeaponDropConfig {
	mode: 'starter' | 'drop';
	campaignId?: number;
	stageStart?: number;
	stageEnd?: number;
	perLevelDropChance?: number;
	perEnemyDropChance?: number;
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
}

export interface OwnedWeaponInstance {
	instanceId: string;
	definitionId: string;
	source: 'starter' | 'drop';
	acquiredAt: string;
	campaignId: number | null;
	stage: number | null;
	level: number | null;
}

export interface LoadoutPlacement {
	weaponInstanceId: string;
	x: number;
	y: number;
}

export interface WaveComposition {
	biters?: number;
	swarmers?: number;
	tankers?: number;
	shard?: number;
	bulwark?: number;
}

export interface XpPerEnemy {
	biter?: number;
	swarmer?: number;
	tanker?: number;
	shard?: number;
	bulwark?: number;
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
