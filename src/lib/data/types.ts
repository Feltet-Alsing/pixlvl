export type GlitchKind = 'biter' | 'swarmer' | 'tanker';

export type WeaponRarity = 'normal' | 'magic' | 'rare' | 'exotic' | 'legendary';

export type WeaponAttackKind = 'single' | 'dual' | 'spread';

export type WeaponProjectileSize = 'small' | 'medium' | 'large';

export interface PixlBaseStats {
	health: number;
	// damage: number; // Commenting out damage for future reference
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
}

export interface WeaponAttackBehavior {
	kind: WeaponAttackKind;
	projectileCount: number;
	spreadDegrees?: number;
	targeting: 'current-target';
}

export interface WeaponDropConfig {
	mode: 'starter' | 'drop';
	campaignId?: number;
	stageStart?: number;
	stageEnd?: number;
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
	biters: number;
	swarmers: number;
	tankers: number;
}

export interface GoldPerEnemy {
	biter: number;
	swarmer: number;
	tanker: number;
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
	goldPerEnemy: GoldPerEnemy;
	totalGoldReward: number;
	spawnRatePerSecond: number;
}

export interface CampaignBaseline {
	startingEnemies: number;
	enemyIncreasePerLevel: number;
	spawnRatePerSecond: number;
	tutorialLevels: number[];
	compositionRules: {
		tutorial: string;
		standard: {
			swarmers: string;
			tankers: string;
			biters: string;
		};
	};
	goldDropRules: {
		biter: string;
		swarmer: string;
		tanker: string;
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
