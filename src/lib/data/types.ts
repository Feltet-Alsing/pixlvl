export type GlitchKind = 'biter' | 'swarmer' | 'tanker';

export interface PixlBaseStats {
	health: number;
	damage: number;
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