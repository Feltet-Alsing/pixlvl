import type P5 from 'p5';

import { getCampaignLevel, getWeaponDefinition } from '$lib/data';
import { isPlacementWeaponTargetingKind } from '$lib/game/weapon-targeting';
import { rollLevelRewardPacks as buildRewardPacksForLevel } from '$lib/game/reward-packs';
import { applyXpGain, createUpgradeablePixlState } from '$lib/game/upgrades';
import {
	buildEquippedLoadoutEntries,
	buildEquippedWeapons,
	buildEquippedUtilities,
	buildSpawnQueue,
	createRewardPackId,
	doCellsTouchByEdge,
	ENEMY_VISUALS,
	getCombatCompositionCount,
	getCanvasSize,
	getLoadoutPreviewCanvasSize,
	getPlacedShapeCells,
	PROJECTILE_SIZE_BY_VISUAL,
	shuffleInPlace,
	WEAPON_FILL_BY_RARITY
} from '$lib/p5/campaign-runtime';
import {
	createWeaponVisualProps,
	type WeaponAnimationProps,
	type WeaponVisualProps
} from '$lib/p5/weapon-component';
import { getUtilityModule } from '$lib/p5/utility-modules';
import { getWeaponModule } from '$lib/p5/weapon-modules';
import { drawPixlCrown } from '$lib/p5/pixl-crown';
import type {
	CombatEnemyKind,
	CombatLevelDefinition,
	CampaignDefinition,
	CampaignLevel,
	CombatProfile,
	GlitchKind,
	GlitchStats,
	OwnedWeaponInstance,
	PersistedRewardPack,
	WeaponAttackBehavior,
	ElementalInfusionType,
	WeaponDefinition,
	WeaponProjectileShape,
	WeaponRarity,
	WeaponProjectileMotion,
	WeaponTrailStyle,
	WeaponTargetingKind
} from '$lib/data/types';
import type { PersistedCampaignProgress, PersistedPixlState } from '$lib/server/game-state';
import type {
	EquippedLoadoutEntry,
	EquippedUtilityState,
	EquippedWeaponState
} from '$lib/p5/campaign-runtime';
import type { WeaponActivationResult } from '$lib/p5/weapon-behavior-types';

const MAX_WIDTH = 760;
const BASE_HEIGHT = 520;
const FIXED_ARENA_RADIUS = BASE_HEIGHT * 0.42;
const FIXED_SPAWN_RADIUS = FIXED_ARENA_RADIUS;
const ARENA_VERTICAL_OFFSET_RATIO = 0.1;
const LEVEL_CLEAR_DELAY = 3;
const LEVEL_RESET_DELAY = 1.2;
const CAMPAIGN_LOOP_DELAY = 3;
const LOADOUT_PREVIEW_MAX_WIDTH = 320;
const LOADOUT_PREVIEW_BASE_HEIGHT = 240;
const DEFAULT_MAX_ACTIVE_PERIMETER_MINES = 12;
const MAX_ACTIVE_HEMORRHAGE_FORK_PROJECTILES = 6;
const PIXL_SHIELD_CAP_MULTIPLIER = 4;
const PLAYER_SHIELD_GAIN_MULTIPLIER = 2;

type WaveStatus = 'running' | 'cleared' | 'defeated' | 'complete';
type RunMode = 'management' | 'combat';

interface EnemyState {
	id: number;
	kind: CombatEnemyKind;
	x: number;
	y: number;
	health: number;
	maxHealth: number;
	bleedStoredDamage: number;
	bleedDurationRemaining: number;
	bleedSourceWeaponInstanceId: string | null;
	bleedRicochetStep: number;
	bleedLifeStealRatio: number;
	attackTimer: number;
	hitFlash: number;
	orbitDirection: 1 | -1;
	holdRadius: number;
	supportShieldPool: number;
	supportShieldTimer: number;
	shieldPulseTimer: number;
	shieldPulseCooldown: number;
	confusionTimer: number;
	slowTimer: number;
	slowMultiplier: number;
	sunbrandTimer: number;
	sunbrandBaseDamage: number;
	sunbrandTriggerDamageMultiplier: number;
	sunbrandSourceWeaponInstanceId: string | null;
	bindingRuneHitCount: number;
	bindingRuneDamageMultiplierPerHit: number;
	bindingRuneSourceWeaponInstanceId: string | null;
	voidTouchedTimer: number;
	fireExposedTimer: number;
	lifeStealMarkTimer: number;
	lifeStealMarkRatio: number;
	parasiteBloomTimer: number;
	parasiteBloomDuration: number;
	parasiteBloomHealRatio: number;
	parasiteBloomPulseRadius: number;
	parasiteBloomColor: string | null;
	vulnerableTimer: number;
	chillAmount: number;
	frozenTimer: number;
	moveSpeedMultiplier: number;
	damageMultiplier: number;
	damageBonus: number;
}

interface ProjectileState {
	weaponId: string;
	sourceWeaponInstanceId: string;
	originX: number;
	originY: number;
	x: number;
	y: number;
	lastX: number;
	lastY: number;
	directionX: number;
	directionY: number;
	perpendicularX: number;
	perpendicularY: number;
	speed: number;
	distanceTravelled: number;
	age: number;
	damage: number;
	visual: WeaponVisualProps;
	animation: WeaponAnimationProps;
	color: string;
	size: number;
	shape: WeaponProjectileShape;
	trail: WeaponTrailStyle;
	glow: boolean;
	canSplitOnImpact: boolean;
	motion: WeaponProjectileMotion;
	waveAmplitude: number;
	waveFrequency: number;
	wavePhase: number;
	waveDrift: number;
	pierceRemaining: number;
	impactRadius: number;
	impactRadiusGrowth: number;
	maxImpactRadius: number;
	ricochetRemaining: number;
	sizeGrowth: number;
	maxSize: number;
	hitEnemyIds: number[];
	hitResetInterval: number;
	hitResetTimer: number;
	homingTargetEnemyId: number | null;
	homingTurnRate: number;
	collidesWithEnemies: boolean;
	impactTargetX: number | null;
	impactTargetY: number | null;
	arrivalEffect: 'burning-ground' | null;
	arrivalTriggerRadius: number;
	minePayloadWeaponId: string | null;
	mirrorBounceReady: boolean;
	reflectedByMirror: boolean;
}

interface SniperLockState {
	enemyId: number | null;
	targetX: number;
	targetY: number;
	age: number;
	chargeDuration: number;
	lineWidth: number;
	color: string;
	glow: boolean;
	weapon: WeaponDefinition;
	sourceWeaponInstanceId: string;
}

interface SniperChainBurstState {
	sourceWeaponInstanceId: string;
	segments: Array<{
		from: { x: number; y: number };
		to: { x: number; y: number };
	}>;
	lineWidth: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

interface EnemyProjectileState {
	x: number;
	y: number;
	vx: number;
	vy: number;
	damage: number;
	color: string;
	size: number;
	age: number;
	maxAge: number;
}

interface EnemyBeamState {
	sourceEnemyId: number;
	age: number;
	duration: number;
	tickInterval: number;
	tickTimer: number;
	damage: number;
	width: number;
	color: string;
	glow: boolean;
}

interface StoneWardState {
	sourceUtilityInstanceId: string;
	radius: number;
	lineWidth: number;
	color: string;
	glow: boolean;
	pulse: number;
	shield: number;
	maxShield: number;
}

interface VanishRuneState {
	sourceUtilityInstanceId: string;
	age: number;
	duration: number;
	radius: number;
	color: string;
	glow: boolean;
	pulse: number;
}

interface ForceFieldState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	startDelay: number;
	radius: number;
	maxRadius: number;
	expansionSpeed: number;
	lineWidth: number;
	pushDistance: number;
	damage: number;
	color: string;
	glow: boolean;
	age: number;
	hitEnemyIds: number[];
}

interface KillSwitchPulseState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	maxRadius: number;
	expansionSpeed: number;
	lineWidth: number;
	executeThresholdRatio: number;
	color: string;
	glow: boolean;
	age: number;
	hitEnemyIds: number[];
}

interface VulnerablePulseState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	maxRadius: number;
	expansionSpeed: number;
	lineWidth: number;
	damage: number;
	vulnerableDuration: number;
	color: string;
	glow: boolean;
	age: number;
	hitEnemyIds: number[];
}

interface ParasiteBloomPulseState {
	originX: number;
	originY: number;
	radius: number;
	maxRadius: number;
	healAmount: number;
	age: number;
	duration: number;
	color: string;
}

interface PerimeterMineState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	triggerRadius: number;
	blastRadius: number;
	markerSize: number;
	damage: number;
	color: string;
	glow: boolean;
	age: number;
	hasDetonated: boolean;
	explosionFlash: number;
}

interface TurretMineState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	markerSize: number;
	color: string;
	glow: boolean;
	age: number;
	expiresAfterSweepIndex: number;
	barrelAngle: number;
	fireFlash: number;
}

interface TurretMineBurstState {
	turret: TurretMineState;
	payloadWeaponId: string;
	shotsRemaining: number;
	emissionInterval: number;
	emissionTimer: number;
}

interface MineShieldTurretState {
	sourceUtilityInstanceId: string;
	centerX: number;
	centerY: number;
	markerSize: number;
	color: string;
	glow: boolean;
	age: number;
	beamPulse: number;
	shieldRatioFromMineDamage: number;
}

interface SupportPylonState {
	sourceWeaponInstanceId: string;
	variant: 'mark-beacon' | 'cold-lattice' | 'mine-calibrator' | 'hemorrhage-relay';
	centerX: number;
	centerY: number;
	radius: number;
	markerSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	markDamageMultiplier: number;
	chillPerSecond: number;
	freezeDuration: number;
	pullStrength: number;
	mineTriggerRadiusBonus: number;
	mineBlastRadiusMultiplier: number;
	minePayloadDamageMultiplier: number;
	bleedDamageMultiplier: number;
	bleedSpreadRatio: number;
	bleedSpreadRadius: number;
}

interface LaserRodState {
	sourceWeaponInstanceId: string;
	definitionId: string;
	variant: 'ember-rods' | 'coldwire-rods' | 'sunder-rods';
	centerX: number;
	centerY: number;
	rodAngle: number;
	rodLength: number;
	lineWidth: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	chillPerSecond: number;
	freezeDuration: number;
	fireDamageMultiplier: number;
	fireDebuffDuration: number;
	vulnerableDuration: number;
	targeting: WeaponTargetingKind;
}

interface StasisFieldState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	maxRadius: number;
	expansionSpeed: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

interface PrismPrisonState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	sides: number;
	lineWidth: number;
	edgeHitCooldown: number;
	edgeHitCooldowns: Map<string, number>;
	damage: number;
	rotation: number;
	color: string;
	glow: boolean;
	age: number;
	triggered: boolean;
	activeAge: number;
	activeDuration: number;
}

interface VoidTunnelState {
	sourceWeaponInstanceId: string;
	variant: 'void-tunnel' | 'black-hole';
	originX: number;
	originY: number;
	centerX: number;
	centerY: number;
	halfWidth: number;
	halfHeight: number;
	pullStrength: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	debuffDuration: number;
	elementalDamageMultiplier: number;
	shieldRegenRatio: number;
	claimedEnemyIds: number[];
}

interface VoidRiftState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	angle: number;
	halfWidth: number;
	halfHeight: number;
	pullStrength: number;
	damagePerTick: number;
	tickInterval: number;
	tickTimer: number;
	maxTargets: number;
	finalPulseRadius: number;
	finalPulseBaseDamage: number;
	finalPulseDamageRatio: number;
	accumulatedDamage: number;
	finalPulseDamage: number;
	color: string;
	glow: boolean;
	age: number;
	activeDuration: number;
	collapseAge: number;
	collapseDuration: number;
	pulseMaxRadius: number;
	hasCollapsed: boolean;
}

interface PhaseshiftState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	zoneWidth: number;
	halfHeight: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	teleportOffset: number;
	slowDuration: number;
	slowMultiplier: number;
	teleportedEnemyIds: number[];
}

interface BurningGroundState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	damagePerTick: number;
	tickInterval: number;
	tickTimer: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

interface RuneCastState {
	sourceWeaponInstanceId: string;
	variant:
		| 'judgment-rune'
		| 'ascendance-rune'
		| 'sun-rune'
		| 'healing-rune'
		| 'slowing-rune'
		| 'sunbrand-rune'
		| 'binding-rune'
		| 'rune-reiterator';
	centerX: number;
	centerY: number;
	runeSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

interface SunRuneState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	damagePerPulse: number;
	waveThickness: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	hitEnemyIds: number[];
}

interface HealingRuneState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

interface SlowingRuneState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	slowMultiplier: number;
	slowDuration: number;
	waveThickness: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	hitEnemyIds: number[];
}

interface SunbrandRuneState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	brandDuration: number;
	burstBaseDamage: number;
	triggerDamageMultiplier: number;
	waveThickness: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	hitEnemyIds: number[];
}

interface BindingRuneState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	damageMultiplierPerHit: number;
	waveThickness: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	hitEnemyIds: number[];
}

interface JudgmentRuneState {
	sourceWeaponInstanceId: string;
	baseDamagePerTick: number;
	damageMultiplier: number;
	damagePerTick: number;
	damageGrowthPerCycle: number;
	maxBaseDamagePerTick: number;
	nextDamageGrowthSweepIndex: number;
	damageRadius: number;
	orbitRadius: number;
	sunRadius: number;
	orbitAngle: number;
	orbitAngularSpeed: number;
	tickInterval: number;
	tickTimer: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

interface PendingRuneEchoState {
	runeType:
		| 'ascendance-rune'
		| 'sun-rune'
		| 'healing-rune'
		| 'slowing-rune'
		| 'sunbrand-rune'
		| 'binding-rune';
	weapon: WeaponDefinition;
	sourceWeaponInstanceId: string;
	delay: number;
	efficiencyMultiplier: number;
}

interface TriggeredRuneReplayState {
	runeType: PendingRuneEchoState['runeType'];
	weapon: WeaponDefinition;
	sourceWeaponInstanceId: string;
}

type TriggeredSweepRuneType =
	PendingRuneEchoState['runeType'] | 'rune-reiterator' | 'judgment-rune';

interface DelayedBombState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	radius: number;
	markerSize: number;
	damage: number;
	color: string;
	glow: boolean;
	age: number;
	detonationDelay: number;
	hasDetonated: boolean;
	explosionFlash: number;
}

interface LaserSweepState {
	sourceWeaponInstanceId: string;
	startAngle: number;
	angle: number;
	beamLength: number;
	beamWidth: number;
	damage: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	hitEnemyIds: number[];
}

interface NeedleBurstState {
	sourceWeaponInstanceId: string;
	enemyId: number | null;
	targetX: number;
	targetY: number;
	maxReach: number;
	lineWidth: number;
	damage: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	hasHit: boolean;
}

interface ExecutionLatticeStrikeState {
	sourceWeaponInstanceId: string;
	enemyId: number | null;
	targetX: number;
	targetY: number;
	startY: number;
	markerSize: number;
	damage: number;
	color: string;
	glow: boolean;
	age: number;
	dropDuration: number;
	hasHit: boolean;
	startDelay: number;
}

interface ForkLightningState {
	sourceWeaponInstanceId: string;
	segments: Array<{
		from: { x: number; y: number };
		to: { x: number; y: number };
		enemyId: number | null;
		damage: number;
		startDelay: number;
		hasHit: boolean;
	}>;
	branchWidth: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

interface FlamethrowerConeState {
	sourceWeaponInstanceId: string;
	enemyId: number | null;
	angle: number;
	reach: number;
	halfAngleRadians: number;
	damagePerTick: number;
	tickInterval: number;
	tickTimer: number;
	emissionInterval: number;
	emissionTimer: number;
	projectilesReleased: number;
	color: string;
	glow: boolean;
	age: number;
	expiresAfterSweepIndex: number;
}

interface IceSpikeState {
	sourceWeaponInstanceId: string;
	enemyId: number | null;
	targetX: number;
	targetY: number;
	startY: number;
	endY: number;
	age: number;
	startDelay: number;
	fallDuration: number;
	damage: number;
	impactRadius: number;
	color: string;
	glow: boolean;
	hasHit: boolean;
	driftAmplitude: number;
	driftSpeed: number;
	driftPhase: number;
	size: number;
}

interface BlizzardStormState {
	sourceWeaponInstanceId: string;
	age: number;
	duration: number;
	color: string;
	glow: boolean;
	chillAmount: number;
	freezeDuration: number;
	hasAppliedChill: boolean;
}

interface VoidTendrilState {
	sourceWeaponInstanceId: string;
	enemyId: number | null;
	startX: number;
	startY: number;
	targetX: number;
	targetY: number;
	age: number;
	latchDuration: number;
	startCycleProgress: number;
	consumeAtCycleProgress: number;
	shieldGain: number;
	color: string;
	glow: boolean;
}

interface NaturesWrathState {
	sourceWeaponInstanceId: string;
	enemyId: number | null;
	targetX: number;
	targetY: number;
	age: number;
	latchDuration: number;
	duration: number;
	pulseInterval: number;
	pulseTimer: number;
	healAmount: number;
	color: string;
	glow: boolean;
}

interface PixlSwallowPulseState {
	originX: number;
	originY: number;
	color: string;
	shieldGain: number;
	age: number;
	duration: number;
}

interface HemorrhageBurstState {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	targetEnemyId: number | null;
	bleedRicochet: number;
	bleedDuration: number;
	sourceWeaponInstanceId: string | null;
	ricochetStep: number;
	lifeStealRatio: number;
	hasApplied: boolean;
	age: number;
	duration: number;
	color: string;
}

interface KnifeTrailSegmentState {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	color: string;
	age: number;
	duration: number;
}

interface OathbreakerSigilState {
	sourceUtilityInstanceId: string;
	enemyIds: number[];
	angle: number;
	radius: number;
	currentRadius: number;
	halfArcRadians: number;
	sweepDuration: number;
	expansionSpeed: number;
	lineWidth: number;
	duration: number;
	age: number;
	slowMultiplier: number;
	damageShareRatio: number;
	color: string;
	glow: boolean;
}

interface MirrorArrayState {
	sourceUtilityInstanceId: string;
	angle: number;
	radius: number;
	currentRadius: number;
	halfArcRadians: number;
	sweepDuration: number;
	expansionSpeed: number;
	lineWidth: number;
	duration: number;
	age: number;
	reflectedDamageMultiplier: number;
	reflectedImpactRadius: number;
	color: string;
	glow: boolean;
}

interface LoadoutLayout {
	cellSize: number;
	gridWidth: number;
	gridHeight: number;
	left: number;
	top: number;
}

type SharedPixlStateInput = Pick<
	PersistedPixlState,
	'xp' | 'defence' | 'agility' | 'ownedWeapons' | 'loadoutPlacements'
> & {
	dungeonKeys?: PersistedPixlState['dungeonKeys'];
};

interface ArenaCombatSketchOptions {
	persistPath?: string;
	runMode?: RunMode;
	flowMode?: 'campaign' | 'endless';
	levelResolver?: (levelIndex: number) => CombatLevelDefinition;
	rewardsEnabled?: boolean;
	showPixlCrown?: boolean;
	showLoadoutSketch?: boolean;
	resumeState?: ArenaCombatResumeState | null;
	pixlState?: SharedPixlStateInput | null;
	campaignState?: Pick<
		PersistedCampaignProgress,
		'currentLevel' | 'highestUnlockedLevel' | 'highestClearedLevel' | 'completed'
	> | null;
	onCombatStateChange?: (state: {
		stage: number;
		stageLevel: number;
		campaignLevel: number;
		pixlHealth: number;
		maxPixlHealth: number;
		pixlShieldPool: number;
		shieldColor: string;
		bankedXp: number;
		waveXp: number;
		waveDrops: OwnedWeaponInstance[];
		statusTimerRemaining: number;
		remainingEnemies: number;
		composition: {
			biters: number;
			swarmers: number;
			tankers: number;
			shard: number;
			bulwark: number;
			shielder: number;
			zerglitch: number;
			bossMelee: number;
			bossRanged: number;
			bossHybrid: number;
			golem: number;
			sunpriest: number;
			soldier: number;
			highPriest: number;
		};
		latestCompletedCycle: number;
		weaponDamageRows: Array<{
			weaponInstanceId: string;
			definitionId: string;
			name: string;
			rarity: WeaponRarity;
			placement: string;
			averageDamagePerCycle: number;
		}>;
		status: WaveStatus;
	}) => void;
	onResumeStateChange?: (state: ArenaCombatResumeState) => void;
	getSkipResultsSignal?: () => number;
	onStateChange?: (state: {
		xp: number;
		level: number;
		perkPoints: number;
		defence: number;
		agility: number;
		health: number;
		attackSpeed: number;
		loadoutRows: number;
		loadoutColumns: number;
		dungeonKeys: PersistedPixlState['dungeonKeys'];
		ownedWeapons: OwnedWeaponInstance[];
		rewardPacks: PersistedRewardPack[];
		currentLevel: number;
		highestUnlockedLevel: number;
		highestClearedLevel: number;
		completed: boolean;
	}) => void;
}

export interface ArenaCombatResumeState {
	campaignId: number;
	currentLevel: number;
	status: WaveStatus;
	levelRewardsCommitted: boolean;
	statusTimer: number;
	currentSweepIndex: number;
	spawnAccumulator: number;
	sweepProgress: number;
	bankedXp: number;
	waveXp: number;
	waveDrops: OwnedWeaponInstance[];
	pixlHealth: number;
	pixlShieldPool: number;
	pixlShieldSources?: Record<string, number>;
	pendingNextWeaponDamageMultiplier?: number;
	weaponDamageMultiplierByInstanceId?: Record<string, number>;
	markedEnemyId?: number | null;
	activeShieldColor: string;
	enemyId: number;
	spawnQueue: CombatEnemyKind[];
	enemies: EnemyState[];
	highestUnlockedLevel: number;
	highestClearedLevel: number;
	completed: boolean;
}

function createEmptyElementalInfusions(): Record<ElementalInfusionType, number> {
	return {
		fire: 0,
		lightning: 0,
		cold: 0,
		void: 0
	};
}

function createEmptyElementalDamageMultipliers(): Record<ElementalInfusionType, number> {
	return {
		fire: 1,
		lightning: 1,
		cold: 1,
		void: 1
	};
}

function createEmptyElementalExpiryState(): Record<ElementalInfusionType, number | null> {
	return {
		fire: null,
		lightning: null,
		cold: null,
		void: null
	};
}

export function createArenaCombatSketch(
	campaign: CampaignDefinition,
	combatProfile: CombatProfile,
	options: ArenaCombatSketchOptions = {}
) {
	return (p: P5) => {
		const isCampaignLevel = (level: CombatLevelDefinition): level is CampaignLevel => {
			return 'campaignLevel' in level;
		};

		const getResolvedLevelNumber = (level: CombatLevelDefinition) => {
			return isCampaignLevel(level) ? level.campaignLevel : level.dungeonLevel;
		};

		const getResolvedStageLevelNumber = (level: CombatLevelDefinition) => {
			return isCampaignLevel(level) ? level.stageLevel : level.floor;
		};

		const levels = campaign.levels;
		const runMode = options.runMode ?? 'combat';
		const flowMode = options.flowMode ?? campaign.mode ?? 'campaign';
		const endlessMode = flowMode === 'endless';
		const rewardsEnabled = options.rewardsEnabled ?? true;
		const resolveLevel = (levelIndex: number) => {
			const safeIndex = Math.max(0, levelIndex);

			if (options.levelResolver) {
				return options.levelResolver(safeIndex);
			}

			if (campaign.mode === 'endless') {
				return getCampaignLevel(campaign.campaign, safeIndex + 1);
			}

			return levels[Math.max(0, Math.min(safeIndex, levels.length - 1))];
		};
		const showLoadoutSketch = options.showLoadoutSketch ?? true;
		let pixlProgression = createUpgradeablePixlState({
			xp: options.pixlState?.xp ?? 0,
			defence: options.pixlState?.defence ?? 0,
			agility: options.pixlState?.agility ?? 0
		});
		const equippedLoadoutEntries = buildEquippedLoadoutEntries(
			options.pixlState?.ownedWeapons,
			options.pixlState?.loadoutPlacements,
			pixlProgression.loadoutColumns
		);
		const equippedWeapons = buildEquippedWeapons(equippedLoadoutEntries);
		const equippedUtilities = buildEquippedUtilities(equippedLoadoutEntries);
		const equippedWeaponByInstanceId = new Map(
			equippedWeapons.map((weapon) => [weapon.instanceId, weapon])
		);
		const equippedUtilityByInstanceId = new Map(
			equippedUtilities.map((utility) => [utility.instanceId, utility])
		);
		const getWeaponModuleByInstanceId = (instanceId: string) =>
			getWeaponModule(equippedWeaponByInstanceId.get(instanceId)?.definition.id ?? '');
		const getUtilityModuleByInstanceId = (instanceId: string) =>
			getUtilityModule(equippedUtilityByInstanceId.get(instanceId)?.definition.id ?? '');
		const getIdolOfEchoesEffect = () => {
			for (const weapon of equippedWeapons) {
				const special = weapon.definition.attack.special;

				if (special?.type === 'idol-of-echoes') {
					return special;
				}
			}

			return null;
		};
		const ascenderWeapon =
			equippedWeapons.find((weapon) => weapon.definition.id === 'the-ascender') ?? null;
		const ascendedPeaShooters = equippedWeapons.filter(
			(weapon) => weapon.definition.id === 'pea-shooter'
		);
		const hasActiveAscender = ascenderWeapon !== null && ascendedPeaShooters.length > 0;
		const getEntryCells = (entry: EquippedLoadoutEntry) =>
			getPlacedShapeCells(entry.shape, entry.placementX, entry.placementY);
		const replayableRuneSpecialTypes = new Set<PendingRuneEchoState['runeType']>([
			'ascendance-rune',
			'sun-rune',
			'healing-rune',
			'slowing-rune',
			'sunbrand-rune',
			'binding-rune'
		]);
		const trackedSweepRuneSpecialTypes = new Set<TriggeredSweepRuneType>([
			...replayableRuneSpecialTypes,
			'rune-reiterator',
			'judgment-rune'
		]);
		const getEntryBounds = (cells: Array<[number, number]>) => ({
			minX: Math.min(...cells.map(([x]) => x)),
			maxX: Math.max(...cells.map(([x]) => x)),
			minY: Math.min(...cells.map(([, y]) => y)),
			maxY: Math.max(...cells.map(([, y]) => y))
		});
		const buildCellKey = (x: number, y: number) => `${x}:${y}`;
		const getBloodboundSheathSocketCells = (entry: EquippedLoadoutEntry) => {
			const occupiedCellKeys = new Set(getEntryCells(entry).map(([x, y]) => buildCellKey(x, y)));
			const socketCells: Array<[number, number]> = [];

			for (let localY = 0; localY < entry.shape.height; localY += 1) {
				for (let localX = 0; localX < entry.shape.width; localX += 1) {
					const absoluteX = entry.placementX + localX;
					const absoluteY = entry.placementY + localY;
					const cellKey = buildCellKey(absoluteX, absoluteY);

					if (!occupiedCellKeys.has(cellKey)) {
						socketCells.push([absoluteX, absoluteY]);
					}
				}
			}

			return socketCells;
		};
		const getSocketedKnifeAssembly = () => {
			const knifeEntry = equippedLoadoutEntries.find(
				(entry) => entry.definition.id === 'the-knife'
			);
			const sheathEntries = equippedLoadoutEntries.filter(
				(entry) => entry.definition.id === 'bloodbound-sheath'
			);

			if (!knifeEntry || sheathEntries.length === 0) {
				return null;
			}

			const knifeCells = getEntryCells(knifeEntry);
			const knifeCellKeys = new Set(knifeCells.map(([x, y]) => buildCellKey(x, y)));
			const knifeBounds = getEntryBounds(knifeCells);

			for (const sheathEntry of sheathEntries) {
				const socketCells = getBloodboundSheathSocketCells(sheathEntry);

				if (socketCells.length === 0) {
					continue;
				}

				const socketCellKeys = new Set(socketCells.map(([x, y]) => buildCellKey(x, y)));
				const socketBounds = getEntryBounds(socketCells);

				if (
					knifeBounds.minX !== socketBounds.minX ||
					knifeBounds.maxX !== socketBounds.maxX ||
					knifeBounds.minY !== socketBounds.minY ||
					knifeBounds.maxY !== socketBounds.maxY
				) {
					continue;
				}

				if (![...knifeCellKeys].every((cellKey) => socketCellKeys.has(cellKey))) {
					continue;
				}

				return {
					knifeInstanceId: knifeEntry.instanceId,
					sheathInstanceId: sheathEntry.instanceId
				};
			}

			return null;
		};
		const passiveUtilities = equippedUtilities.filter(
			(utility) => utility.definition.activationKind === 'passive'
		);
		const triggeredUtilities = equippedUtilities.filter(
			(utility) => utility.definition.activationKind === 'triggered'
		);
		const passiveUtilityHasAvailableInfusion = (utility: EquippedUtilityState) => {
			const requiredInfusion = utility.definition.requiredInfusion;
			const requiredInfusionCount = Math.max(1, utility.definition.requiredInfusionCount ?? 1);

			if (!requiredInfusion) {
				return true;
			}

			return elementalInfusions[requiredInfusion] >= requiredInfusionCount;
		};
		const placedCellsByWeaponInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [
				weapon.instanceId,
				getPlacedShapeCells(weapon.shape, weapon.placementX, weapon.placementY)
			])
		) as Record<string, Array<[number, number]>>;
		const placedCellsByUtilityInstanceId = Object.fromEntries(
			equippedUtilities.map((utility) => [
				utility.instanceId,
				getPlacedShapeCells(utility.shape, utility.placementX, utility.placementY)
			])
		) as Record<string, Array<[number, number]>>;
		const weaponAdjacencyDamageMultiplierByInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [weapon.instanceId, 1])
		) as Record<string, number>;
		const weaponProjectileSpeedMultiplierByInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [weapon.instanceId, 1])
		) as Record<string, number>;
		const weaponLifeStealRatioByInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [weapon.instanceId, 0])
		) as Record<string, number>;
		const weaponShieldStealRatioByInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [weapon.instanceId, 0])
		) as Record<string, number>;
		const utilityShieldOutputMultiplierByInstanceId = Object.fromEntries(
			triggeredUtilities.map((utility) => [utility.instanceId, 1])
		) as Record<string, number>;

		for (const passiveUtility of passiveUtilities) {
			const passiveUtilityCells = placedCellsByUtilityInstanceId[passiveUtility.instanceId];

			for (const weapon of equippedWeapons) {
				if (
					!doCellsTouchByEdge(placedCellsByWeaponInstanceId[weapon.instanceId], passiveUtilityCells)
				) {
					continue;
				}

				switch (passiveUtility.definition.effect.type) {
					case 'adjacent-weapon-damage-boost':
						weaponAdjacencyDamageMultiplierByInstanceId[weapon.instanceId] *=
							passiveUtility.definition.effect.damageMultiplier;
						break;
					case 'adjacent-projectile-speed-boost':
						weaponProjectileSpeedMultiplierByInstanceId[weapon.instanceId] *=
							passiveUtility.definition.effect.projectileSpeedMultiplier;
						break;
					case 'adjacent-weapon-lifesteal-boost':
						weaponLifeStealRatioByInstanceId[weapon.instanceId] +=
							passiveUtility.definition.effect.lifeStealRatio;
						break;
					case 'adjacent-weapon-shield-steal-boost':
						weaponShieldStealRatioByInstanceId[weapon.instanceId] +=
							passiveUtility.definition.effect.shieldStealRatio;
						break;
				}
			}

			if (passiveUtility.definition.effect.type !== 'adjacent-shield-boost') {
				continue;
			}

			for (const utility of triggeredUtilities) {
				if (
					utility.definition.effect.type !== 'shield-pool' &&
					utility.definition.effect.type !== 'mine-shield-turret'
				) {
					continue;
				}

				if (
					doCellsTouchByEdge(
						placedCellsByUtilityInstanceId[utility.instanceId],
						passiveUtilityCells
					)
				) {
					utilityShieldOutputMultiplierByInstanceId[utility.instanceId] *=
						passiveUtility.definition.effect.shieldMultiplier;
				}
			}
		}

		for (const weapon of equippedWeapons) {
			let cycleReduction = 0;

			for (const utility of passiveUtilities) {
				if (utility.definition.effect.type !== 'cycle-adjacency-reduction') {
					continue;
				}

				const touches = doCellsTouchByEdge(
					getPlacedShapeCells(weapon.shape, weapon.placementX, weapon.placementY),
					getPlacedShapeCells(utility.shape, utility.placementX, utility.placementY)
				);

				if (touches) {
					cycleReduction += utility.definition.effect.reduction;
				}
			}

			weapon.cycleInterval = Math.max(1, weapon.cycleInterval - cycleReduction);
			weapon.cyclesUntilTrigger = weapon.cycleInterval;
		}

		for (const utility of triggeredUtilities) {
			let cycleReduction = 0;

			for (const passiveUtility of passiveUtilities) {
				if (passiveUtility.definition.effect.type !== 'cycle-adjacency-reduction') {
					continue;
				}

				const touches = doCellsTouchByEdge(
					getPlacedShapeCells(utility.shape, utility.placementX, utility.placementY),
					getPlacedShapeCells(
						passiveUtility.shape,
						passiveUtility.placementX,
						passiveUtility.placementY
					)
				);

				if (touches) {
					cycleReduction += passiveUtility.definition.effect.reduction;
				}
			}

			utility.cycleInterval = Math.max(1, utility.cycleInterval - cycleReduction);
			utility.cyclesUntilTrigger = utility.cycleInterval;
		}

		const bleedCatalystMultiplier = passiveUtilities.reduce((multiplier, utility) => {
			if (utility.definition.effect.type !== 'bleed-catalyst') {
				return multiplier;
			}

			return Math.min(
				utility.definition.effect.maxTotalMultiplier,
				multiplier * utility.definition.effect.multiplier
			);
		}, 1);
		const hemorrhageBurstUtility = passiveUtilities.find(
			(utility) => utility.definition.effect.type === 'hemorrhage-burst'
		);
		const hemorrhageBurstEffect =
			hemorrhageBurstUtility?.definition.effect.type === 'hemorrhage-burst'
				? hemorrhageBurstUtility.definition.effect
				: null;
		const knifeRicochetForkEffects = passiveUtilities.flatMap((utility) =>
			utility.definition.effect.type === 'knife-ricochet-fork' ? [utility.definition.effect] : []
		);
		const knifeRicochetForkCount = Math.min(
			5,
			knifeRicochetForkEffects.reduce((count, effect) => count + Math.max(0, effect.forkCount), 0)
		);
		const hasMineTriggerEcho = passiveUtilities.some(
			(utility) => utility.definition.effect.type === 'mine-trigger-echo'
		);
		const getActiveMineGravityAugmentEffect = () => {
			const utility = passiveUtilities.find(
				(candidate) =>
					candidate.definition.effect.type === 'mine-gravity-augment' &&
					passiveUtilityHasAvailableInfusion(candidate)
			);

			return utility?.definition.effect.type === 'mine-gravity-augment'
				? utility.definition.effect
				: null;
		};
		const targetPainterWeapon = equippedWeapons.find(
			(weapon) => weapon.definition.attack.special?.type === 'target-painter'
		);
		const sharedMineDamageMultiplier =
			1 + equippedWeapons.filter((weapon) => weapon.definition.family === 'mine').length * 0.2;
		const sharedMineProjectileBonus = equippedWeapons.filter(
			(weapon) => weapon.definition.id === 'cluster-mines'
		).length;
		const sharedMinePersistenceChance = Math.min(
			1,
			equippedWeapons.filter((weapon) => weapon.definition.id === 'shrapnel-mine').length * 0.2
		);
		const targetPainterEffect =
			targetPainterWeapon?.definition.attack.special?.type === 'target-painter'
				? targetPainterWeapon.definition.attack.special
				: null;
		const socketedKnifeAssembly = getSocketedKnifeAssembly();
		const knifeSiphonEffect = socketedKnifeAssembly
			? passiveUtilities.find((utility) => utility.definition.effect.type === 'knife-siphon')
			: null;
		const activeKnifeSiphonEffect =
			knifeSiphonEffect?.definition.effect.type === 'knife-siphon'
				? knifeSiphonEffect.definition.effect
				: null;
		const isSocketedKnifeSource = (sourceWeaponInstanceId: string | null | undefined) =>
			sourceWeaponInstanceId !== undefined &&
			sourceWeaponInstanceId !== null &&
			sourceWeaponInstanceId === socketedKnifeAssembly?.knifeInstanceId;
		const getWeaponLifeStealRatio = (sourceWeaponInstanceId: string | null | undefined) => {
			let lifeStealRatio = sourceWeaponInstanceId
				? (weaponLifeStealRatioByInstanceId[sourceWeaponInstanceId] ?? 0)
				: 0;

			if (activeKnifeSiphonEffect && isSocketedKnifeSource(sourceWeaponInstanceId)) {
				lifeStealRatio += activeKnifeSiphonEffect.lifeStealRatio;
			}

			return lifeStealRatio;
		};
		const getWeaponShieldStealRatio = (
			sourceWeapon: WeaponDefinition | null,
			sourceWeaponInstanceId: string | null | undefined
		) => {
			const baseShieldStealRatio =
				sourceWeapon?.attack.special?.type === 'shield-steal'
					? sourceWeapon.attack.special.shieldRatio
					: 0;

			return (
				(baseShieldStealRatio +
					(sourceWeaponInstanceId
						? (weaponShieldStealRatioByInstanceId[sourceWeaponInstanceId] ?? 0)
						: 0)) *
				PLAYER_SHIELD_GAIN_MULTIPLIER
			);
		};
		const getAdjustedProjectileSpeed = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string | null | undefined,
			baseSpeed = weapon.projectileSpeed
		) =>
			Math.max(
				0,
				baseSpeed *
					(sourceWeaponInstanceId
						? (weaponProjectileSpeedMultiplierByInstanceId[sourceWeaponInstanceId] ?? 1)
						: 1)
			);
		const getUtilityShieldOutputMultiplier = (utilityInstanceId: string) =>
			utilityShieldOutputMultiplierByInstanceId[utilityInstanceId] ?? 1;
		const equippedWeaponColumns = [
			...new Set(
				[
					...equippedWeapons.map((weapon) => weapon.triggerColumn),
					...triggeredUtilities.map((utility) => utility.triggerColumn)
				].sort((left, right) => left - right)
			)
		];
		const persistenceEnabled = Boolean(
			options.persistPath && options.pixlState && options.campaignState
		);
		const getEnemyStats = (kind: CombatEnemyKind) => {
			const stats = combatProfile.glitches[kind];

			if (!stats) {
				throw new Error(`Missing combat profile glitch stats for ${kind}`);
			}

			return stats;
		};

		let canvas: HTMLCanvasElement | null = null;
		let currentLevelIndex = Math.max(
			0,
			endlessMode
				? (options.campaignState?.currentLevel ?? 1) - 1
				: Math.min((options.campaignState?.currentLevel ?? 1) - 1, levels.length - 1)
		);
		let currentLevel = resolveLevel(currentLevelIndex);
		let status: WaveStatus = 'running';
		let statusTimer = 0;
		let currentSweepIndex = 0;
		let currentLevelElapsedTime = 0;
		let spawnAccumulator = 0;
		let sweepProgress = 0;
		let bankedXp = pixlProgression.xp;
		let dungeonKeys: PersistedPixlState['dungeonKeys'] = {
			'dungeon-1-key': options.pixlState?.dungeonKeys?.['dungeon-1-key'] ?? 0,
			'dungeon-2-key': options.pixlState?.dungeonKeys?.['dungeon-2-key'] ?? 0,
			'dungeon-3-key': options.pixlState?.dungeonKeys?.['dungeon-3-key'] ?? 0,
			'dungeon-4-key': options.pixlState?.dungeonKeys?.['dungeon-4-key'] ?? 0,
			'dungeon-5-key': options.pixlState?.dungeonKeys?.['dungeon-5-key'] ?? 0
		};
		const ownedWeapons = [...(options.pixlState?.ownedWeapons ?? [])];
		let waveXp = 0;
		let waveDrops: OwnedWeaponInstance[] = [];
		let rewardPacks: PersistedRewardPack[] = [];
		const cumulativeDamageByWeaponInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [weapon.instanceId, 0])
		) as Record<string, number>;
		let publishedAverageDamageByWeaponInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [weapon.instanceId, 0])
		) as Record<string, number>;
		let pixlHealth = pixlProgression.health;
		let pixlShieldPool = 0;
		let pixlShieldSources: Record<string, number> = {};
		let knifeRemainingRicochetsByInstanceId: Record<string, number> = {};
		let pendingNextWeaponDamageMultiplier = 1;
		let markedEnemyId: number | null = null;
		let weaponDamageMultiplierByInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [weapon.instanceId, 1])
		) as Record<string, number>;
		let ascenderBeamTickTimersByInstanceId = Object.fromEntries(
			ascendedPeaShooters.map((weapon) => [weapon.instanceId, 0.2])
		) as Record<string, number>;
		let elementalInfusions = createEmptyElementalInfusions();
		let cycleDamageMultiplier = 1;
		let cycleDamageBuffExpiresAfterSweepIndex: number | null = null;
		let elementalCycleDamageMultipliers = createEmptyElementalDamageMultipliers();
		let elementalCycleBuffExpiresAfterSweepIndex = createEmptyElementalExpiryState();
		let pixlAuraClock = 0;
		let activeShieldColor = '#60a5fa';
		let pixlFlash = 0;
		let enemyId = 0;
		let spawnQueue: CombatEnemyKind[] = [];
		let enemies: EnemyState[] = [];
		let projectiles: ProjectileState[] = [];
		let enemyProjectiles: EnemyProjectileState[] = [];
		let enemyBeams: EnemyBeamState[] = [];
		let activeVanishRune: VanishRuneState | null = null;
		let forceFields: ForceFieldState[] = [];
		let killSwitchPulses: KillSwitchPulseState[] = [];
		let vulnerablePulses: VulnerablePulseState[] = [];
		let parasiteBloomPulses: ParasiteBloomPulseState[] = [];
		let stasisFields: StasisFieldState[] = [];
		let prismPrisons: PrismPrisonState[] = [];
		let laserSweeps: LaserSweepState[] = [];
		let perimeterMines: PerimeterMineState[] = [];
		let turretMines: TurretMineState[] = [];
		let mineShieldTurrets: MineShieldTurretState[] = [];
		let supportPylons: SupportPylonState[] = [];
		let laserRods: LaserRodState[] = [];
		let turretMineBursts: TurretMineBurstState[] = [];
		let needleBursts: NeedleBurstState[] = [];
		let executionLatticeStrikes: ExecutionLatticeStrikeState[] = [];
		let forkLightningBursts: ForkLightningState[] = [];
		let flamethrowerCones: FlamethrowerConeState[] = [];
		let iceSpikes: IceSpikeState[] = [];
		let blizzardStorms: BlizzardStormState[] = [];
		let voidRifts: VoidRiftState[] = [];
		let voidTendrils: VoidTendrilState[] = [];
		let naturesWraths: NaturesWrathState[] = [];
		let pixlSwallowPulses: PixlSwallowPulseState[] = [];
		let voidTunnels: VoidTunnelState[] = [];
		let phaseshifts: PhaseshiftState[] = [];
		let oathbreakerSigils: OathbreakerSigilState[] = [];
		let mirrorArrays: MirrorArrayState[] = [];
		let runeCasts: RuneCastState[] = [];
		let sunRunes: SunRuneState[] = [];
		let healingRunes: HealingRuneState[] = [];
		let slowingRunes: SlowingRuneState[] = [];
		let sunbrandRunes: SunbrandRuneState[] = [];
		let bindingRunes: BindingRuneState[] = [];
		let judgmentRunes: JudgmentRuneState[] = [];
		let pendingRuneEchoes: PendingRuneEchoState[] = [];
		let currentSweepTriggeredRuneTypes = new Set<TriggeredSweepRuneType>();
		let currentSweepTriggeredRuneCount = 0;
		let triggeredRuneReplays: TriggeredRuneReplayState[] = [];
		let lastTriggeredRuneReplayIndexByWeaponInstanceId: Record<string, number> = {};
		let burningGrounds: BurningGroundState[] = [];
		let delayedBombs: DelayedBombState[] = [];
		let hemorrhageBursts: HemorrhageBurstState[] = [];
		let knifeTrailSegments: KnifeTrailSegmentState[] = [];
		let sniperLocks: SniperLockState[] = [];
		let sniperChainBursts: SniperChainBurstState[] = [];
		let centerX = 0;
		let centerY = 0;
		let arenaRadius = 0;
		let highestClearedLevel = options.campaignState?.highestClearedLevel ?? 0;
		let highestUnlockedLevel = options.campaignState?.highestUnlockedLevel ?? currentLevelIndex + 1;
		let completed = options.campaignState?.completed ?? false;
		let lastCombatStateKey = '';
		let lastResumeStateKey = '';
		let lastSkipResultsSignal = options.getSkipResultsSignal?.() ?? 0;
		let levelRewardsCommitted = false;
		const initialResumeState =
			options.resumeState?.campaignId === campaign.campaign ? options.resumeState : null;

		const persistProgress = (
			nextCurrentLevel: number,
			rewardPacks: PersistedRewardPack[] = [],
			optimisticCurrentLevel = nextCurrentLevel,
			emitLocalState = true
		) => {
			if (emitLocalState) {
				options.onStateChange?.({
					xp: pixlProgression.xp,
					level: pixlProgression.level,
					perkPoints: pixlProgression.perkPoints,
					defence: pixlProgression.defence,
					agility: pixlProgression.agility,
					health: pixlProgression.health,
					attackSpeed: pixlProgression.attackSpeed,
					loadoutRows: pixlProgression.loadoutRows,
					loadoutColumns: pixlProgression.loadoutColumns,
					dungeonKeys,
					ownedWeapons,
					rewardPacks,
					currentLevel: optimisticCurrentLevel,
					highestUnlockedLevel,
					highestClearedLevel,
					completed
				});
			}

			if (!persistenceEnabled || !options.persistPath) {
				return;
			}

			void fetch(options.persistPath, {
				method: 'PATCH',
				keepalive: true,
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					pixlState: {
						xp: pixlProgression.xp,
						defence: pixlProgression.defence,
						agility: pixlProgression.agility,
						dungeonKeys,
						ownedWeapons
					},
					rewardPacks,
					campaignProgress: [
						{
							campaignId: campaign.campaign,
							currentLevel: nextCurrentLevel,
							highestUnlockedLevel,
							highestClearedLevel,
							completed
						}
					]
				})
			}).catch(() => {
				// Keep the simulation running even if persistence fails.
			});
		};

		const emitProgressState = (nextCurrentLevel: number) => {
			options.onStateChange?.({
				xp: pixlProgression.xp,
				level: pixlProgression.level,
				perkPoints: pixlProgression.perkPoints,
				defence: pixlProgression.defence,
				agility: pixlProgression.agility,
				health: pixlProgression.health,
				attackSpeed: pixlProgression.attackSpeed,
				loadoutRows: pixlProgression.loadoutRows,
				loadoutColumns: pixlProgression.loadoutColumns,
				dungeonKeys,
				ownedWeapons,
				rewardPacks: [],
				currentLevel: nextCurrentLevel,
				highestUnlockedLevel,
				highestClearedLevel,
				completed
			});
		};

		const updateArenaMetrics = () => {
			const verticalOffsetRatio = p.width <= 420 ? 0.06 : ARENA_VERTICAL_OFFSET_RATIO;
			centerX = p.width / 2;
			centerY = p.height * (0.5 - verticalOffsetRatio);
			arenaRadius = FIXED_ARENA_RADIUS;
		};

		const getArenaRenderScale = () => {
			const horizontalInset = p.width <= 420 ? 18 : 24;
			const verticalInset = p.width <= 420 ? 18 : 24;
			const maxDiameter = arenaRadius * 2;
			const availableWidth = Math.max(1, p.width - horizontalInset * 2);
			const availableHeight = Math.max(1, p.height - verticalInset * 2);
			return Math.min(1, availableWidth / maxDiameter, availableHeight / maxDiameter);
		};

		const drawScaledArenaLayer = (draw: () => void) => {
			const scale = getArenaRenderScale();

			if (scale >= 0.999) {
				draw();
				return;
			}
			p.push();
			p.translate(centerX, centerY);
			p.scale(scale);
			p.translate(-centerX, -centerY);
			draw();
			p.pop();
		};

		const getEnemyContactRange = (kind: CombatEnemyKind) =>
			Math.max(
				combatProfile.collision.contactRange,
				(pixlShieldPool > 0
					? combatProfile.collision.pixlRadius * 1.45
					: combatProfile.collision.pixlRadius) + ENEMY_VISUALS[kind].radius
			);

		const getEnemyStageMultiplier = (scalingKey: 'healthPerStage' | 'damagePerStage') => {
			const perStage = campaign.baseline.enemyStageScaling?.[scalingKey] ?? 0;

			return Math.pow(1 + perStage, Math.max(0, currentLevel.stage - 1));
		};

		const getEnemyHealthMultiplier = () => {
			return currentLevel.enemyHealthMultiplier ?? getEnemyStageMultiplier('healthPerStage');
		};

		const getEnemyDamageMultiplier = () => {
			return currentLevel.enemyDamageMultiplier ?? getEnemyStageMultiplier('damagePerStage');
		};

		const getEnemyDamageBonus = () => {
			return ('enemyDamageBonus' in currentLevel ? currentLevel.enemyDamageBonus : undefined) ?? 0;
		};

		const getLoadoutLayout = (): LoadoutLayout => {
			const loadoutColumnCount = pixlProgression.loadoutColumns;
			const loadoutRowCount = pixlProgression.loadoutRows;
			const maxGridWidth = Math.min(arenaRadius * 1.2, p.width * 0.28);
			const maxGridHeight = Math.min(arenaRadius * 0.9, p.height * 0.22);
			const rightInset = 28;
			const cellSize = Math.max(
				16,
				Math.floor(Math.min(maxGridWidth / loadoutColumnCount, maxGridHeight / loadoutRowCount))
			);
			const gridWidth = cellSize * loadoutColumnCount;
			const gridHeight = cellSize * loadoutRowCount;

			return {
				cellSize,
				gridWidth,
				gridHeight,
				left: centerX + arenaRadius - gridWidth - rightInset,
				top: centerY - gridHeight / 2
			};
		};

		const recordWeaponDamage = (
			sourceWeaponInstanceId: string | undefined,
			actualDamage: number
		) => {
			if (!sourceWeaponInstanceId || actualDamage <= 0) {
				return;
			}

			cumulativeDamageByWeaponInstanceId[sourceWeaponInstanceId] =
				(cumulativeDamageByWeaponInstanceId[sourceWeaponInstanceId] ?? 0) + actualDamage;

			const sourceWeapon = equippedWeaponByInstanceId.get(sourceWeaponInstanceId)?.definition;

			if (sourceWeapon?.family !== 'mine' || mineShieldTurrets.length === 0) {
				return;
			}

			let didAddShield = false;

			for (const turret of mineShieldTurrets) {
				const addedShield = actualDamage * turret.shieldRatioFromMineDamage;

				if (addedShield <= 0) {
					continue;
				}

				const previousShield = pixlShieldSources[turret.sourceUtilityInstanceId] ?? 0;
				setMineShieldTurretShield(turret.sourceUtilityInstanceId, previousShield + addedShield);

				if ((pixlShieldSources[turret.sourceUtilityInstanceId] ?? 0) <= previousShield) {
					continue;
				}

				activeShieldColor = turret.color;
				didAddShield = true;
			}

			if (didAddShield) {
				recalculatePixlShieldPool();
			}
		};

		const emitCombatState = () => {
			const combatState = {
				stage: currentLevel.stage,
				stageLevel: getResolvedStageLevelNumber(currentLevel),
				campaignLevel: getResolvedLevelNumber(currentLevel),
				pixlHealth: Math.ceil(pixlHealth),
				maxPixlHealth: pixlProgression.health,
				pixlShieldPool: Math.ceil(pixlShieldPool),
				shieldColor: activeShieldColor,
				bankedXp,
				waveXp,
				waveDrops,
				rewardPacks,
				statusTimerRemaining: status === 'running' ? 0 : Math.max(0, statusTimer),
				remainingEnemies: enemies.length + spawnQueue.length,
				composition: {
					biters: getCombatCompositionCount(currentLevel, 'biter'),
					swarmers: getCombatCompositionCount(currentLevel, 'swarmer'),
					tankers: getCombatCompositionCount(currentLevel, 'tanker'),
					shard: getCombatCompositionCount(currentLevel, 'shard'),
					bulwark: getCombatCompositionCount(currentLevel, 'bulwark'),
					shielder: getCombatCompositionCount(currentLevel, 'shielder'),
					zerglitch: getCombatCompositionCount(currentLevel, 'zerglitch'),
					bossMelee: getCombatCompositionCount(currentLevel, 'boss-melee'),
					bossRanged: getCombatCompositionCount(currentLevel, 'boss-ranged'),
					bossHybrid: getCombatCompositionCount(currentLevel, 'boss-hybrid'),
					golem: getCombatCompositionCount(currentLevel, 'golem'),
					sunpriest: getCombatCompositionCount(currentLevel, 'sunpriest'),
					soldier: getCombatCompositionCount(currentLevel, 'soldier'),
					highPriest: getCombatCompositionCount(currentLevel, 'high-priest')
				},
				latestCompletedCycle: currentSweepIndex,
				weaponDamageRows: equippedWeapons
					.map((weapon) => {
						const averageDamagePerCycle =
							publishedAverageDamageByWeaponInstanceId[weapon.instanceId] ?? 0;
						return {
							weaponInstanceId: weapon.instanceId,
							definitionId: weapon.definition.id,
							name: weapon.definition.name,
							rarity: weapon.definition.rarity,
							placement: `${weapon.placementX}, ${weapon.placementY}`,
							averageDamagePerCycle
						};
					})
					.sort(
						(left, right) =>
							right.averageDamagePerCycle - left.averageDamagePerCycle ||
							left.name.localeCompare(right.name)
					),
				status
			};

			const nextKey = JSON.stringify(combatState);

			if (nextKey === lastCombatStateKey) {
				return;
			}

			lastCombatStateKey = nextKey;
			options.onCombatStateChange?.(combatState);
		};

		const emitResumeState = () => {
			const resumeState: ArenaCombatResumeState = {
				campaignId: campaign.campaign,
				currentLevel: getResolvedLevelNumber(currentLevel),
				status,
				levelRewardsCommitted,
				statusTimer,
				currentSweepIndex,
				spawnAccumulator,
				sweepProgress,
				bankedXp,
				waveXp,
				waveDrops,
				pixlHealth,
				pixlShieldPool,
				pixlShieldSources,
				pendingNextWeaponDamageMultiplier,
				weaponDamageMultiplierByInstanceId,
				markedEnemyId,
				activeShieldColor,
				enemyId,
				spawnQueue,
				enemies,
				highestUnlockedLevel,
				highestClearedLevel,
				completed
			};

			const nextKey = JSON.stringify(resumeState);

			if (nextKey === lastResumeStateKey) {
				return;
			}

			lastResumeStateKey = nextKey;
			options.onResumeStateChange?.(resumeState);
		};

		const getPixlShieldCap = () => pixlProgression.health * PIXL_SHIELD_CAP_MULTIPLIER;

		const getOtherPixlShieldTotal = (sourceId: string) =>
			Object.entries(pixlShieldSources).reduce(
				(total, [currentSourceId, amount]) =>
					currentSourceId === sourceId ? total : total + Math.max(0, amount),
				0
			);

		const getMaxPixlShieldForSource = (sourceId: string) =>
			Math.max(0, getPixlShieldCap() - getOtherPixlShieldTotal(sourceId));

		const setPixlShieldSourceAmount = (sourceId: string, amount: number) => {
			const nextAmount = Math.min(Math.max(0, amount), getMaxPixlShieldForSource(sourceId));

			if (nextAmount > 0) {
				pixlShieldSources[sourceId] = nextAmount;
				return;
			}

			delete pixlShieldSources[sourceId];
		};

		const getMineShieldTurretSourceIds = () =>
			new Set(mineShieldTurrets.map((turret) => turret.sourceUtilityInstanceId));

		const getStoneWardSourceShield = (sourceId: string) =>
			Math.max(0, pixlShieldSources[sourceId] ?? 0);

		const getMaxStoneWardShield = (sourceId: string) => {
			const stoneWard = triggeredUtilities.find((utility) => utility.instanceId === sourceId);

			if (!stoneWard || stoneWard.definition.id !== 'stone-ward') {
				return 0;
			}

			if (stoneWard.definition.effect.type !== 'shield-pool') {
				return 0;
			}

			return Math.ceil(
				pixlProgression.health *
					stoneWard.definition.effect.shieldPercent *
					getUtilityShieldOutputMultiplier(sourceId)
			);
		};

		const getActiveStoneWards = (): StoneWardState[] => {
			const stoneWards = triggeredUtilities.filter(
				(utility) => utility.definition.id === 'stone-ward'
			);
			const activeWards: StoneWardState[] = [];

			for (const utility of stoneWards) {
				const shield = getStoneWardSourceShield(utility.instanceId);

				if (shield <= 0) {
					continue;
				}

				const lineWidth = 8;
				const maxShield = Math.max(shield, getMaxStoneWardShield(utility.instanceId));
				activeWards.push({
					sourceUtilityInstanceId: utility.instanceId,
					radius: combatProfile.collision.pixlRadius + 34 + activeWards.length * 12,
					lineWidth,
					color: utility.definition.utilityVisual?.color ?? '#cbd5e1',
					glow: utility.definition.utilityVisual?.glow ?? true,
					pulse: pixlAuraClock,
					shield,
					maxShield
				});
			}

			return activeWards;
		};

		const applyDamageToShieldSource = (sourceId: string, damage: number) => {
			const currentShield = getStoneWardSourceShield(sourceId);
			const absorbed = Math.min(currentShield, Math.max(0, damage));

			if (absorbed <= 0) {
				return 0;
			}

			setPixlShieldSourceAmount(sourceId, currentShield - absorbed);
			recalculatePixlShieldPool();
			return absorbed;
		};

		const clampEnemyOutsideStoneWard = (enemy: EnemyState) => {
			const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
			const activeStoneWards = [...getActiveStoneWards()].sort(
				(left, right) => right.radius - left.radius
			);

			for (const ward of activeStoneWards) {
				const dx = enemy.x - centerX;
				const dy = enemy.y - centerY;
				const distance = Math.hypot(dx, dy);
				const minimumDistance = ward.radius + enemyRadius;

				if (distance >= minimumDistance) {
					continue;
				}

				const normalX = distance > 0.001 ? dx / distance : 1;
				const normalY = distance > 0.001 ? dy / distance : 0;
				enemy.x = centerX + normalX * minimumDistance;
				enemy.y = centerY + normalY * minimumDistance;
				return ward;
			}

			return null;
		};

		const clampMineShieldTurretShieldsToCap = () => {
			const mineShieldTurretSourceIds = getMineShieldTurretSourceIds();
			const nonTurretShieldTotal = Object.entries(pixlShieldSources).reduce(
				(total, [sourceId, amount]) =>
					mineShieldTurretSourceIds.has(sourceId) ? total : total + amount,
				0
			);
			let remainingTurretShieldCap = Math.max(0, getPixlShieldCap() - nonTurretShieldTotal);

			for (const turret of mineShieldTurrets) {
				const sourceId = turret.sourceUtilityInstanceId;
				const currentShield = Math.max(0, pixlShieldSources[sourceId] ?? 0);
				const clampedShield = Math.min(currentShield, remainingTurretShieldCap);
				pixlShieldSources[sourceId] = clampedShield;
				remainingTurretShieldCap = Math.max(0, remainingTurretShieldCap - clampedShield);
			}
		};

		const recalculatePixlShieldPool = () => {
			clampMineShieldTurretShieldsToCap();

			pixlShieldPool = Object.values(pixlShieldSources).reduce(
				(total, amount) => total + amount,
				0
			);

			if (pixlShieldPool <= 0) {
				pixlShieldPool = 0;
				activeShieldColor = '#60a5fa';
			}
		};

		const hasActiveVanishRune = () =>
			activeVanishRune !== null && activeVanishRune.age < activeVanishRune.duration;

		const applyVanishRune = (utility: EquippedUtilityState, durationCycles: number) => {
			activeVanishRune = {
				sourceUtilityInstanceId: utility.instanceId,
				age: 0,
				duration: Math.max(1, durationCycles) / Math.max(0.001, pixlProgression.attackSpeed),
				radius: combatProfile.collision.pixlRadius + 22,
				color: utility.definition.utilityVisual?.color ?? '#86efac',
				glow: utility.definition.utilityVisual?.glow ?? true,
				pulse: pixlAuraClock
			};
		};

		const setMineShieldTurretShield = (sourceId: string, amount: number) => {
			setPixlShieldSourceAmount(sourceId, amount);
		};

		const addPixlShieldFromSource = (sourceId: string, amount: number, color: string) => {
			if (amount <= 0) {
				return;
			}

			setPixlShieldSourceAmount(sourceId, (pixlShieldSources[sourceId] ?? 0) + amount);
			activeShieldColor = color;
			recalculatePixlShieldPool();
		};

		const resetUtilityCooldowns = () => {
			for (const utility of triggeredUtilities) {
				utility.cyclesUntilTrigger = utility.cycleInterval;
			}
		};

		const applyStartingShieldUtilities = () => {
			for (const utility of triggeredUtilities) {
				if (!utility.definition.startCharged || utility.definition.effect.type !== 'shield-pool') {
					continue;
				}

				setPixlShieldSourceAmount(
					utility.instanceId,
					Math.ceil(
						pixlProgression.health *
							utility.definition.effect.shieldPercent *
							getUtilityShieldOutputMultiplier(utility.instanceId)
					)
				);
				activeShieldColor = utility.definition.utilityVisual?.color ?? '#60a5fa';
			}

			recalculatePixlShieldPool();
		};

		const syncCanvasSize = () => {
			if (!canvas) {
				return;
			}

			const { width, height } = getCanvasSize(canvas, MAX_WIDTH, BASE_HEIGHT);

			if (width === p.width && height === p.height) {
				return;
			}

			const previousCenterX = centerX;
			const previousCenterY = centerY;

			p.resizeCanvas(width, height);
			updateArenaMetrics();

			const deltaX = centerX - previousCenterX;
			const deltaY = centerY - previousCenterY;

			for (const enemy of enemies) {
				enemy.x += deltaX;
				enemy.y += deltaY;
			}

			for (const projectile of projectiles) {
				projectile.x += deltaX;
				projectile.y += deltaY;
			}
		};

		const startLevel = (levelIndex: number) => {
			currentLevelIndex = levelIndex;
			currentLevel = resolveLevel(currentLevelIndex);
			levelRewardsCommitted = false;
			status = 'running';
			statusTimer = 0;
			currentSweepIndex = 0;
			currentLevelElapsedTime = 0;
			spawnAccumulator = 0;
			sweepProgress = 0;
			waveXp = 0;
			waveDrops = [];
			rewardPacks = [];
			pixlHealth = pixlProgression.health;
			pixlShieldPool = 0;
			pixlShieldSources = {};
			enemyBeams = [];
			knifeRemainingRicochetsByInstanceId = {};
			pendingNextWeaponDamageMultiplier = 1;
			weaponDamageMultiplierByInstanceId = Object.fromEntries(
				equippedWeapons.map((weapon) => [weapon.instanceId, 1])
			) as Record<string, number>;
			ascenderBeamTickTimersByInstanceId = Object.fromEntries(
				ascendedPeaShooters.map((weapon) => [weapon.instanceId, 0.2])
			) as Record<string, number>;
			activeShieldColor = '#60a5fa';
			resetUtilityCooldowns();
			applyStartingShieldUtilities();
			cycleDamageMultiplier = 1;
			cycleDamageBuffExpiresAfterSweepIndex = null;
			elementalCycleDamageMultipliers = createEmptyElementalDamageMultipliers();
			elementalCycleBuffExpiresAfterSweepIndex = createEmptyElementalExpiryState();
			pixlAuraClock = 0;
			pixlFlash = 0;
			markedEnemyId = null;
			enemyId = 0;
			enemies = [];
			projectiles = [];
			enemyProjectiles = [];
			activeVanishRune = null;
			forceFields = [];
			killSwitchPulses = [];
			vulnerablePulses = [];
			parasiteBloomPulses = [];
			stasisFields = [];
			prismPrisons = [];
			laserSweeps = [];
			perimeterMines = [];
			turretMines = [];
			mineShieldTurrets = [];
			supportPylons = [];
			laserRods = [];
			turretMineBursts = [];
			needleBursts = [];
			executionLatticeStrikes = [];
			forkLightningBursts = [];
			flamethrowerCones = [];
			iceSpikes = [];
			blizzardStorms = [];
			voidRifts = [];
			voidTendrils = [];
			naturesWraths = [];
			pixlSwallowPulses = [];
			voidTunnels = [];
			phaseshifts = [];
			oathbreakerSigils = [];
			mirrorArrays = [];
			runeCasts = [];
			sunRunes = [];
			healingRunes = [];
			slowingRunes = [];
			sunbrandRunes = [];
			bindingRunes = [];
			judgmentRunes = [];
			pendingRuneEchoes = [];
			currentSweepTriggeredRuneTypes = new Set<TriggeredSweepRuneType>();
			currentSweepTriggeredRuneCount = 0;
			triggeredRuneReplays = [];
			lastTriggeredRuneReplayIndexByWeaponInstanceId = {};
			burningGrounds = [];
			delayedBombs = [];
			hemorrhageBursts = [];
			knifeTrailSegments = [];
			sniperLocks = [];
			sniperChainBursts = [];
			spawnQueue = shuffleInPlace(buildSpawnQueue(currentLevel), p);

			if (spawnQueue.length > 0) {
				spawnEnemy(spawnQueue.shift() as CombatEnemyKind);
			}
		};

		const getCurrentStageStartLevelIndex = () => {
			if (endlessMode) {
				return Math.max(0, (currentLevel.stage - 1) * campaign.levelsPerStage);
			}

			return Math.max(0, (currentLevel.stage - 1) * campaign.levelsPerStage);
		};

		const getAdjustedWeaponDamage = (
			weapon: WeaponDefinition,
			multiplier = 1,
			sourceWeaponInstanceId?: string
		) => {
			const sourceDamageMultiplier = sourceWeaponInstanceId
				? (weaponDamageMultiplierByInstanceId[sourceWeaponInstanceId] ?? 1)
				: 1;
			const adjacencyDamageMultiplier = sourceWeaponInstanceId
				? (weaponAdjacencyDamageMultiplierByInstanceId[sourceWeaponInstanceId] ?? 1)
				: 1;
			const familyDamageMultiplier = weapon.family === 'mine' ? sharedMineDamageMultiplier : 1;
			const elementalDamageMultiplier = weapon.attack.requiredInfusion
				? elementalCycleDamageMultipliers[weapon.attack.requiredInfusion]
				: 1;
			const knifePackageDamageMultiplier = isSocketedKnifeSource(sourceWeaponInstanceId) ? 2.5 : 1;

			return Math.max(
				1,
				Math.round(
					weapon.baseDamage *
						cycleDamageMultiplier *
						elementalDamageMultiplier *
						familyDamageMultiplier *
						adjacencyDamageMultiplier *
						multiplier *
						sourceDamageMultiplier *
						knifePackageDamageMultiplier
				)
			);
		};

		const hasActiveElementalMastery = () => {
			return (
				Object.keys(elementalCycleBuffExpiresAfterSweepIndex) as ElementalInfusionType[]
			).every((element) => elementalCycleBuffExpiresAfterSweepIndex[element] !== null);
		};

		const getPendingElementalMasteryReservation = (element: ElementalInfusionType) => {
			void element;

			return triggeredUtilities.filter(
				(utility) =>
					utility.definition.effect.type === 'elemental-mastery' && utility.cyclesUntilTrigger <= 1
			).length;
		};

		const getAdjustedMinePlacementCount = (weapon: WeaponDefinition) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'perimeter-mine') {
				return Math.max(1, weapon.attack.projectileCount);
			}

			const basePlacementCount = special.placementCount ?? weapon.attack.projectileCount;
			const familyProjectileBonus = weapon.family === 'mine' ? sharedMineProjectileBonus : 0;

			return Math.max(1, basePlacementCount + familyProjectileBonus);
		};

		const getTurretMineReplicationShotCount = (weapon: WeaponDefinition) => {
			if (weapon.family !== 'mine') {
				return Math.max(1, weapon.attack.projectileCount);
			}

			return getAdjustedMinePlacementCount(weapon);
		};

		const getMineWeaponDamageTotal = () => {
			return equippedWeapons.reduce((total, weapon) => {
				if (weapon.definition.family !== 'mine') {
					return total;
				}

				return total + (cumulativeDamageByWeaponInstanceId[weapon.instanceId] ?? 0);
			}, 0);
		};

		const isPointInsideSupportPylon = (
			pylon: SupportPylonState,
			x: number,
			y: number,
			padding = 0
		) => {
			return Math.hypot(x - pylon.centerX, y - pylon.centerY) <= pylon.radius + padding;
		};

		const getSupportPylonsCoveringPoint = (
			x: number,
			y: number,
			variant?: SupportPylonState['variant'],
			padding = 0
		) => {
			return supportPylons.filter(
				(pylon) =>
					(!variant || pylon.variant === variant) && isPointInsideSupportPylon(pylon, x, y, padding)
			);
		};

		const getMarkBeaconDamageMultiplierAtPoint = (x: number, y: number) => {
			return getSupportPylonsCoveringPoint(x, y, 'mark-beacon').reduce(
				(multiplier, pylon) => Math.max(multiplier, pylon.markDamageMultiplier),
				1
			);
		};

		const getMineCalibratorEffectAtPoint = (x: number, y: number) => {
			return getSupportPylonsCoveringPoint(x, y, 'mine-calibrator').reduce(
				(effect, pylon) => ({
					mineTriggerRadiusBonus: Math.max(
						effect.mineTriggerRadiusBonus,
						pylon.mineTriggerRadiusBonus
					),
					mineBlastRadiusMultiplier: Math.max(
						effect.mineBlastRadiusMultiplier,
						pylon.mineBlastRadiusMultiplier
					),
					minePayloadDamageMultiplier: Math.max(
						effect.minePayloadDamageMultiplier,
						pylon.minePayloadDamageMultiplier
					)
				}),
				{
					mineTriggerRadiusBonus: 0,
					mineBlastRadiusMultiplier: 1,
					minePayloadDamageMultiplier: 1
				}
			);
		};

		const getDominantColdLatticeAtPoint = (x: number, y: number, padding = 0) => {
			let bestPylon: SupportPylonState | null = null;
			let bestDistance = Number.POSITIVE_INFINITY;

			for (const pylon of supportPylons) {
				if (pylon.variant !== 'cold-lattice' || !isPointInsideSupportPylon(pylon, x, y, padding)) {
					continue;
				}

				const distance = Math.hypot(x - pylon.centerX, y - pylon.centerY);

				if (distance < bestDistance) {
					bestDistance = distance;
					bestPylon = pylon;
				}
			}

			return bestPylon;
		};

		const getDominantHemorrhageRelayAtPoint = (x: number, y: number, padding = 0) => {
			let bestPylon: SupportPylonState | null = null;
			let bestMultiplier = 1;

			for (const pylon of supportPylons) {
				if (
					pylon.variant !== 'hemorrhage-relay' ||
					!isPointInsideSupportPylon(pylon, x, y, padding)
				) {
					continue;
				}

				if (pylon.bleedDamageMultiplier > bestMultiplier) {
					bestMultiplier = pylon.bleedDamageMultiplier;
					bestPylon = pylon;
				}
			}

			return bestPylon;
		};

		const rollLevelRewardPacks = () => {
			if (!rewardsEnabled || !isCampaignLevel(currentLevel)) {
				return [] as PersistedRewardPack[];
			}

			return buildRewardPacksForLevel({
				campaignId: campaign.campaign,
				stage: currentLevel.stage,
				isStageBoss: currentLevel.isStageBoss,
				isCampaignBoss: currentLevel.isCampaignBoss,
				sourceCampaignLevel: currentLevel.campaignLevel,
				randomFloat: () => p.random(),
				randomIndex: (maxExclusive) => Math.floor(p.random(maxExclusive)),
				createPackId: () => createRewardPackId(Math.floor(p.random(1_000_000_000)))
			});
		};

		const BOSS_HEALTH_ANCHOR_BASE = 146;
		const BOSS_HEALTH_PER_STAGE = 0.34;
		const BOSS_DAMAGE_PER_STAGE = 0.2;
		const DAMAGE_CHECK_HEALTH_MULTIPLIERS = [12, 14, 16, 18] as const;
		const SURVIVABILITY_HEALTH_MULTIPLIERS = [10, 12, 14, 16] as const;

		const getBossAnchorHealth = (stage: number) => {
			return Math.max(
				1,
				Math.round(
					BOSS_HEALTH_ANCHOR_BASE * Math.pow(1 + BOSS_HEALTH_PER_STAGE, Math.max(0, stage - 1))
				)
			);
		};

		const isBossEnemyKind = (kind: CombatEnemyKind) => {
			return (
				kind === 'boss-melee' ||
				kind === 'boss-ranged' ||
				kind === 'boss-hybrid' ||
				kind === 'high-priest'
			);
		};

		const isBossFocusedSingleTargetWeapon = (weapon: WeaponDefinition | null) => {
			if (!weapon) {
				return false;
			}

			const specialType = weapon.attack.special?.type;

			if (weapon.attack.projectileCount !== 1) {
				return false;
			}

			if ((weapon.attack.impactRadius ?? 0) > 0 || (weapon.attack.pierceCount ?? 0) > 0) {
				return false;
			}

			return ![
				'force-field',
				'kill-switch',
				'laser-sweep',
				'needle-fan',
				'execution-lattice',
				'fork-lightning',
				'burning-ground',
				'delayed-bomb',
				'flamethrower-cone',
				'ice-shower',
				'natures-wrath',
				'void-tendrils',
				'void-rift',
				'void-tunnel',
				'perimeter-mine',
				'turret-mine',
				'support-pylon',
				'laser-rod-network'
			].includes(specialType ?? '');
		};

		const isAoeOrMultiTargetWeapon = (weapon: WeaponDefinition | null) => {
			if (!weapon) {
				return false;
			}

			const specialType = weapon.attack.special?.type;

			return (
				weapon.attack.projectileCount > 1 ||
				(weapon.attack.impactRadius ?? 0) > 0 ||
				(weapon.attack.pierceCount ?? 0) > 0 ||
				weapon.family === 'mine' ||
				[
					'force-field',
					'kill-switch',
					'laser-sweep',
					'needle-fan',
					'execution-lattice',
					'fork-lightning',
					'burning-ground',
					'delayed-bomb',
					'flamethrower-cone',
					'ice-shower',
					'natures-wrath',
					'void-tendrils',
					'void-rift',
					'void-tunnel',
					'perimeter-mine',
					'turret-mine',
					'support-pylon',
					'laser-rod-network'
				].includes(specialType ?? '')
			);
		};

		const getBossTargetHealth = (kind: CombatEnemyKind, stage: number) => {
			const anchorHealth = getBossAnchorHealth(stage);
			const stageIndex = Math.max(
				0,
				Math.min(stage - 1, DAMAGE_CHECK_HEALTH_MULTIPLIERS.length - 1)
			);
			const bossHealthMultiplier = currentLevel.bossHealthMultiplier ?? 1;
			let targetHealth: number | null = null;

			if (kind === 'boss-melee') {
				targetHealth = anchorHealth * DAMAGE_CHECK_HEALTH_MULTIPLIERS[stageIndex];
			}

			if (kind === 'boss-ranged') {
				targetHealth = anchorHealth * SURVIVABILITY_HEALTH_MULTIPLIERS[stageIndex];
			}

			if (kind === 'boss-hybrid') {
				targetHealth = anchorHealth * 40;
			}

			if (kind === 'high-priest') {
				targetHealth = Math.max(getEnemyStats(kind).health, anchorHealth * 40);
			}

			if (targetHealth === null) {
				return null;
			}

			return Math.max(1, Math.round(targetHealth * bossHealthMultiplier));
		};

		const getBossDamageMultiplier = (stage: number) => {
			if (currentLevel.bossDamageMultiplier !== undefined) {
				return currentLevel.bossDamageMultiplier;
			}

			if (currentLevel.enemyDamageMultiplier !== undefined) {
				return currentLevel.enemyDamageMultiplier;
			}

			return 1 + Math.max(0, stage - 1) * BOSS_DAMAGE_PER_STAGE;
		};

		const getBossDamageBonus = () => {
			if (currentLevel.bossDamageBonus !== undefined) {
				return currentLevel.bossDamageBonus;
			}

			return ('enemyDamageBonus' in currentLevel ? currentLevel.enemyDamageBonus : undefined) ?? 0;
		};

		const getXpForEnemyKind = (kind: CombatEnemyKind) => {
			const xpPerEnemy = (currentLevel.xpPerEnemy ?? {}) as Record<string, number | undefined>;

			if (kind === 'boss-melee') {
				return xpPerEnemy.bossMelee ?? 0;
			}

			if (kind === 'boss-ranged') {
				return xpPerEnemy.bossRanged ?? 0;
			}

			if (kind === 'boss-hybrid') {
				return xpPerEnemy.bossHybrid ?? 0;
			}

			return xpPerEnemy[kind] ?? 0;
		};

		const getBossEnemyOverrides = (
			kind: CombatEnemyKind
		):
			| Partial<
					Pick<
						EnemyState,
						| 'holdRadius'
						| 'orbitDirection'
						| 'health'
						| 'maxHealth'
						| 'moveSpeedMultiplier'
						| 'damageMultiplier'
						| 'damageBonus'
					>
			  >
			| undefined => {
			const targetHealth = getBossTargetHealth(kind, currentLevel.stage);

			if (targetHealth === null) {
				return undefined;
			}

			return {
				health: targetHealth,
				maxHealth: targetHealth,
				damageMultiplier: getBossDamageMultiplier(currentLevel.stage),
				damageBonus: getBossDamageBonus()
			};
		};

		const createEnemyState = (
			kind: CombatEnemyKind,
			x: number,
			y: number,
			overrides?: Partial<
				Pick<
					EnemyState,
					| 'holdRadius'
					| 'orbitDirection'
					| 'health'
					| 'maxHealth'
					| 'moveSpeedMultiplier'
					| 'damageMultiplier'
					| 'damageBonus'
				>
			>
		): EnemyState => {
			const stats = getEnemyStats(kind);
			const attackInterval = 1 / stats.attackSpeed;
			const preferredRange = stats.preferredRange ?? getEnemyContactRange(kind);
			const prefersRangeControl = stats.attackPattern === 'siege' || stats.attackPattern === 'beam';
			const holdRadius = prefersRangeControl
				? FIXED_SPAWN_RADIUS
				: preferredRange + p.random(-12, 16);
			const healthMultiplier = getEnemyHealthMultiplier();
			const scaledHealth = Math.max(1, Math.round(stats.health * healthMultiplier));
			const initialAttackTimer = prefersRangeControl ? attackInterval * 2.5 : attackInterval;

			return {
				id: enemyId,
				kind,
				x,
				y,
				health: overrides?.health ?? scaledHealth,
				maxHealth: overrides?.maxHealth ?? scaledHealth,
				bleedStoredDamage: 0,
				bleedDurationRemaining: 0,
				bleedSourceWeaponInstanceId: null,
				bleedRicochetStep: 0,
				bleedLifeStealRatio: 0,
				attackTimer: initialAttackTimer,
				hitFlash: 0,
				orbitDirection: overrides?.orbitDirection ?? (p.random() < 0.5 ? -1 : 1),
				holdRadius: overrides?.holdRadius ?? holdRadius,
				supportShieldPool: 0,
				supportShieldTimer: 0,
				shieldPulseTimer: 0,
				shieldPulseCooldown: p.random(0, Math.max(0.15, (stats.onHitShieldCooldown ?? 0) * 0.5)),
				confusionTimer: 0,
				slowTimer: 0,
				slowMultiplier: 1,
				sunbrandTimer: 0,
				sunbrandBaseDamage: 0,
				sunbrandTriggerDamageMultiplier: 0,
				sunbrandSourceWeaponInstanceId: null,
				bindingRuneHitCount: 0,
				bindingRuneDamageMultiplierPerHit: 0,
				bindingRuneSourceWeaponInstanceId: null,
				voidTouchedTimer: 0,
				fireExposedTimer: 0,
				lifeStealMarkTimer: 0,
				lifeStealMarkRatio: 0,
				parasiteBloomTimer: 0,
				parasiteBloomDuration: 0,
				parasiteBloomHealRatio: 0,
				parasiteBloomPulseRadius: 0,
				parasiteBloomColor: null,
				vulnerableTimer: 0,
				chillAmount: 0,
				frozenTimer: 0,
				moveSpeedMultiplier: overrides?.moveSpeedMultiplier ?? 1,
				damageMultiplier: overrides?.damageMultiplier ?? getEnemyDamageMultiplier(),
				damageBonus: overrides?.damageBonus ?? getEnemyDamageBonus()
			};
		};

		const applyChillToEnemy = (enemy: EnemyState, amount: number, freezeDuration: number) => {
			if (enemy.frozenTimer > 0) {
				return;
			}

			enemy.chillAmount = Math.min(1, enemy.chillAmount + amount);

			if (enemy.chillAmount >= 1) {
				enemy.chillAmount = 1;
				enemy.frozenTimer = Math.max(enemy.frozenTimer, freezeDuration);
			}
		};

		const resolveBleedSourceSpec = (
			sourceWeapon: WeaponDefinition | null,
			sourceWeaponInstanceId: string | undefined
		) => {
			if (!sourceWeapon || !sourceWeaponInstanceId) {
				return null;
			}

			if (sourceWeapon.attack.special?.type === 'bleed-hit') {
				return sourceWeapon.attack.special;
			}

			return null;
		};

		const applyBleedToEnemy = (
			enemyIndex: number,
			baseStoredDamage: number,
			duration: number,
			sourceWeaponInstanceId: string,
			lifeStealRatio: number,
			options: {
				allowHemorrhageBurst?: boolean;
				ricochetStep?: number;
			} = {}
		) => {
			const enemy = enemies[enemyIndex];

			if (!enemy) {
				return 0;
			}

			if (baseStoredDamage <= 0 || duration <= 0) {
				return 0;
			}

			const hemorrhageRelay = getDominantHemorrhageRelayAtPoint(
				enemy.x,
				enemy.y,
				ENEMY_VISUALS[enemy.kind].radius
			);
			const effectiveStoredDamage =
				baseStoredDamage * (hemorrhageRelay?.bleedDamageMultiplier ?? 1);

			const existingSourceHasSiphon =
				Boolean(activeKnifeSiphonEffect) &&
				isSocketedKnifeSource(enemy.bleedSourceWeaponInstanceId);
			const nextSourceHasSiphon =
				Boolean(activeKnifeSiphonEffect) && isSocketedKnifeSource(sourceWeaponInstanceId);

			enemy.bleedStoredDamage += effectiveStoredDamage;
			enemy.bleedDurationRemaining = Math.max(enemy.bleedDurationRemaining, duration);
			enemy.bleedRicochetStep = Math.max(enemy.bleedRicochetStep, options.ricochetStep ?? 0);
			enemy.bleedLifeStealRatio = Math.max(enemy.bleedLifeStealRatio, lifeStealRatio);

			if (!enemy.bleedSourceWeaponInstanceId || nextSourceHasSiphon || !existingSourceHasSiphon) {
				enemy.bleedSourceWeaponInstanceId = sourceWeaponInstanceId;
			}

			return effectiveStoredDamage / duration;
		};

		const spawnEnemy = (kind: CombatEnemyKind) => {
			const angle = p.random(p.TWO_PI);
			const x = centerX + Math.cos(angle) * FIXED_SPAWN_RADIUS;
			const y = centerY + Math.sin(angle) * FIXED_SPAWN_RADIUS;

			enemies.push(createEnemyState(kind, x, y, getBossEnemyOverrides(kind)));
			enemyId += 1;
		};

		const spawnEnemyAtPosition = (
			kind: CombatEnemyKind,
			x: number,
			y: number,
			overrides?: Partial<
				Pick<
					EnemyState,
					'holdRadius' | 'orbitDirection' | 'health' | 'maxHealth' | 'moveSpeedMultiplier'
				>
			>
		) => {
			enemies.push(
				createEnemyState(kind, x, y, {
					holdRadius: getEnemyContactRange(kind) + p.random(-8, 12),
					...overrides
				})
			);
			enemyId += 1;
		};

		const getClosestEnemy = () => {
			let closestEnemy: EnemyState | null = null;
			let closestDistance = Number.POSITIVE_INFINITY;

			for (const enemy of enemies) {
				if (isEnemyCapturedByVoidTendril(enemy.id)) {
					continue;
				}

				const distance = Math.hypot(enemy.x - centerX, enemy.y - centerY);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestEnemy = enemy;
				}
			}

			return closestEnemy;
		};

		const getFrontlineHealTarget = (sourceEnemyId: number) => {
			let bestEnemy: EnemyState | null = null;
			let bestScore = 0;

			for (const enemy of enemies) {
				if (
					enemy.id === sourceEnemyId ||
					enemy.health >= enemy.maxHealth ||
					isEnemyCapturedByVoidTendril(enemy.id)
				) {
					continue;
				}

				const missingHealthRatio = 1 - enemy.health / Math.max(1, enemy.maxHealth);
				const distanceToPixl = Math.hypot(enemy.x - centerX, enemy.y - centerY);
				const frontlineRatio = 1 - Math.min(1, distanceToPixl / Math.max(1, FIXED_SPAWN_RADIUS));
				const score = missingHealthRatio * 1.5 + frontlineRatio;

				if (score > bestScore) {
					bestScore = score;
					bestEnemy = enemy;
				}
			}

			return bestEnemy;
		};

		const getClosestShieldableEnemy = () => {
			let closestEnemy: EnemyState | null = null;
			let closestDistance = Number.POSITIVE_INFINITY;

			for (const enemy of enemies) {
				if (enemy.kind === 'bulwark' || isEnemyCapturedByVoidTendril(enemy.id)) {
					continue;
				}

				const distance = Math.hypot(enemy.x - centerX, enemy.y - centerY);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestEnemy = enemy;
				}
			}

			return closestEnemy;
		};

		const getClosestEnemiesToPoint = (
			originX: number,
			originY: number,
			limit: number,
			maxDistance = Number.POSITIVE_INFINITY,
			excludeEnemyIds: number[] = []
		) => {
			return [...enemies]
				.filter(
					(enemy) => !excludeEnemyIds.includes(enemy.id) && !isEnemyCapturedByVoidTendril(enemy.id)
				)
				.map((enemy) => ({
					enemy,
					distance: Math.hypot(enemy.x - originX, enemy.y - originY)
				}))
				.filter(({ distance }) => distance <= maxDistance)
				.sort((left, right) => left.distance - right.distance)
				.slice(0, limit)
				.map(({ enemy }) => enemy);
		};

		const getFurthestEnemy = () => {
			let furthestEnemy: EnemyState | null = null;
			let furthestDistance = Number.NEGATIVE_INFINITY;

			for (const enemy of enemies) {
				if (isEnemyCapturedByVoidTendril(enemy.id)) {
					continue;
				}

				const distance = Math.hypot(enemy.x - centerX, enemy.y - centerY);

				if (distance > furthestDistance) {
					furthestDistance = distance;
					furthestEnemy = enemy;
				}
			}

			return furthestEnemy;
		};

		const isRangedEnemy = (enemy: EnemyState) => {
			const attackPattern = getEnemyStats(enemy.kind).attackPattern;

			return attackPattern === 'siege' || attackPattern === 'beam';
		};

		const isBossEnemy = (enemy: EnemyState) => {
			return (
				enemy.kind === 'boss-melee' ||
				enemy.kind === 'boss-ranged' ||
				enemy.kind === 'boss-hybrid' ||
				enemy.kind === 'high-priest'
			);
		};

		const isEnemyCapturedByVoidTendril = (enemyId: number) => {
			return (
				voidTendrils.some((tendril) => tendril.enemyId === enemyId) ||
				naturesWraths.some((tendril) => tendril.enemyId === enemyId)
			);
		};

		const getCurrentCycleProgress = () => {
			return currentSweepIndex + sweepProgress / Math.max(1, pixlProgression.loadoutColumns);
		};

		const getLaserRodPlacementPoint = (targeting: WeaponTargetingKind) => {
			if (!isPlacementWeaponTargetingKind(targeting)) {
				return null;
			}

			const axisOffset = arenaRadius * 0.64;
			const offsetByTargeting: Record<
				Extract<
					WeaponTargetingKind,
					| 'top-left'
					| 'top-middle'
					| 'top-right'
					| 'middle-left'
					| 'middle-right'
					| 'bottom-left'
					| 'bottom-middle'
					| 'bottom-right'
				>,
				{ x: number; y: number }
			> = {
				'top-left': { x: -axisOffset, y: -axisOffset },
				'top-middle': { x: 0, y: -axisOffset },
				'top-right': { x: axisOffset, y: -axisOffset },
				'middle-left': { x: -axisOffset, y: 0 },
				'middle-right': { x: axisOffset, y: 0 },
				'bottom-left': { x: -axisOffset, y: axisOffset },
				'bottom-middle': { x: 0, y: axisOffset },
				'bottom-right': { x: axisOffset, y: axisOffset }
			};

			const offset = offsetByTargeting[targeting];

			return {
				x: centerX + offset.x,
				y: centerY + offset.y
			};
		};

		const getWeaponTargetFromPool = (
			targetPool: EnemyState[],
			targeting: WeaponAttackBehavior['targeting']
		) => {
			const targetablePool = targetPool.filter((enemy) => !isEnemyCapturedByVoidTendril(enemy.id));

			if (targetablePool.length === 0) {
				return null;
			}

			if (targeting === 'strongest-target') {
				return [...targetablePool].sort((left, right) => right.health - left.health)[0] ?? null;
			}

			if (targeting === 'weakest-target') {
				return [...targetablePool].sort((left, right) => left.health - right.health)[0] ?? null;
			}

			if (targeting === 'furthest-target') {
				return (
					[...targetablePool].sort(
						(left, right) =>
							Math.hypot(right.x - centerX, right.y - centerY) -
							Math.hypot(left.x - centerX, left.y - centerY)
					)[0] ?? null
				);
			}

			return (
				[...targetablePool].sort(
					(left, right) =>
						Math.hypot(left.x - centerX, left.y - centerY) -
						Math.hypot(right.x - centerX, right.y - centerY)
				)[0] ?? null
			);
		};

		const getRangedEnemyTarget = (targeting: WeaponAttackBehavior['targeting']) => {
			return getWeaponTargetFromPool(
				enemies.filter((enemy) => isRangedEnemy(enemy)),
				targeting
			);
		};

		const buildRangedBounceTargets = (
			initialTarget: EnemyState,
			maxChainTargets: number,
			bounceRange: number
		) => {
			const chainTargets: EnemyState[] = [initialTarget];
			const claimedEnemyIds = new Set<number>([initialTarget.id]);
			let currentTarget = initialTarget;

			while (chainTargets.length < maxChainTargets) {
				const nextTarget = enemies
					.filter(
						(enemy) =>
							isRangedEnemy(enemy) &&
							!isEnemyCapturedByVoidTendril(enemy.id) &&
							!claimedEnemyIds.has(enemy.id) &&
							Math.hypot(enemy.x - currentTarget.x, enemy.y - currentTarget.y) <= bounceRange
					)
					.sort(
						(left, right) =>
							Math.hypot(left.x - currentTarget.x, left.y - currentTarget.y) -
							Math.hypot(right.x - currentTarget.x, right.y - currentTarget.y)
					)[0];

				if (!nextTarget) {
					break;
				}

				chainTargets.push(nextTarget);
				claimedEnemyIds.add(nextTarget.id);
				currentTarget = nextTarget;
			}

			return chainTargets;
		};

		const getWeaponTarget = (targeting: WeaponAttackBehavior['targeting']) => {
			const targetableEnemies = enemies.filter((enemy) => !isEnemyCapturedByVoidTendril(enemy.id));
			const placementTarget = getLaserRodPlacementPoint(targeting);

			if (placementTarget) {
				return placementTarget;
			}

			if (targeting === 'strongest-target') {
				return [...targetableEnemies].sort((left, right) => right.health - left.health)[0] ?? null;
			}

			if (targeting === 'weakest-target') {
				return [...targetableEnemies].sort((left, right) => left.health - right.health)[0] ?? null;
			}

			if (targeting === 'furthest-target') {
				return getFurthestEnemy();
			}

			return getClosestEnemy();
		};

		const isEnemyTarget = (target: { x: number; y: number } | null): target is EnemyState => {
			return target !== null && 'id' in target && 'kind' in target;
		};

		const getEnemyWeaponTarget = (targeting: WeaponAttackBehavior['targeting']) => {
			const target = getWeaponTarget(targeting);
			return isEnemyTarget(target) ? target : null;
		};

		const getMarkedEnemy = () => {
			if (markedEnemyId === null) {
				return null;
			}

			const markedEnemy = enemies.find((enemy) => enemy.id === markedEnemyId) ?? null;
			return markedEnemy && !isEnemyCapturedByVoidTendril(markedEnemy.id) ? markedEnemy : null;
		};

		const assignMarkedEnemy = (enemy: EnemyState | null) => {
			markedEnemyId = enemy?.id ?? null;
			return enemy;
		};

		const ensureMarkedEnemy = () => {
			if (!targetPainterEffect) {
				markedEnemyId = null;
				return null;
			}

			const existingMarkedEnemy = getMarkedEnemy();

			if (existingMarkedEnemy) {
				return existingMarkedEnemy;
			}

			return assignMarkedEnemy(getEnemyWeaponTarget('strongest-target'));
		};

		const bounceMarkedEnemy = (originX: number, originY: number, defeatedEnemyId: number) => {
			if (!targetPainterEffect) {
				markedEnemyId = null;
				return null;
			}

			const [nearbyEnemy] = getClosestEnemiesToPoint(
				originX,
				originY,
				1,
				Number.POSITIVE_INFINITY,
				[defeatedEnemyId]
			);

			if (nearbyEnemy) {
				return assignMarkedEnemy(nearbyEnemy);
			}

			return assignMarkedEnemy(getEnemyWeaponTarget('strongest-target'));
		};

		const getClosestEnemies = (count: number) => {
			return [...enemies]
				.filter((enemy) => !isEnemyCapturedByVoidTendril(enemy.id))
				.sort(
					(left, right) =>
						Math.hypot(left.x - centerX, left.y - centerY) -
						Math.hypot(right.x - centerX, right.y - centerY)
				)
				.slice(0, count);
		};

		const getRicochetTargets = (
			originX: number,
			originY: number,
			targeting: WeaponTargetingKind | undefined,
			count: number,
			excludeEnemyIds: number[] = []
		) => {
			const eligibleTargets = enemies.filter(
				(enemy) => !excludeEnemyIds.includes(enemy.id) && !isEnemyCapturedByVoidTendril(enemy.id)
			);

			const byDistanceFromOrigin = (left: EnemyState, right: EnemyState) =>
				Math.hypot(left.x - originX, left.y - originY) -
				Math.hypot(right.x - originX, right.y - originY);

			if (targeting === 'strongest-target') {
				return [...eligibleTargets]
					.sort((left, right) => right.health - left.health || byDistanceFromOrigin(left, right))
					.slice(0, count);
			}

			if (targeting === 'weakest-target') {
				return [...eligibleTargets]
					.sort((left, right) => left.health - right.health || byDistanceFromOrigin(left, right))
					.slice(0, count);
			}

			if (targeting === 'furthest-target') {
				return [...eligibleTargets]
					.sort(
						(left, right) =>
							Math.hypot(right.x - centerX, right.y - centerY) -
							Math.hypot(left.x - centerX, left.y - centerY)
					)
					.slice(0, count);
			}

			return [...eligibleTargets].sort(byDistanceFromOrigin).slice(0, count);
		};

		const getReservedHemorrhageTargetIds = (
			sourceWeaponInstanceId: string | null,
			ricochetStep: number
		) => {
			if (!sourceWeaponInstanceId) {
				return [] as number[];
			}

			return hemorrhageBursts
				.filter(
					(burst) =>
						!burst.hasApplied &&
						burst.sourceWeaponInstanceId === sourceWeaponInstanceId &&
						burst.ricochetStep === ricochetStep &&
						burst.targetEnemyId !== null
				)
				.map((burst) => burst.targetEnemyId)
				.filter((targetEnemyId): targetEnemyId is number => targetEnemyId !== null);
		};

		const getActiveHemorrhageForkProjectileCount = (sourceWeaponInstanceId: string | null) => {
			if (!sourceWeaponInstanceId) {
				return 0;
			}

			return hemorrhageBursts.filter(
				(burst) => !burst.hasApplied && burst.sourceWeaponInstanceId === sourceWeaponInstanceId
			).length;
		};

		const recordKnifeTrailSegment = (
			startX: number,
			startY: number,
			endX: number,
			endY: number,
			color = '#dc2626'
		) => {
			if (Math.hypot(endX - startX, endY - startY) < 1.5) {
				return;
			}

			knifeTrailSegments.push({
				startX,
				startY,
				endX,
				endY,
				color,
				age: 0,
				duration: 0.62
			});
		};

		const normalizeAngleDelta = (fromAngle: number, toAngle: number) => {
			let delta = toAngle - fromAngle;

			while (delta > Math.PI) delta -= Math.PI * 2;
			while (delta < -Math.PI) delta += Math.PI * 2;

			return delta;
		};

		const getRegularPolygonPoints = (
			centerPointX: number,
			centerPointY: number,
			radius: number,
			sides: number,
			rotation: number
		) => {
			const points: Array<{ x: number; y: number }> = [];

			for (let sideIndex = 0; sideIndex < sides; sideIndex += 1) {
				const angle = rotation + (sideIndex / sides) * Math.PI * 2;
				points.push({
					x: centerPointX + Math.cos(angle) * radius,
					y: centerPointY + Math.sin(angle) * radius
				});
			}

			return points;
		};

		const getMirrorArrayForSegment = (
			startX: number,
			startY: number,
			endX: number,
			endY: number
		) => {
			for (const mirror of mirrorArrays) {
				const startDistance = Math.hypot(startX - centerX, startY - centerY);
				const endDistance = Math.hypot(endX - centerX, endY - centerY);
				const threshold = mirror.lineWidth * 0.75;
				const startAngle = Math.atan2(startY - centerY, startX - centerX);
				const endAngle = Math.atan2(endY - centerY, endX - centerX);
				const withinArc =
					Math.abs(normalizeAngleDelta(mirror.angle, startAngle)) <= mirror.halfArcRadians ||
					Math.abs(normalizeAngleDelta(mirror.angle, endAngle)) <= mirror.halfArcRadians;

				if (!withinArc) {
					continue;
				}

				if (
					startDistance <= mirror.currentRadius + threshold &&
					endDistance >= mirror.currentRadius - threshold
				) {
					return mirror;
				}
			}

			return null;
		};

		const reflectProjectileFromMirror = (projectile: ProjectileState, mirror: MirrorArrayState) => {
			if (projectile.reflectedByMirror) {
				return false;
			}

			const startDistance = Math.hypot(projectile.lastX - centerX, projectile.lastY - centerY);
			const endDistance = Math.hypot(projectile.x - centerX, projectile.y - centerY);
			const distanceDelta = endDistance - startDistance;
			const t =
				Math.abs(distanceDelta) < 0.0001
					? 1
					: Math.max(0, Math.min(1, (mirror.currentRadius - startDistance) / distanceDelta));
			const contactX = p.lerp(projectile.lastX, projectile.x, t);
			const contactY = p.lerp(projectile.lastY, projectile.y, t);
			const normalX = contactX - centerX;
			const normalY = contactY - centerY;
			const normalMagnitude = Math.hypot(normalX, normalY) || 1;
			const nx = normalX / normalMagnitude;
			const ny = normalY / normalMagnitude;
			const dot = projectile.directionX * nx + projectile.directionY * ny;
			const reflectedDirectionX = projectile.directionX - 2 * dot * nx;
			const reflectedDirectionY = projectile.directionY - 2 * dot * ny;
			const directionMagnitude = Math.hypot(reflectedDirectionX, reflectedDirectionY) || 1;

			projectile.originX = contactX;
			projectile.originY = contactY;
			projectile.x = contactX;
			projectile.y = contactY;
			projectile.lastX = contactX;
			projectile.lastY = contactY;
			projectile.distanceTravelled = 0;
			projectile.directionX = reflectedDirectionX / directionMagnitude;
			projectile.directionY = reflectedDirectionY / directionMagnitude;
			projectile.perpendicularX = -projectile.directionY;
			projectile.perpendicularY = projectile.directionX;
			projectile.animation.directionX = projectile.directionX;
			projectile.animation.directionY = projectile.directionY;
			projectile.animation.lastX = contactX;
			projectile.animation.lastY = contactY;
			projectile.hitEnemyIds = [];
			projectile.impactRadius = Math.max(projectile.impactRadius, mirror.reflectedImpactRadius);
			projectile.maxImpactRadius = Math.max(
				projectile.maxImpactRadius,
				mirror.reflectedImpactRadius
			);
			projectile.damage = Math.max(
				1,
				Math.round(projectile.damage * mirror.reflectedDamageMultiplier)
			);
			projectile.mirrorBounceReady = false;
			projectile.reflectedByMirror = true;

			return true;
		};

		const getActiveOathbreakerSigilForEnemy = (enemyId: number) => {
			for (const sigil of oathbreakerSigils) {
				if (!sigil.enemyIds.includes(enemyId)) {
					continue;
				}

				return sigil;
			}

			return null;
		};

		const getOathbreakerSlowMultiplier = (enemyId: number) => {
			const sigil = getActiveOathbreakerSigilForEnemy(enemyId);

			return sigil?.slowMultiplier ?? 1;
		};

		const getFurthestEnemies = (count: number) => {
			return [...enemies]
				.sort(
					(left, right) =>
						Math.hypot(right.x - centerX, right.y - centerY) -
						Math.hypot(left.x - centerX, left.y - centerY)
				)
				.slice(0, count);
		};

		const healPixl = (amount: number) => {
			if (amount <= 0) {
				return;
			}

			pixlHealth = Math.min(pixlProgression.health, pixlHealth + amount);
		};

		const applyBlackHoleLifeSteal = (enemy: EnemyState, actualDamage: number) => {
			if (actualDamage <= 0) {
				return;
			}

			for (const tunnel of voidTunnels) {
				if (tunnel.variant !== 'black-hole' || tunnel.shieldRegenRatio <= 0) {
					continue;
				}

				const insideTunnel =
					Math.abs(enemy.x - tunnel.centerX) <= tunnel.halfWidth &&
					Math.abs(enemy.y - tunnel.centerY) <= tunnel.halfHeight;

				if (!insideTunnel) {
					continue;
				}

				healPixl(actualDamage * tunnel.shieldRegenRatio);
			}
		};

		const triggerHemorrhageBurst = (enemyIndex: number) => {
			if (!hemorrhageBurstEffect) {
				return false;
			}

			const enemy = enemies[enemyIndex];

			if (!enemy) {
				return false;
			}

			const effectiveStoredBleed = enemy.bleedStoredDamage * bleedCatalystMultiplier;
			const burstSourceWeaponInstanceId = enemy.bleedSourceWeaponInstanceId;
			const burstLifeStealRatio = enemy.bleedLifeStealRatio;
			const burstDuration = enemy.bleedDurationRemaining;
			const burstRicochetStep = enemy.bleedRicochetStep;
			const burstSourceWeaponState = burstSourceWeaponInstanceId
				? (equippedWeaponByInstanceId.get(burstSourceWeaponInstanceId) ?? null)
				: null;
			const burstSourceWeapon = burstSourceWeaponState?.definition ?? null;
			const remainingRicochets = burstSourceWeaponInstanceId
				? (knifeRemainingRicochetsByInstanceId[burstSourceWeaponInstanceId] ?? 0)
				: 0;

			if (
				effectiveStoredBleed <= 0 ||
				burstSourceWeapon?.id !== 'the-knife' ||
				remainingRicochets <= 0
			) {
				return false;
			}

			const burstBleedRicochet = effectiveStoredBleed;
			const burstCenterX = enemy.x;
			const burstCenterY = enemy.y;
			const availableForkProjectileBudget = Math.max(
				0,
				MAX_ACTIVE_HEMORRHAGE_FORK_PROJECTILES -
					getActiveHemorrhageForkProjectileCount(burstSourceWeaponInstanceId)
			);
			const reservedTargetEnemyIds = getReservedHemorrhageTargetIds(
				burstSourceWeaponInstanceId,
				burstRicochetStep + 1
			);
			const burstTargets = getRicochetTargets(
				burstCenterX,
				burstCenterY,
				burstSourceWeaponState?.targeting,
				Math.min(1 + knifeRicochetForkCount, availableForkProjectileBudget, remainingRicochets),
				[enemy.id, ...reservedTargetEnemyIds]
			);

			if (burstTargets.length === 0) {
				return false;
			}

			const bleedPerBranch = burstBleedRicochet / burstTargets.length;

			enemy.bleedStoredDamage = 0;
			enemy.bleedDurationRemaining = 0;
			enemy.bleedSourceWeaponInstanceId = null;
			enemy.bleedRicochetStep = 0;
			enemy.bleedLifeStealRatio = 0;

			if (burstSourceWeaponInstanceId) {
				knifeRemainingRicochetsByInstanceId[burstSourceWeaponInstanceId] = Math.max(
					0,
					remainingRicochets - burstTargets.length
				);
			}

			for (const [targetIndex, burstTarget] of burstTargets.entries()) {
				const branchBleedRicochet = bleedPerBranch;

				if (branchBleedRicochet <= 0) {
					continue;
				}

				const burstTravelDistance = Math.hypot(
					burstTarget.x - burstCenterX,
					burstTarget.y - burstCenterY
				);
				const normalizedTravelDistance = Math.min(
					1.5,
					burstTravelDistance / Math.max(1, arenaRadius)
				);
				const bounceTravelMultiplier = Math.max(0.26, Math.pow(0.72, burstRicochetStep));
				const burstTravelDuration = Math.min(
					0.725,
					(0.1 + (Math.exp(normalizedTravelDistance * 1.85) - 1) * 0.06) * bounceTravelMultiplier
				);

				hemorrhageBursts.push({
					startX: burstCenterX,
					startY: burstCenterY,
					endX: burstTarget.x,
					endY: burstTarget.y,
					targetEnemyId: burstTarget.id,
					bleedRicochet: branchBleedRicochet,
					bleedDuration: burstDuration,
					sourceWeaponInstanceId: burstSourceWeaponInstanceId,
					ricochetStep: burstRicochetStep + 1,
					lifeStealRatio: burstLifeStealRatio,
					hasApplied: false,
					age: 0,
					duration: burstTravelDuration,
					color: targetIndex === 0 ? '#dc2626' : '#fb7185'
				});
			}

			return true;
		};

		const updateBleedOnEnemy = (enemyIndex: number, dt: number) => {
			const enemy = enemies[enemyIndex];

			if (!enemy) {
				return true;
			}

			if (isEnemyCapturedByVoidTendril(enemy.id)) {
				return false;
			}

			if (enemy.bleedStoredDamage <= 0 || enemy.bleedDurationRemaining <= 0) {
				enemy.bleedStoredDamage = 0;
				enemy.bleedDurationRemaining = 0;
				enemy.bleedSourceWeaponInstanceId = null;
				enemy.bleedRicochetStep = 0;
				enemy.bleedLifeStealRatio = 0;
				return false;
			}

			const baseDamageConsumed = Math.min(
				enemy.bleedStoredDamage,
				(enemy.bleedStoredDamage / Math.max(enemy.bleedDurationRemaining, dt)) * dt
			);

			enemy.bleedStoredDamage = Math.max(0, enemy.bleedStoredDamage - baseDamageConsumed);
			enemy.bleedDurationRemaining = Math.max(0, enemy.bleedDurationRemaining - dt);

			if (baseDamageConsumed > 0) {
				const bleedSourceWeaponInstanceId = enemy.bleedSourceWeaponInstanceId;
				const bleedTickResult = applyDamageToEnemy(
					enemyIndex,
					baseDamageConsumed * bleedCatalystMultiplier,
					0.03,
					bleedSourceWeaponInstanceId ?? undefined,
					{
						applyWeaponHitEffects: false,
						allowContextHealing: false
					}
				);

				if (
					bleedTickResult.defeated &&
					bleedSourceWeaponInstanceId &&
					equippedWeaponByInstanceId.get(bleedSourceWeaponInstanceId)?.definition.id === 'the-knife'
				) {
					knifeRemainingRicochetsByInstanceId[bleedSourceWeaponInstanceId] =
						(knifeRemainingRicochetsByInstanceId[bleedSourceWeaponInstanceId] ?? 0) + 1;
				}

				if (enemy.bleedLifeStealRatio > 0 && bleedTickResult.actualDamage > 0) {
					healPixl(bleedTickResult.actualDamage * enemy.bleedLifeStealRatio);
				}

				const hemorrhageRelay = getDominantHemorrhageRelayAtPoint(
					enemy.x,
					enemy.y,
					ENEMY_VISUALS[enemy.kind].radius
				);

				if (
					hemorrhageRelay &&
					enemy.bleedSourceWeaponInstanceId &&
					hemorrhageRelay.bleedSpreadRatio > 0 &&
					hemorrhageRelay.bleedSpreadRadius > 0
				) {
					const [spreadTarget] = getClosestEnemiesToPoint(
						enemy.x,
						enemy.y,
						1,
						hemorrhageRelay.bleedSpreadRadius,
						[enemy.id]
					);

					if (spreadTarget) {
						const spreadTargetIndex = enemies.findIndex(
							(candidate) => candidate.id === spreadTarget.id
						);

						if (spreadTargetIndex >= 0) {
							applyBleedToEnemy(
								spreadTargetIndex,
								baseDamageConsumed * hemorrhageRelay.bleedSpreadRatio,
								Math.max(dt, enemy.bleedDurationRemaining),
								enemy.bleedSourceWeaponInstanceId,
								enemy.bleedLifeStealRatio,
								{ ricochetStep: enemy.bleedRicochetStep }
							);
						}
					}
				}
			}

			const nextEnemy = enemies[enemyIndex];

			if (!nextEnemy || nextEnemy.id !== enemy.id) {
				return true;
			}

			if (nextEnemy.bleedStoredDamage <= 0 || nextEnemy.bleedDurationRemaining <= 0) {
				nextEnemy.bleedStoredDamage = 0;
				nextEnemy.bleedDurationRemaining = 0;
				nextEnemy.bleedSourceWeaponInstanceId = null;
				nextEnemy.bleedRicochetStep = 0;
				nextEnemy.bleedLifeStealRatio = 0;
			}

			return false;
		};

		const easeInQuad = (progress: number) => {
			const clamped = Math.max(0, Math.min(1, progress));
			return clamped * clamped;
		};

		const awardEnemyDefeat = (enemyIndex: number) => {
			const defeatedEnemy = enemies[enemyIndex];

			if (!defeatedEnemy) {
				return;
			}

			const shouldBounceMark = targetPainterEffect && markedEnemyId === defeatedEnemy.id;
			const defeatedEnemyX = defeatedEnemy.x;
			const defeatedEnemyY = defeatedEnemy.y;
			const parasiteHealAmount =
				defeatedEnemy.parasiteBloomTimer > 0 && defeatedEnemy.parasiteBloomHealRatio > 0
					? Math.max(1, Math.round(defeatedEnemy.maxHealth * defeatedEnemy.parasiteBloomHealRatio))
					: 0;

			waveXp += getXpForEnemyKind(defeatedEnemy.kind);

			if (parasiteHealAmount > 0) {
				healPixl(parasiteHealAmount);
				parasiteBloomPulses.push({
					originX: defeatedEnemyX,
					originY: defeatedEnemyY,
					radius: 12,
					maxRadius: defeatedEnemy.parasiteBloomPulseRadius,
					healAmount: parasiteHealAmount,
					age: 0,
					duration: 0.52,
					color: defeatedEnemy.parasiteBloomColor ?? '#f472b6'
				});
				pixlFlash = Math.max(pixlFlash, 0.16);
			}

			if (defeatedEnemy.kind === 'zerglitch') {
				for (let splitIndex = 0; splitIndex < 15; splitIndex += 1) {
					const angle = (Math.PI * 2 * splitIndex) / 10 + p.random(-0.12, 0.12);
					const distance = p.random(14, 30);
					spawnEnemyAtPosition(
						'swarmer',
						defeatedEnemy.x + Math.cos(angle) * distance,
						defeatedEnemy.y + Math.sin(angle) * distance,
						{ moveSpeedMultiplier: 1.75 }
					);
				}
			}

			enemies.splice(enemyIndex, 1);

			if (shouldBounceMark) {
				bounceMarkedEnemy(defeatedEnemyX, defeatedEnemyY, defeatedEnemy.id);
			}
		};

		const consumeEnemyIntoPixlShield = (enemyIndex: number, sourceId: string, color: string) => {
			const consumedEnemy = enemies[enemyIndex];

			if (!consumedEnemy) {
				return;
			}

			if (markedEnemyId === consumedEnemy.id) {
				markedEnemyId = null;
			}

			pixlSwallowPulses.push({
				originX: consumedEnemy.x,
				originY: consumedEnemy.y,
				color,
				shieldGain: consumedEnemy.maxHealth,
				age: 0,
				duration: 0.58
			});
			pixlFlash = Math.max(pixlFlash, 0.24);
			waveXp += getXpForEnemyKind(consumedEnemy.kind);
			addPixlShieldFromSource(sourceId, consumedEnemy.maxHealth, color);
			enemies.splice(enemyIndex, 1);
		};

		const consumeEnemyIntoNatureHeal = (enemyIndex: number) => {
			const consumedEnemy = enemies[enemyIndex];

			if (!consumedEnemy) {
				return;
			}

			if (markedEnemyId === consumedEnemy.id) {
				markedEnemyId = null;
			}

			waveXp += getXpForEnemyKind(consumedEnemy.kind);
			enemies.splice(enemyIndex, 1);
		};

		const applyDamageToPixl = (damage: number) => {
			if (hasActiveVanishRune()) {
				return;
			}

			let remainingDamage = Math.max(0, damage);

			if (pixlShieldPool > 0) {
				const absorbed = Math.min(pixlShieldPool, remainingDamage);
				let remainingAbsorbed = absorbed;

				for (const sourceId of Object.keys(pixlShieldSources)) {
					if (remainingAbsorbed <= 0) {
						break;
					}

					const sourceShield = pixlShieldSources[sourceId] ?? 0;

					if (sourceShield <= 0) {
						delete pixlShieldSources[sourceId];
						continue;
					}

					const sourceAbsorbed = Math.min(sourceShield, remainingAbsorbed);
					const nextSourceShield = sourceShield - sourceAbsorbed;

					if (nextSourceShield > 0) {
						pixlShieldSources[sourceId] = nextSourceShield;
					} else {
						delete pixlShieldSources[sourceId];
					}

					remainingAbsorbed -= sourceAbsorbed;
				}

				recalculatePixlShieldPool();
				remainingDamage -= absorbed;
			}

			if (remainingDamage > 0) {
				pixlHealth = Math.max(0, pixlHealth - remainingDamage);
			}

			pixlFlash = 0.16;
		};

		const spawnNeedleFan = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'needle-fan') {
				return;
			}

			const targets = getClosestEnemies(Math.max(1, weapon.attack.projectileCount));

			for (const enemy of targets) {
				needleBursts.push({
					sourceWeaponInstanceId,
					enemyId: enemy.id,
					targetX: enemy.x,
					targetY: enemy.y,
					maxReach: special.maxReach,
					lineWidth: special.lineWidth,
					damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					age: 0,
					duration: special.duration,
					hasHit: false
				});
			}
		};

		const applyDamageToEnemy = (
			enemyIndex: number,
			damage: number,
			hitFlash = 0.08,
			sourceWeaponInstanceId?: string,
			options: {
				applyWeaponHitEffects?: boolean;
				allowContextHealing?: boolean;
				allowHemorrhageBurst?: boolean;
				allowOathbreakerShare?: boolean;
			} = {}
		) => {
			const enemy = enemies[enemyIndex];

			if (!enemy) {
				return { defeated: false, actualDamage: 0 };
			}

			if (isEnemyCapturedByVoidTendril(enemy.id)) {
				return { defeated: false, actualDamage: 0 };
			}

			const stats = getEnemyStats(enemy.kind);
			let remainingDamage = damage;
			let actualDamage = 0;
			const applyWeaponHitEffects = options.applyWeaponHitEffects ?? true;
			const allowContextHealing = options.allowContextHealing ?? true;
			const allowOathbreakerShare = options.allowOathbreakerShare ?? false;
			const sourceWeapon = sourceWeaponInstanceId
				? (equippedWeaponByInstanceId.get(sourceWeaponInstanceId)?.definition ?? null)
				: null;
			const sourceShieldStealRatio = applyWeaponHitEffects
				? getWeaponShieldStealRatio(sourceWeapon, sourceWeaponInstanceId)
				: 0;
			const sourceLifeStealRatio = applyWeaponHitEffects
				? getWeaponLifeStealRatio(sourceWeaponInstanceId)
				: 0;

			if (
				targetPainterEffect &&
				markedEnemyId === enemy.id &&
				applyWeaponHitEffects &&
				sourceWeaponInstanceId
			) {
				remainingDamage *= targetPainterEffect.damageMultiplier;
			}

			if (
				enemy.bindingRuneHitCount > 0 &&
				enemy.bindingRuneDamageMultiplierPerHit > 1 &&
				applyWeaponHitEffects &&
				sourceWeaponInstanceId
			) {
				remainingDamage *= Math.pow(
					enemy.bindingRuneDamageMultiplierPerHit,
					enemy.bindingRuneHitCount
				);
			}

			if (sourceWeapon?.family !== 'pylon') {
				remainingDamage *= getMarkBeaconDamageMultiplierAtPoint(enemy.x, enemy.y);
			}

			if (sourceWeapon?.attack.requiredInfusion && enemy.voidTouchedTimer > 0) {
				remainingDamage *= 1.3;
			}

			if (sourceWeapon?.attack.requiredInfusion === 'fire' && enemy.fireExposedTimer > 0) {
				remainingDamage *= 1.4;
			}

			if (enemy.vulnerableTimer > 0) {
				remainingDamage *= 1.33;
			}

			if (sourceWeapon && isBossEnemyKind(enemy.kind)) {
				if (isBossFocusedSingleTargetWeapon(sourceWeapon)) {
					remainingDamage *= 1.75;
				} else if (isAoeOrMultiTargetWeapon(sourceWeapon)) {
					remainingDamage *= 0.6;
				}
			}

			if (enemy.supportShieldPool > 0) {
				const absorbed = Math.min(enemy.supportShieldPool, remainingDamage);
				enemy.supportShieldPool -= absorbed;
				remainingDamage -= absorbed;
				actualDamage += absorbed;

				if (enemy.supportShieldPool <= 0) {
					enemy.supportShieldPool = 0;
					enemy.supportShieldTimer = 0;
				}
			}

			if (remainingDamage <= 0) {
				enemy.hitFlash = Math.max(enemy.hitFlash, hitFlash);
				recordWeaponDamage(sourceWeaponInstanceId, actualDamage);
				if (applyWeaponHitEffects && sourceShieldStealRatio > 0 && sourceWeaponInstanceId) {
					addPixlShieldFromSource(
						`${sourceWeaponInstanceId}-shield-steal`,
						actualDamage * sourceShieldStealRatio,
						sourceWeapon?.projectileVisual.color ?? '#a78bfa'
					);
				}
				if (allowContextHealing) {
					applyBlackHoleLifeSteal(enemy, actualDamage);
				}
				if (sourceLifeStealRatio > 0 && actualDamage > 0) {
					healPixl(actualDamage * sourceLifeStealRatio);
				}
				if (enemy.lifeStealMarkTimer > 0 && actualDamage > 0) {
					healPixl(actualDamage * enemy.lifeStealMarkRatio);
				}
				return { defeated: false, actualDamage };
			}
			const shieldReduction =
				enemy.shieldPulseTimer > 0
					? Math.min(0.9, Math.max(0, stats.onHitShieldDamageReduction ?? 0))
					: 0;
			const isFrozen = enemy.frozenTimer > 0;
			const frozenMultiplier =
				isFrozen && sourceWeapon?.attack.special?.type === 'ice-shower'
					? (sourceWeapon.attack.special.frozenDamageMultiplier ?? 2)
					: isFrozen
						? 2
						: 1;
			const frozenMaxHealthDamageRatio =
				isFrozen && sourceWeapon?.attack.special?.type === 'ice-shower'
					? (sourceWeapon.attack.special.frozenMaxHealthDamageRatio ?? 0.2)
					: isFrozen
						? 0.2
						: 0;
			const appliedDamage = Math.max(1, remainingDamage * (1 - shieldReduction)) * frozenMultiplier;
			const frozenBonusDamage = isFrozen ? enemy.maxHealth * frozenMaxHealthDamageRatio : 0;
			const totalDamage = appliedDamage + frozenBonusDamage;
			const healthDamage = Math.min(enemy.health, totalDamage);
			actualDamage += healthDamage;

			enemy.health -= totalDamage;
			enemy.hitFlash = Math.max(enemy.hitFlash, hitFlash);
			recordWeaponDamage(sourceWeaponInstanceId, actualDamage);
			if (applyWeaponHitEffects && sourceShieldStealRatio > 0 && sourceWeaponInstanceId) {
				addPixlShieldFromSource(
					`${sourceWeaponInstanceId}-shield-steal`,
					actualDamage * sourceShieldStealRatio,
					sourceWeapon?.projectileVisual.color ?? '#a78bfa'
				);
			}
			if (allowContextHealing) {
				applyBlackHoleLifeSteal(enemy, actualDamage);
			}
			if (sourceLifeStealRatio > 0 && actualDamage > 0) {
				healPixl(actualDamage * sourceLifeStealRatio);
			}
			if (enemy.lifeStealMarkTimer > 0 && actualDamage > 0) {
				healPixl(actualDamage * enemy.lifeStealMarkRatio);
			}
			if (
				applyWeaponHitEffects &&
				actualDamage > 0 &&
				enemy.bindingRuneHitCount > 0 &&
				enemy.bindingRuneDamageMultiplierPerHit > 1 &&
				sourceWeaponInstanceId
			) {
				enemy.bindingRuneHitCount += 1;
			}
			if (
				applyWeaponHitEffects &&
				actualDamage > 0 &&
				enemy.sunbrandTimer > 0 &&
				enemy.sunbrandSourceWeaponInstanceId &&
				sourceWeaponInstanceId !== enemy.sunbrandSourceWeaponInstanceId
			) {
				const burstDamage =
					enemy.sunbrandBaseDamage + actualDamage * enemy.sunbrandTriggerDamageMultiplier;
				const sunbrandSourceWeaponInstanceId = enemy.sunbrandSourceWeaponInstanceId;
				enemy.sunbrandTimer = 0;
				enemy.sunbrandBaseDamage = 0;
				enemy.sunbrandTriggerDamageMultiplier = 0;
				enemy.sunbrandSourceWeaponInstanceId = null;
				applyDamageToEnemy(enemyIndex, burstDamage, 0.12, sunbrandSourceWeaponInstanceId, {
					applyWeaponHitEffects: false
				});
			}

			if (applyWeaponHitEffects && sourceWeapon?.attack.special?.type === 'vulnerable-hit') {
				enemy.vulnerableTimer = Math.max(
					enemy.vulnerableTimer,
					sourceWeapon.attack.special.duration
				);
			}

			if (applyWeaponHitEffects && sourceWeapon?.attack.special?.type === 'life-steal-mark') {
				enemy.lifeStealMarkTimer = Math.max(
					enemy.lifeStealMarkTimer,
					sourceWeapon.attack.special.duration
				);
				enemy.lifeStealMarkRatio = Math.max(
					enemy.lifeStealMarkRatio,
					sourceWeapon.attack.special.lifeStealRatio
				);
			}

			if (applyWeaponHitEffects && sourceWeapon?.attack.special?.type === 'parasite-bloom') {
				enemy.parasiteBloomTimer = Math.max(
					enemy.parasiteBloomTimer,
					sourceWeapon.attack.special.duration
				);
				enemy.parasiteBloomDuration = Math.max(
					enemy.parasiteBloomDuration,
					sourceWeapon.attack.special.duration
				);
				enemy.parasiteBloomHealRatio = Math.max(
					enemy.parasiteBloomHealRatio,
					sourceWeapon.attack.special.healRatio
				);
				enemy.parasiteBloomPulseRadius = Math.max(
					enemy.parasiteBloomPulseRadius,
					sourceWeapon.attack.special.pulseRadius
				);
				enemy.parasiteBloomColor = sourceWeapon.projectileVisual.color;
			}

			const bleedSpec = applyWeaponHitEffects
				? resolveBleedSourceSpec(sourceWeapon, sourceWeaponInstanceId)
				: null;

			if (bleedSpec && sourceWeaponInstanceId) {
				applyBleedToEnemy(
					enemyIndex,
					Math.max(0, actualDamage * bleedSpec.damageRatio),
					bleedSpec.duration,
					sourceWeaponInstanceId,
					sourceLifeStealRatio
				);
			}

			if (
				stats.onHitShieldDuration &&
				stats.onHitShieldCooldown &&
				enemy.shieldPulseTimer <= 0 &&
				enemy.shieldPulseCooldown <= 0
			) {
				enemy.shieldPulseTimer = stats.onHitShieldDuration;
				enemy.shieldPulseCooldown = stats.onHitShieldCooldown;
			}

			if (allowOathbreakerShare && actualDamage > 0 && sourceWeaponInstanceId) {
				const sigil = getActiveOathbreakerSigilForEnemy(enemy.id);

				if (sigil && sigil.enemyIds.length > 1) {
					const sharedDamage = actualDamage * sigil.damageShareRatio;

					for (const chainedEnemyId of sigil.enemyIds) {
						if (chainedEnemyId === enemy.id) {
							continue;
						}

						const chainedEnemyIndex = enemies.findIndex(
							(candidate) => candidate.id === chainedEnemyId
						);

						if (chainedEnemyIndex < 0) {
							continue;
						}

						applyDamageToEnemy(
							chainedEnemyIndex,
							sharedDamage,
							Math.max(0.05, hitFlash * 0.85),
							sourceWeaponInstanceId,
							{
								applyWeaponHitEffects: false,
								allowContextHealing: false,
								allowOathbreakerShare: false
							}
						);
					}
				}
			}

			if (enemy.health <= 0) {
				if ((options.allowHemorrhageBurst ?? true) && triggerHemorrhageBurst(enemyIndex)) {
					awardEnemyDefeat(enemyIndex);
					return { defeated: true, actualDamage };
				}

				awardEnemyDefeat(enemyIndex);
				return { defeated: true, actualDamage };
			}

			return { defeated: false, actualDamage };
		};

		const updateNeedleBursts = (dt: number) => {
			for (let index = needleBursts.length - 1; index >= 0; index -= 1) {
				const burst = needleBursts[index];
				burst.age += dt;

				const target = enemies.find((enemy) => enemy.id === burst.enemyId) ?? null;

				if (target) {
					burst.targetX = target.x;
					burst.targetY = target.y;
				}

				const progress = Math.min(1, burst.age / burst.duration);

				if (!burst.hasHit && progress >= 0.5 && target) {
					const enemyIndex = enemies.findIndex((enemy) => enemy.id === burst.enemyId);

					if (enemyIndex >= 0) {
						applyDamageToEnemy(enemyIndex, burst.damage, 0.09, burst.sourceWeaponInstanceId, {
							allowOathbreakerShare: true
						});
					}

					burst.hasHit = true;
				}

				if (progress >= 1) {
					needleBursts.splice(index, 1);
				}
			}
		};

		const spawnForceField = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'force-field') {
				return;
			}

			const burstCount = Math.max(1, special.burstCount ?? 1);
			const offsetDistance = Math.max(0, special.offsetDistance ?? 0);
			const burstDelay = Math.max(0, special.burstDelay ?? 0);
			const startOffset = -((burstCount - 1) * offsetDistance) / 2;

			for (let index = 0; index < burstCount; index += 1) {
				const offsetX = startOffset + index * offsetDistance;

				forceFields.push({
					sourceWeaponInstanceId,
					centerX: centerX + offsetX,
					centerY,
					startDelay: index * burstDelay,
					radius: combatProfile.collision.pixlRadius,
					maxRadius: special.maxRadius,
					expansionSpeed: special.expansionSpeed,
					lineWidth: special.lineWidth,
					pushDistance: Math.max(0, special.pushDistance ?? special.lineWidth + 24),
					damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					age: 0,
					hitEnemyIds: []
				});
			}
		};

		const spawnKillSwitchPulse = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'kill-switch') {
				return;
			}

			killSwitchPulses.push({
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius: combatProfile.collision.pixlRadius,
				maxRadius: special.maxRadius,
				expansionSpeed: special.expansionSpeed,
				lineWidth: special.lineWidth,
				executeThresholdRatio: special.executeThresholdRatio,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				hitEnemyIds: []
			});
		};

		const spawnVulnerablePulse = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'vulnerable-pulse') {
				return;
			}

			vulnerablePulses.push({
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius: combatProfile.collision.pixlRadius,
				maxRadius: special.maxRadius,
				expansionSpeed: special.expansionSpeed,
				lineWidth: special.lineWidth,
				damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
				vulnerableDuration: special.duration,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				hitEnemyIds: []
			});
		};

		const spawnOathbreakerSigil = (utility: EquippedUtilityState) => {
			const effect = utility.definition.effect;

			if (effect.type !== 'oathbreaker-sigil') {
				return;
			}

			const focalTarget =
				getWeaponTarget('strongest-target') ?? getWeaponTarget('nearest-target') ?? null;

			if (!focalTarget) {
				return;
			}

			const angle = Math.atan2(focalTarget.y - centerY, focalTarget.x - centerX);
			const radius = arenaRadius + 36;
			const currentRadius = combatProfile.collision.pixlRadius;
			const sweepDuration = 0.32;
			const expansionSpeed = Math.max(1, (radius - currentRadius) / sweepDuration);
			const halfArcRadians = Math.PI / 2;

			oathbreakerSigils.push({
				sourceUtilityInstanceId: utility.instanceId,
				enemyIds: [],
				angle,
				radius,
				currentRadius,
				halfArcRadians,
				sweepDuration,
				expansionSpeed,
				lineWidth: 10,
				duration: effect.duration,
				age: 0,
				slowMultiplier: effect.slowMultiplier,
				damageShareRatio: effect.damageShareRatio,
				color: utility.definition.utilityVisual?.color ?? '#f59e0b',
				glow: utility.definition.utilityVisual?.glow ?? false
			});
		};

		const spawnMirrorArray = (utility: EquippedUtilityState) => {
			const effect = utility.definition.effect;

			if (effect.type !== 'mirror-array') {
				return;
			}

			const focalTarget =
				getWeaponTarget('strongest-target') ?? getWeaponTarget('nearest-target') ?? null;

			if (!focalTarget) {
				return;
			}

			const angle = Math.atan2(focalTarget.y - centerY, focalTarget.x - centerX);
			const radius = arenaRadius + 18;
			const currentRadius = combatProfile.collision.pixlRadius;
			const sweepDuration = 0.32;
			const expansionSpeed = Math.max(1, (radius - currentRadius) / sweepDuration);
			const halfArcRadians = Math.PI / 2;

			mirrorArrays.push({
				sourceUtilityInstanceId: utility.instanceId,
				angle,
				radius,
				currentRadius,
				halfArcRadians,
				sweepDuration,
				expansionSpeed,
				lineWidth: 16,
				duration: effect.duration,
				age: 0,
				reflectedDamageMultiplier: effect.reflectedDamageMultiplier,
				reflectedImpactRadius: effect.reflectedImpactRadius,
				color: utility.definition.utilityVisual?.color ?? '#93c5fd',
				glow: utility.definition.utilityVisual?.glow ?? false
			});
		};

		const spawnStasisField = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: EnemyState
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'stasis-field') {
				return;
			}

			stasisFields.push({
				sourceWeaponInstanceId,
				centerX: target.x,
				centerY: target.y,
				radius: 8,
				maxRadius: special.maxRadius,
				expansionSpeed: special.expansionSpeed,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.fieldDurationCycles / Math.max(0.001, pixlProgression.attackSpeed)
			});
		};

		const spawnPrismPrison = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: { x: number; y: number }
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'prism-prison') {
				return;
			}

			if (prismPrisons.some((prison) => prison.sourceWeaponInstanceId === sourceWeaponInstanceId)) {
				return;
			}

			prismPrisons.push({
				sourceWeaponInstanceId,
				centerX: target.x,
				centerY: target.y,
				radius: special.radius,
				sides: special.sides,
				lineWidth: special.lineWidth,
				edgeHitCooldown: special.edgeHitCooldown,
				edgeHitCooldowns: new Map(),
				damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
				rotation: Math.atan2(target.y - centerY, target.x - centerX) + Math.PI / 6,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				triggered: false,
				activeAge: 0,
				activeDuration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed)
			});
		};

		const spawnVoidTunnel = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: EnemyState
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'void-tunnel') {
				return;
			}

			const isBlackHole = weapon.id === 'black-hole';
			const angle = Math.atan2(target.y - centerY, target.x - centerX);
			const spawnRadius = FIXED_SPAWN_RADIUS * 0.5;
			const spawnX = isBlackHole ? centerX + Math.cos(angle) * spawnRadius : centerX;
			const spawnY = isBlackHole ? centerY + Math.sin(angle) * spawnRadius : centerY;
			const halfWidth = isBlackHole ? special.halfWidth : Math.max(special.halfWidth, arenaRadius);
			const halfHeight = isBlackHole
				? special.halfHeight
				: Math.max(special.halfHeight, arenaRadius);

			voidTunnels.push({
				sourceWeaponInstanceId,
				variant: isBlackHole ? 'black-hole' : 'void-tunnel',
				originX: spawnX,
				originY: spawnY,
				centerX: spawnX,
				centerY: spawnY,
				halfWidth,
				halfHeight,
				pullStrength: special.pullStrength,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.duration,
				debuffDuration: special.debuffDuration,
				elementalDamageMultiplier: special.elementalDamageMultiplier,
				shieldRegenRatio: isBlackHole ? 0.1 : 0,
				claimedEnemyIds: []
			});
		};

		const spawnVoidRift = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: { x: number; y: number }
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'void-rift') {
				return;
			}

			const pulseMaxRadius =
				Math.max(
					Math.hypot(target.x, target.y),
					Math.hypot(p.width - target.x, target.y),
					Math.hypot(target.x, p.height - target.y),
					Math.hypot(p.width - target.x, p.height - target.y)
				) + 96;
			const pulseTravelSpeed = 520;
			const collapseDuration = Math.max(
				0.6,
				(pulseMaxRadius - special.finalPulseRadius) / pulseTravelSpeed
			);

			voidRifts.push({
				sourceWeaponInstanceId,
				centerX: target.x,
				centerY: target.y,
				angle: Math.atan2(target.y - centerY, target.x - centerX),
				halfWidth: special.halfWidth,
				halfHeight: special.halfHeight,
				pullStrength: special.pullStrength,
				damagePerTick: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
				tickInterval: special.tickInterval,
				tickTimer: special.tickInterval,
				maxTargets: special.maxTargets,
				finalPulseRadius: special.finalPulseRadius,
				finalPulseBaseDamage: special.finalPulseBaseDamage,
				finalPulseDamageRatio: special.finalPulseDamageRatio,
				accumulatedDamage: 0,
				finalPulseDamage: 0,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				activeDuration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				collapseAge: 0,
				collapseDuration,
				pulseMaxRadius,
				hasCollapsed: false
			});
		};

		const spawnPhaseshift = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'phaseshift') {
				return;
			}

			phaseshifts.push({
				sourceWeaponInstanceId,
				centerX: centerX + special.horizontalOffset,
				centerY,
				zoneWidth: special.zoneWidth,
				halfHeight: arenaRadius * special.zoneHeightRatio,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				teleportOffset: special.teleportOffset,
				slowDuration: special.slowDuration,
				slowMultiplier: special.slowMultiplier,
				teleportedEnemyIds: []
			});
		};

		const spawnBurningGroundAt = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			centerX: number,
			centerY: number
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'burning-ground') {
				return;
			}

			spawnBurningGroundPatch({
				weapon,
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius: special.radius,
				damageMultiplier: 1,
				tickInterval: special.tickInterval,
				impactSize: special.impactSize,
				durationCycles: special.durationCycles
			});
		};

		const spawnBurningGroundPatch = ({
			weapon,
			sourceWeaponInstanceId,
			centerX,
			centerY,
			radius,
			damageMultiplier,
			tickInterval,
			impactSize,
			durationCycles
		}: {
			weapon: WeaponDefinition;
			sourceWeaponInstanceId: string;
			centerX: number;
			centerY: number;
			radius: number;
			damageMultiplier: number;
			tickInterval: number;
			impactSize: number;
			durationCycles: number;
		}) => {
			burningGrounds.push({
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius,
				damagePerTick: getAdjustedWeaponDamage(weapon, damageMultiplier, sourceWeaponInstanceId),
				tickInterval,
				tickTimer: tickInterval,
				impactSize,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: durationCycles / Math.max(0.001, pixlProgression.attackSpeed)
			});
		};

		const spawnSunRune = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			_target: EnemyState | null,
			efficiencyMultiplier = 1,
			allowEcho = true
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'sun-rune') {
				return;
			}

			runeCasts.push({
				sourceWeaponInstanceId,
				variant: 'sun-rune',
				centerX,
				centerY: centerY - Math.max(34, arenaRadius * 0.18),
				runeSize: Math.max(10, special.impactSize * 1.2),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.castDuration
			});

			sunRunes.push({
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius: arenaRadius * special.radius,
				damagePerPulse: getAdjustedWeaponDamage(
					weapon,
					efficiencyMultiplier,
					sourceWeaponInstanceId
				),
				waveThickness: Math.max(10, special.impactSize * 0.9),
				impactSize: special.impactSize,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				hitEnemyIds: []
			});

			if (!allowEcho) {
				return;
			}

			const idolEffect = getIdolOfEchoesEffect();

			if (!idolEffect) {
				return;
			}

			pendingRuneEchoes.push({
				runeType: 'sun-rune',
				weapon,
				sourceWeaponInstanceId,
				delay: idolEffect.echoDelay,
				efficiencyMultiplier: idolEffect.echoEfficiency
			});
		};

		const spawnHealingRune = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			_target: EnemyState | null,
			efficiencyMultiplier = 1,
			allowEcho = true
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'healing-rune') {
				return;
			}

			runeCasts.push({
				sourceWeaponInstanceId,
				variant: 'healing-rune',
				centerX,
				centerY: centerY - Math.max(34, arenaRadius * 0.18),
				runeSize: 14,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.castDuration
			});

			healPixl(
				Math.max(
					1,
					Math.round(
						(pixlProgression.health * special.healMaxHealthRatio + special.healFlat) *
							efficiencyMultiplier
					)
				)
			);

			healingRunes.push({
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius: Math.max(48, arenaRadius * special.maxRadiusFactor),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed)
			});

			if (!allowEcho) {
				return;
			}

			const idolEffect = getIdolOfEchoesEffect();

			if (!idolEffect) {
				return;
			}

			pendingRuneEchoes.push({
				runeType: 'healing-rune',
				weapon,
				sourceWeaponInstanceId,
				delay: idolEffect.echoDelay,
				efficiencyMultiplier: idolEffect.echoEfficiency
			});
		};

		const spawnSlowingRune = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			_target: EnemyState | null,
			efficiencyMultiplier = 1,
			allowEcho = true
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'slowing-rune') {
				return;
			}

			runeCasts.push({
				sourceWeaponInstanceId,
				variant: 'slowing-rune',
				centerX,
				centerY: centerY - Math.max(34, arenaRadius * 0.18),
				runeSize: Math.max(10, special.impactSize * 1.15),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.castDuration
			});

			slowingRunes.push({
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius: arenaRadius * special.radius,
				slowMultiplier: 1 - (1 - special.slowMultiplier) * efficiencyMultiplier,
				slowDuration: special.slowDurationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				waveThickness: Math.max(10, special.impactSize * 0.92),
				impactSize: special.impactSize,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				hitEnemyIds: []
			});

			if (!allowEcho) {
				return;
			}

			const idolEffect = getIdolOfEchoesEffect();

			if (!idolEffect) {
				return;
			}

			pendingRuneEchoes.push({
				runeType: 'slowing-rune',
				weapon,
				sourceWeaponInstanceId,
				delay: idolEffect.echoDelay,
				efficiencyMultiplier: idolEffect.echoEfficiency
			});
		};

		const spawnSunbrandRune = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			_target: EnemyState | null,
			efficiencyMultiplier = 1,
			allowEcho = true
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'sunbrand-rune') {
				return;
			}

			runeCasts.push({
				sourceWeaponInstanceId,
				variant: 'sunbrand-rune',
				centerX,
				centerY: centerY - Math.max(34, arenaRadius * 0.18),
				runeSize: Math.max(10, special.impactSize * 1.18),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.castDuration
			});

			sunbrandRunes.push({
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius: arenaRadius * special.radius,
				brandDuration: special.brandDurationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				burstBaseDamage: special.burstBaseDamage * efficiencyMultiplier,
				triggerDamageMultiplier: special.triggerDamageMultiplier * efficiencyMultiplier,
				waveThickness: Math.max(10, special.impactSize * 0.92),
				impactSize: special.impactSize,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				hitEnemyIds: []
			});

			if (!allowEcho) {
				return;
			}

			const idolEffect = getIdolOfEchoesEffect();

			if (!idolEffect) {
				return;
			}

			pendingRuneEchoes.push({
				runeType: 'sunbrand-rune',
				weapon,
				sourceWeaponInstanceId,
				delay: idolEffect.echoDelay,
				efficiencyMultiplier: idolEffect.echoEfficiency
			});
		};

		const spawnBindingRune = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			_target: EnemyState | null,
			efficiencyMultiplier = 1,
			allowEcho = true
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'binding-rune') {
				return;
			}

			runeCasts.push({
				sourceWeaponInstanceId,
				variant: 'binding-rune',
				centerX,
				centerY: centerY - Math.max(34, arenaRadius * 0.18),
				runeSize: Math.max(10, special.impactSize * 1.12),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.castDuration
			});

			bindingRunes.push({
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius: arenaRadius * special.radius,
				damageMultiplierPerHit: 1 + (special.damageMultiplierPerHit - 1) * efficiencyMultiplier,
				waveThickness: Math.max(10, special.impactSize * 0.92),
				impactSize: special.impactSize,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				hitEnemyIds: []
			});

			if (!allowEcho) {
				return;
			}

			const idolEffect = getIdolOfEchoesEffect();

			if (!idolEffect) {
				return;
			}

			pendingRuneEchoes.push({
				runeType: 'binding-rune',
				weapon,
				sourceWeaponInstanceId,
				delay: idolEffect.echoDelay,
				efficiencyMultiplier: idolEffect.echoEfficiency
			});
		};

		const spawnRuneReiterator = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'rune-reiterator') {
				return;
			}

			runeCasts.push({
				sourceWeaponInstanceId,
				variant: 'rune-reiterator',
				centerX,
				centerY: centerY - Math.max(34, arenaRadius * 0.18),
				runeSize: 14,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.castDuration
			});

			const replayStartIndex =
				lastTriggeredRuneReplayIndexByWeaponInstanceId[sourceWeaponInstanceId] ?? 0;
			const replaysSinceLastTrigger = triggeredRuneReplays.slice(replayStartIndex);
			lastTriggeredRuneReplayIndexByWeaponInstanceId[sourceWeaponInstanceId] =
				triggeredRuneReplays.length;

			for (const [replayIndex, replay] of replaysSinceLastTrigger.entries()) {
				pendingRuneEchoes.push({
					runeType: replay.runeType,
					weapon: replay.weapon,
					sourceWeaponInstanceId: replay.sourceWeaponInstanceId,
					delay: special.replayDelay * (replayIndex + 1),
					efficiencyMultiplier: 1
				});
			}
		};

		const spawnAscendanceRune = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string
		): WeaponActivationResult => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'ascendance-rune') {
				return {
					pendingNextWeaponDamageMultiplier: null,
					didActivate: false,
					nextCyclesUntilTrigger: null
				};
			}

			if (currentSweepTriggeredRuneTypes.size < special.requiredUniqueRuneCount) {
				return {
					pendingNextWeaponDamageMultiplier: null,
					didActivate: false,
					nextCyclesUntilTrigger: null
				};
			}

			runeCasts.push({
				sourceWeaponInstanceId,
				variant: 'ascendance-rune',
				centerX,
				centerY: centerY - Math.max(36, arenaRadius * 0.2),
				runeSize: 12,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.castDuration
			});

			healPixl(pixlProgression.health);
			cycleDamageMultiplier = Math.max(cycleDamageMultiplier, special.damageMultiplier);
			cycleDamageBuffExpiresAfterSweepIndex = Math.max(
				cycleDamageBuffExpiresAfterSweepIndex ?? 0,
				currentSweepIndex + special.buffDurationCycles
			);

			return {
				pendingNextWeaponDamageMultiplier: null,
				didActivate: true,
				nextCyclesUntilTrigger: special.successCooldownCycles
			};
		};

		const spawnJudgmentRune = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: EnemyState | null
		): WeaponActivationResult => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'judgment-rune') {
				return {
					pendingNextWeaponDamageMultiplier: null,
					didActivate: false,
					nextCyclesUntilTrigger: null
				};
			}

			const uniqueTriggeredRuneCount = Array.from(currentSweepTriggeredRuneTypes).filter(
				(runeType) => replayableRuneSpecialTypes.has(runeType as PendingRuneEchoState['runeType'])
			).length;
			const durationCycles =
				special.baseDurationCycles + uniqueTriggeredRuneCount * special.durationCyclesPerUniqueRune;
			const triggeredRuneCount = currentSweepTriggeredRuneCount;
			const damageMultiplier =
				1 + currentSweepTriggeredRuneCount * special.damageMultiplierPerTriggeredRune;
			const canRefreshPersistentOrb = triggeredRuneCount >= special.minTriggeredRuneCountToRefresh;
			const initialOrbitAngle = target
				? Math.atan2(target.y - centerY, target.x - centerX)
				: -Math.PI / 2;
			const nextDuration =
				Math.max(1, durationCycles) / Math.max(0.001, pixlProgression.attackSpeed);

			runeCasts.push({
				sourceWeaponInstanceId,
				variant: 'judgment-rune',
				centerX,
				centerY: centerY - Math.max(36, arenaRadius * 0.2),
				runeSize: Math.max(12, special.sunRadius * 0.9),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.castDuration
			});

			const existingJudgmentRune = judgmentRunes[0];

			if (existingJudgmentRune && canRefreshPersistentOrb) {
				existingJudgmentRune.sourceWeaponInstanceId = sourceWeaponInstanceId;
				existingJudgmentRune.baseDamagePerTick = Math.min(
					existingJudgmentRune.baseDamagePerTick,
					special.maxBaseDamagePerTick
				);
				existingJudgmentRune.damageMultiplier = Math.max(
					existingJudgmentRune.damageMultiplier,
					damageMultiplier
				);
				existingJudgmentRune.damagePerTick =
					existingJudgmentRune.baseDamagePerTick * existingJudgmentRune.damageMultiplier;
				existingJudgmentRune.damageGrowthPerCycle = special.damageGrowthPerCycle;
				existingJudgmentRune.maxBaseDamagePerTick = special.maxBaseDamagePerTick;
				existingJudgmentRune.damageRadius = special.damageRadius;
				existingJudgmentRune.orbitRadius = special.orbitRadius;
				existingJudgmentRune.sunRadius = special.sunRadius;
				existingJudgmentRune.orbitAngularSpeed =
					Math.PI * 2 * special.orbitsPerCycle * Math.max(0.001, pixlProgression.attackSpeed);
				existingJudgmentRune.tickInterval = special.tickInterval;
				existingJudgmentRune.tickTimer = Math.min(
					existingJudgmentRune.tickTimer,
					special.tickInterval
				);
				existingJudgmentRune.color = weapon.projectileVisual.color;
				existingJudgmentRune.glow = weapon.projectileVisual.glow ?? false;
				existingJudgmentRune.duration = Math.max(
					existingJudgmentRune.duration,
					existingJudgmentRune.age + nextDuration
				);

				if (!Number.isFinite(existingJudgmentRune.orbitAngle)) {
					existingJudgmentRune.orbitAngle = initialOrbitAngle;
				}
			} else if (!existingJudgmentRune) {
				judgmentRunes.push({
					sourceWeaponInstanceId,
					baseDamagePerTick: special.baseDamagePerTick,
					damageMultiplier,
					damagePerTick: special.baseDamagePerTick * damageMultiplier,
					damageGrowthPerCycle: special.damageGrowthPerCycle,
					maxBaseDamagePerTick: special.maxBaseDamagePerTick,
					nextDamageGrowthSweepIndex: currentSweepIndex + 1,
					damageRadius: special.damageRadius,
					orbitRadius: special.orbitRadius,
					sunRadius: special.sunRadius,
					orbitAngle: initialOrbitAngle,
					orbitAngularSpeed:
						Math.PI * 2 * special.orbitsPerCycle * Math.max(0.001, pixlProgression.attackSpeed),
					tickInterval: special.tickInterval,
					tickTimer: special.tickInterval,
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					age: 0,
					duration: nextDuration
				});
			}

			currentSweepTriggeredRuneTypes = new Set<TriggeredSweepRuneType>();
			currentSweepTriggeredRuneCount = 0;

			return {
				pendingNextWeaponDamageMultiplier: null,
				didActivate: true,
				nextCyclesUntilTrigger: null
			};
		};

		const triggerPerimeterMinePayloadAtPoint = ({
			weapon,
			sourceWeaponInstanceId,
			centerX,
			centerY,
			primaryHitEnemyId,
			damage = getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId)
		}: {
			weapon: WeaponDefinition;
			sourceWeaponInstanceId: string;
			centerX: number;
			centerY: number;
			primaryHitEnemyId: number;
			damage?: number;
		}) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'perimeter-mine') {
				return;
			}

			const mineCalibratorEffect = getMineCalibratorEffectAtPoint(centerX, centerY);
			const effectiveBlastRadius =
				special.blastRadius * mineCalibratorEffect.mineBlastRadiusMultiplier;
			const effectiveDamage = damage * mineCalibratorEffect.minePayloadDamageMultiplier;

			const detonationCopies = hasMineTriggerEcho ? 2 : 1;

			for (let detonationIndex = 0; detonationIndex < detonationCopies; detonationIndex += 1) {
				for (let blastEnemyIndex = enemies.length - 1; blastEnemyIndex >= 0; blastEnemyIndex -= 1) {
					const blastEnemy = enemies[blastEnemyIndex];
					const blastDistance = Math.hypot(blastEnemy.x - centerX, blastEnemy.y - centerY);

					if (blastDistance > effectiveBlastRadius + ENEMY_VISUALS[blastEnemy.kind].radius) {
						continue;
					}

					applyDamageToEnemy(blastEnemyIndex, effectiveDamage, 0.14, sourceWeaponInstanceId);
				}

				if (special.detonationBurningGround) {
					spawnBurningGroundPatch({
						weapon,
						sourceWeaponInstanceId,
						centerX,
						centerY,
						radius: special.detonationBurningGround.radius,
						damageMultiplier: special.detonationBurningGround.damageMultiplier ?? 1,
						tickInterval: special.detonationBurningGround.tickInterval,
						impactSize: special.detonationBurningGround.impactSize,
						durationCycles: special.detonationBurningGround.durationCycles
					});
				}

				spawnPerimeterMineShrapnelBurst(
					weapon,
					sourceWeaponInstanceId,
					centerX,
					centerY,
					primaryHitEnemyId
				);
			}
		};

		const spawnDelayedBomb = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: EnemyState
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'delayed-bomb') {
				return;
			}

			delayedBombs.push({
				sourceWeaponInstanceId,
				centerX: target.x,
				centerY: target.y,
				radius: special.radius,
				markerSize: special.markerSize,
				damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				detonationDelay:
					special.detonationDelayCycles / Math.max(0.001, pixlProgression.attackSpeed),
				hasDetonated: false,
				explosionFlash: 0
			});
		};

		const spawnPerimeterMine = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: EnemyState
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'perimeter-mine') {
				return;
			}

			const placementCount = getAdjustedMinePlacementCount(weapon);
			const baseAngle = Math.atan2(target.y - centerY, target.x - centerX);
			const angleOffsetStep = placementCount > 1 ? Math.PI / 7 : Math.PI / 9;
			const existingMinesFromSource = perimeterMines.filter(
				(mine) => mine.sourceWeaponInstanceId === sourceWeaponInstanceId && !mine.hasDetonated
			).length;
			const maxActiveMines = Math.max(
				1,
				special.maxActiveMines ?? DEFAULT_MAX_ACTIVE_PERIMETER_MINES
			);
			const availableMineSlots = Math.max(0, maxActiveMines - existingMinesFromSource);

			if (availableMineSlots <= 0) {
				return;
			}

			const placementsToSpawn = Math.min(placementCount, availableMineSlots);

			for (let placementIndex = 0; placementIndex < placementsToSpawn; placementIndex += 1) {
				const offsetIndex = existingMinesFromSource + placementIndex;
				const angleOffsetDirection = offsetIndex % 2 === 0 ? 1 : -1;
				const angleOffsetMagnitude = Math.ceil(offsetIndex / 2) * angleOffsetStep;
				const placementAngle = baseAngle + angleOffsetDirection * angleOffsetMagnitude;

				perimeterMines.push({
					sourceWeaponInstanceId,
					centerX: centerX + Math.cos(placementAngle) * special.placementRadius,
					centerY: centerY + Math.sin(placementAngle) * special.placementRadius,
					triggerRadius: special.triggerRadius,
					blastRadius: special.blastRadius,
					markerSize: special.markerSize,
					damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					age: 0,
					hasDetonated: false,
					explosionFlash: 0
				});
			}
		};

		const spawnTurretMine = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: EnemyState
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'turret-mine') {
				return;
			}

			const activeTurretsFromSource = turretMines.filter(
				(turret) => turret.sourceWeaponInstanceId === sourceWeaponInstanceId
			).length;
			const maxActiveTurrets = Math.max(1, special.maxActiveTurrets ?? 1);

			if (activeTurretsFromSource >= maxActiveTurrets) {
				return;
			}

			const baseAngle = Math.atan2(target.y - centerY, target.x - centerX);

			turretMines.push({
				sourceWeaponInstanceId,
				centerX: centerX + Math.cos(baseAngle) * arenaRadius,
				centerY: centerY + Math.sin(baseAngle) * arenaRadius,
				markerSize: special.markerSize,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				expiresAfterSweepIndex: currentSweepIndex + Math.max(1, special.turretDurationCycles),
				barrelAngle: baseAngle,
				fireFlash: 0
			});
		};

		const spawnMineShieldTurret = (utility: EquippedUtilityState, shieldAmount: number) => {
			const effect = utility.definition.effect;

			if (effect.type !== 'mine-shield-turret' || shieldAmount <= 0) {
				return;
			}

			const target = enemies.reduce<EnemyState | null>((closest, enemy) => {
				const distance = Math.hypot(enemy.x - centerX, enemy.y - centerY);
				const closestDistance = closest
					? Math.hypot(closest.x - centerX, closest.y - centerY)
					: Number.POSITIVE_INFINITY;

				return distance < closestDistance ? enemy : closest;
			}, null);
			const baseAngle = target ? Math.atan2(target.y - centerY, target.x - centerX) : -Math.PI / 2;
			const radialDistance = Math.max(arenaRadius, effect.placementRadius);
			const turretState: MineShieldTurretState = {
				sourceUtilityInstanceId: utility.instanceId,
				centerX: centerX + Math.cos(baseAngle) * radialDistance,
				centerY: centerY + Math.sin(baseAngle) * radialDistance,
				markerSize: effect.markerSize,
				color: utility.definition.utilityVisual?.color ?? '#67e8f9',
				glow: utility.definition.utilityVisual?.glow ?? true,
				age: 0,
				beamPulse: 0,
				shieldRatioFromMineDamage: effect.shieldRatioFromMineDamage * PLAYER_SHIELD_GAIN_MULTIPLIER
			};

			setMineShieldTurretShield(utility.instanceId, shieldAmount * PLAYER_SHIELD_GAIN_MULTIPLIER);
			activeShieldColor = turretState.color;

			const existingIndex = mineShieldTurrets.findIndex(
				(turret) => turret.sourceUtilityInstanceId === utility.instanceId
			);

			if (existingIndex >= 0) {
				mineShieldTurrets[existingIndex] = turretState;
				return;
			}

			mineShieldTurrets.push(turretState);
		};

		const spawnSupportPylon = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: EnemyState
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'support-pylon') {
				return;
			}

			supportPylons.push({
				sourceWeaponInstanceId,
				variant: special.variant,
				centerX: target.x,
				centerY: target.y,
				radius: special.radius,
				markerSize: Math.max(10, PROJECTILE_SIZE_BY_VISUAL[weapon.projectileVisual.size] * 1.5),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.fieldDurationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				markDamageMultiplier: special.markDamageMultiplier ?? 1,
				chillPerSecond: special.chillPerSecond ?? 0,
				freezeDuration: special.freezeDuration ?? 0,
				pullStrength: special.pullStrength ?? 0,
				mineTriggerRadiusBonus: special.mineTriggerRadiusBonus ?? 0,
				mineBlastRadiusMultiplier: special.mineBlastRadiusMultiplier ?? 1,
				minePayloadDamageMultiplier: special.minePayloadDamageMultiplier ?? 1,
				bleedDamageMultiplier: special.bleedDamageMultiplier ?? 1,
				bleedSpreadRatio: special.bleedSpreadRatio ?? 0,
				bleedSpreadRadius: special.bleedSpreadRadius ?? 0
			});
		};

		const spawnLaserRod = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: { x: number; y: number }
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'laser-rod-network') {
				return;
			}

			const sourceWeapon = equippedWeaponByInstanceId.get(sourceWeaponInstanceId);
			const targeting = sourceWeapon?.targeting ?? weapon.attack.targeting;

			laserRods = laserRods.filter((rod) => rod.sourceWeaponInstanceId !== sourceWeaponInstanceId);
			laserRods.push({
				sourceWeaponInstanceId,
				definitionId: weapon.id,
				variant: special.variant,
				centerX: target.x,
				centerY: target.y,
				rodAngle: 0,
				rodLength: special.rodLength,
				lineWidth: special.lineWidth,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.fieldDurationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				chillPerSecond: special.chillPerSecond ?? 0,
				fireDamageMultiplier: special.fireDamageMultiplier ?? 1,
				fireDebuffDuration: special.fireDebuffDuration ?? 0,
				freezeDuration: special.freezeDuration ?? 0,
				vulnerableDuration: special.vulnerableDuration ?? 0,
				targeting
			});
		};

		const fireTurretMinePayload = (turret: TurretMineState, payloadWeapon: WeaponDefinition) => {
			const turretWeapon = equippedWeaponByInstanceId.get(
				turret.sourceWeaponInstanceId
			)?.definition;

			if (!turretWeapon || turretWeapon.attack.special?.type !== 'turret-mine') {
				return false;
			}

			const target = enemies.reduce<EnemyState | null>((closest, enemy) => {
				const distance = Math.hypot(enemy.x - turret.centerX, enemy.y - turret.centerY);
				const closestDistance = closest
					? Math.hypot(closest.x - turret.centerX, closest.y - turret.centerY)
					: Number.POSITIVE_INFINITY;

				return distance < closestDistance ? enemy : closest;
			}, null);

			if (!target) {
				return false;
			}

			turret.barrelAngle = Math.atan2(target.y - turret.centerY, target.x - turret.centerX);
			turret.fireFlash = 0.9;

			spawnProjectile({
				sourceWeaponInstanceId: turret.sourceWeaponInstanceId,
				originX: turret.centerX,
				originY: turret.centerY,
				target,
				weapon: payloadWeapon,
				damage: 0,
				speed: getAdjustedProjectileSpeed(
					payloadWeapon,
					turret.sourceWeaponInstanceId,
					Math.max(220, payloadWeapon.projectileSpeed || turretWeapon.projectileSpeed) *
						(turretWeapon.attack.special.projectileSpeedMultiplier ?? 1)
				),
				size: Math.max(4, PROJECTILE_SIZE_BY_VISUAL[payloadWeapon.projectileVisual.size] * 0.8),
				shape: payloadWeapon.projectileVisual.shape ?? 'diamond',
				trail: payloadWeapon.projectileVisual.trail ?? 'pulse',
				glow: payloadWeapon.projectileVisual.glow ?? true,
				color: payloadWeapon.projectileVisual.color,
				motion: 'straight',
				pierceRemaining: 0,
				impactRadius: 0,
				impactRadiusGrowth: 0,
				maxImpactRadius: 0,
				ricochetRemaining: 0,
				sizeGrowth: 0,
				maxSize: Math.max(4, PROJECTILE_SIZE_BY_VISUAL[payloadWeapon.projectileVisual.size] * 0.8),
				canSplitOnImpact: false,
				minePayloadWeaponId: payloadWeapon.id,
				homingTargetEnemyId: target.id,
				homingTurnRate: 6
			});

			return true;
		};

		const fireTurretMinesForTriggeredWeapon = (weapon: WeaponDefinition) => {
			if (weapon.family !== 'mine' || weapon.id === 'turret-mine') {
				return;
			}

			const shotCount = getTurretMineReplicationShotCount(weapon);

			for (const turret of turretMines) {
				if (currentSweepIndex >= turret.expiresAfterSweepIndex) {
					continue;
				}

				const didFireInitialShot = fireTurretMinePayload(turret, weapon);

				if (!didFireInitialShot || shotCount <= 1) {
					continue;
				}

				turretMineBursts.push({
					turret,
					payloadWeaponId: weapon.id,
					shotsRemaining: shotCount - 1,
					emissionInterval: 0.055,
					emissionTimer: 0.055
				});
			}
		};

		const spawnLaserSweep = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'laser-sweep') {
				return;
			}

			laserSweeps.push({
				sourceWeaponInstanceId,
				startAngle: p.random(p.TWO_PI),
				angle: 0,
				beamLength: special.beamLength,
				beamWidth: special.beamWidth,
				damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.duration,
				hitEnemyIds: []
			});
		};

		const spawnSniperLock = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'sniper-line') {
				return;
			}

			const target = special.rangedOnly
				? getRangedEnemyTarget(weapon.attack.targeting)
				: getEnemyWeaponTarget(weapon.attack.targeting);

			if (!target) {
				return;
			}

			sniperLocks.push({
				enemyId: target.id,
				targetX: target.x,
				targetY: target.y,
				age: 0,
				chargeDuration: special.chargeDuration,
				lineWidth: special.lineWidth,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				weapon,
				sourceWeaponInstanceId
			});
		};

		const spawnExecutionLattice = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'execution-lattice') {
				return;
			}

			const targets = getFurthestEnemies(Math.max(1, special.targetCount));

			for (const [index, enemy] of targets.entries()) {
				executionLatticeStrikes.push({
					sourceWeaponInstanceId,
					enemyId: enemy.id,
					targetX: enemy.x,
					targetY: enemy.y,
					startY: enemy.y - special.dropHeight,
					markerSize: special.markerSize,
					damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					age: 0,
					dropDuration: special.dropDuration,
					hasHit: false,
					startDelay: index * 0.05
				});
			}
		};

		const spawnForkLightning = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'fork-lightning') {
				return;
			}

			const targets = getFurthestEnemies(enemies.length);

			if (targets.length === 0) {
				return;
			}

			const initialStrikeLead = 0.08;
			const chainDelay = 0.05;
			const segments: ForkLightningState['segments'] = [];
			let previousGeneration = [{ x: centerX, y: centerY }];
			let nextTargetIndex = 0;
			let generationIndex = 0;

			while (nextTargetIndex < targets.length) {
				const nextGeneration: Array<{ x: number; y: number }> = [];

				for (const branchStart of previousGeneration) {
					for (let branchIndex = 0; branchIndex < 2; branchIndex += 1) {
						if (nextTargetIndex >= targets.length) {
							break;
						}

						const target = targets[nextTargetIndex];
						nextTargetIndex += 1;
						nextGeneration.push({ x: target.x, y: target.y });

						segments.push({
							from: branchStart,
							to: { x: target.x, y: target.y },
							enemyId: target.id,
							damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
							startDelay:
								generationIndex === 0 ? 0 : initialStrikeLead + (generationIndex - 1) * chainDelay,
							hasHit: false
						});
					}
				}

				previousGeneration = nextGeneration;
				generationIndex += 1;
			}

			forkLightningBursts.push({
				sourceWeaponInstanceId,
				segments,
				branchWidth: special.branchWidth,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.duration
			});
		};

		const spawnFlamethrowerCone = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: EnemyState
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'flamethrower-cone') {
				return;
			}

			flamethrowerCones.push({
				sourceWeaponInstanceId,
				enemyId: target.id,
				angle: Math.atan2(target.y - centerY, target.x - centerX),
				reach: special.reach,
				halfAngleRadians: ((special.coneAngleDegrees / 2) * Math.PI) / 180,
				damagePerTick: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
				tickInterval: special.tickInterval,
				tickTimer: special.tickInterval,
				emissionInterval: Math.max(0.012, special.tickInterval * 0.06),
				emissionTimer: 0,
				projectilesReleased: 0,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				expiresAfterSweepIndex: currentSweepIndex + special.durationCycles
			});
		};

		const spawnIceShower = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'ice-shower') {
				return;
			}

			if (special.fullScreen) {
				blizzardStorms.push({
					sourceWeaponInstanceId,
					age: 0,
					duration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed),
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					chillAmount: special.chillAmount ?? 0.5,
					freezeDuration: special.freezeDuration ?? 1.6,
					hasAppliedChill: false
				});
			}

			const cycleDuration = 1 / Math.max(0.001, pixlProgression.attackSpeed);
			const spikeCount = Math.max(1, special.spikeCount);

			for (let index = 0; index < spikeCount; index += 1) {
				const fallbackAngle = p.random(p.TWO_PI);
				const fallbackRadius = p.random(0, arenaRadius * 0.82);
				const target = enemies.length > 0 ? enemies[index % enemies.length] : null;
				const targetX = target ? target.x : centerX + Math.cos(fallbackAngle) * fallbackRadius;
				const targetY = target ? target.y : centerY + Math.sin(fallbackAngle) * fallbackRadius;

				iceSpikes.push({
					sourceWeaponInstanceId,
					enemyId: target?.id ?? null,
					targetX,
					targetY,
					startY: -20 - p.random(20, 120),
					endY: p.height + 48,
					age: 0,
					startDelay: (cycleDuration / spikeCount) * index,
					fallDuration: special.fallDuration,
					damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
					impactRadius: special.impactRadius,
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					hasHit: false,
					driftAmplitude: p.random(4, 14),
					driftSpeed: p.random(4, 8),
					driftPhase: p.random(p.TWO_PI),
					size: p.random(5, 9)
				});
			}
		};

		const spawnVoidTendrils = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: { x: number; y: number }
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'void-tendrils') {
				return;
			}

			const eligibleTargets = enemies.filter(
				(enemy) => !isBossEnemy(enemy) && !isEnemyCapturedByVoidTendril(enemy.id)
			);
			const primaryTarget =
				[...eligibleTargets].sort(
					(left, right) =>
						Math.hypot(left.x - target.x, left.y - target.y) -
						Math.hypot(right.x - target.x, right.y - target.y)
				)[0] ?? null;

			if (!primaryTarget) {
				return;
			}

			const targets = getClosestEnemiesToPoint(
				primaryTarget.x,
				primaryTarget.y,
				Math.max(1, special.targetCount)
			).filter((enemy) => !isBossEnemy(enemy));
			const startCycleProgress = getCurrentCycleProgress();

			for (const target of targets) {
				voidTendrils.push({
					sourceWeaponInstanceId,
					enemyId: target.id,
					startX: target.x,
					startY: target.y,
					targetX: target.x,
					targetY: target.y,
					age: 0,
					latchDuration: special.latchDuration,
					startCycleProgress,
					consumeAtCycleProgress: startCycleProgress + special.consumeDelayCycles,
					shieldGain: target.maxHealth,
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false
				});
				target.voidTouchedTimer = Math.max(target.voidTouchedTimer, 999);
			}
		};

		const spawnNaturesWrath = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			target: { x: number; y: number }
		): WeaponActivationResult => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'natures-wrath') {
				return {
					pendingNextWeaponDamageMultiplier: null,
					didActivate: false,
					nextCyclesUntilTrigger: null
				};
			}

			const eligibleTargets = enemies.filter(
				(enemy) => !isBossEnemy(enemy) && !isEnemyCapturedByVoidTendril(enemy.id)
			);
			const primaryTarget =
				[...eligibleTargets].sort(
					(left, right) =>
						Math.hypot(left.x - target.x, left.y - target.y) -
						Math.hypot(right.x - target.x, right.y - target.y)
				)[0] ?? null;

			if (!primaryTarget) {
				return {
					pendingNextWeaponDamageMultiplier: null,
					didActivate: false,
					nextCyclesUntilTrigger: null
				};
			}

			naturesWraths.push({
				sourceWeaponInstanceId,
				enemyId: primaryTarget.id,
				targetX: primaryTarget.x,
				targetY: primaryTarget.y,
				age: 0,
				latchDuration: special.latchDuration,
				duration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed),
				pulseInterval: Math.max(0.05, special.pulseInterval),
				pulseTimer: Math.max(0.05, special.pulseInterval),
				healAmount: Math.max(1, Math.round(pixlProgression.health * special.healPulseRatio)),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false
			});

			return {
				pendingNextWeaponDamageMultiplier: null,
				didActivate: true,
				nextCyclesUntilTrigger: special.successCooldownCycles
			};
		};

		const retargetRicochetProjectile = (projectile: ProjectileState) => {
			let nextEnemy: EnemyState | null = null;
			let closestDistance = Number.POSITIVE_INFINITY;

			for (const enemy of enemies) {
				if (projectile.hitEnemyIds.includes(enemy.id)) {
					continue;
				}

				const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);

				if (distance < closestDistance) {
					closestDistance = distance;
					nextEnemy = enemy;
				}
			}

			if (!nextEnemy) {
				return false;
			}

			const dx = nextEnemy.x - projectile.x;
			const dy = nextEnemy.y - projectile.y;
			const distance = Math.hypot(dx, dy) || 1;

			projectile.originX = projectile.x;
			projectile.originY = projectile.y;
			projectile.lastX = projectile.x;
			projectile.lastY = projectile.y;
			projectile.directionX = dx / distance;
			projectile.directionY = dy / distance;
			projectile.perpendicularX = -projectile.directionY;
			projectile.perpendicularY = projectile.directionX;
			projectile.distanceTravelled = 0;
			projectile.age = 0;

			return true;
		};

		const retargetHomingProjectile = (projectile: ProjectileState) => {
			let nextEnemy: EnemyState | null = null;
			let closestDistance = Number.POSITIVE_INFINITY;

			for (const enemy of enemies) {
				if (projectile.hitEnemyIds.includes(enemy.id)) {
					continue;
				}

				const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);

				if (distance < closestDistance) {
					closestDistance = distance;
					nextEnemy = enemy;
				}
			}

			projectile.homingTargetEnemyId = nextEnemy?.id ?? null;

			return nextEnemy;
		};

		const spawnProjectile = ({
			sourceWeaponInstanceId,
			originX,
			originY,
			target,
			angleRadians,
			weapon,
			angleOffsetRadians = 0,
			damage = getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
			speed = getAdjustedProjectileSpeed(weapon, sourceWeaponInstanceId),
			size = PROJECTILE_SIZE_BY_VISUAL[weapon.projectileVisual.size],
			shape = weapon.projectileVisual.shape ?? 'square',
			trail = weapon.projectileVisual.trail ?? 'none',
			glow = weapon.projectileVisual.glow ?? false,
			color = weapon.projectileVisual.color,
			motion = weapon.attack.motion ?? 'straight',
			waveAmplitude = motion === 'wave' ? 10 : 0,
			waveFrequency = 18,
			wavePhase = 0,
			waveDrift = 0,
			pierceRemaining = Math.max(0, weapon.attack.pierceCount ?? 0),
			hitResetInterval = 0,
			impactRadius = Math.max(0, weapon.attack.impactRadius ?? 0),
			impactRadiusGrowth,
			maxImpactRadius,
			ricochetRemaining,
			sizeGrowth,
			maxSize,
			canSplitOnImpact = weapon.attack.special?.type === 'shrapnel-burst',
			collidesWithEnemies = true,
			impactTargetX = null,
			impactTargetY = null,
			arrivalEffect = null,
			arrivalTriggerRadius = 0,
			minePayloadWeaponId = null,
			homingTargetEnemyId,
			homingTurnRate
		}: {
			sourceWeaponInstanceId: string;
			originX: number;
			originY: number;
			target?: EnemyState;
			angleRadians?: number;
			weapon: WeaponDefinition;
			angleOffsetRadians?: number;
			damage?: number;
			speed?: number;
			size?: number;
			shape?: WeaponProjectileShape;
			trail?: WeaponTrailStyle;
			glow?: boolean;
			color?: string;
			motion?: WeaponProjectileMotion;
			waveAmplitude?: number;
			waveFrequency?: number;
			wavePhase?: number;
			waveDrift?: number;
			pierceRemaining?: number;
			hitResetInterval?: number;
			impactRadius?: number;
			impactRadiusGrowth?: number;
			maxImpactRadius?: number;
			ricochetRemaining?: number;
			sizeGrowth?: number;
			maxSize?: number;
			canSplitOnImpact?: boolean;
			collidesWithEnemies?: boolean;
			impactTargetX?: number | null;
			impactTargetY?: number | null;
			arrivalEffect?: 'burning-ground' | null;
			arrivalTriggerRadius?: number;
			minePayloadWeaponId?: string | null;
			homingTargetEnemyId?: number | null;
			homingTurnRate?: number;
		}) => {
			const baseAngle =
				(angleRadians ??
					(target ? Math.atan2(target.y - originY, target.x - originX) : undefined) ??
					0) + angleOffsetRadians;
			const directionX = Math.cos(baseAngle);
			const directionY = Math.sin(baseAngle);

			const expandingWave =
				weapon.attack.special?.type === 'expanding-wave' ? weapon.attack.special : null;
			const primaryShrapnelOrb = canSplitOnImpact;
			const scaledSpeed = primaryShrapnelOrb ? speed / 3 : speed;
			const scaledSize = primaryShrapnelOrb ? size * 3 : size;

			projectiles.push({
				weaponId: weapon.id,
				sourceWeaponInstanceId,
				originX,
				originY,
				x: originX,
				y: originY,
				lastX: originX,
				lastY: originY,
				directionX,
				directionY,
				perpendicularX: -directionY,
				perpendicularY: directionX,
				speed: scaledSpeed,
				distanceTravelled: 0,
				age: 0,
				damage,
				visual: createWeaponVisualProps(weapon.projectileVisual, {
					size: scaledSize,
					shape,
					trail,
					glow,
					color
				}),
				animation: {
					age: 0,
					directionX,
					directionY,
					lastX: originX,
					lastY: originY,
					motion
				},
				color,
				size: scaledSize,
				shape,
				trail,
				glow,
				canSplitOnImpact,
				motion,
				waveAmplitude,
				waveFrequency,
				wavePhase,
				waveDrift,
				pierceRemaining,
				impactRadius,
				impactRadiusGrowth: Math.max(
					0,
					impactRadiusGrowth ?? expandingWave?.impactRadiusGrowth ?? 0
				),
				maxImpactRadius: Math.max(
					0,
					maxImpactRadius ?? expandingWave?.maxImpactRadius ?? impactRadius
				),
				ricochetRemaining:
					ricochetRemaining ??
					(weapon.attack.special?.type === 'ricochet' ? weapon.attack.special.bounceCount : 0),
				sizeGrowth: Math.max(0, sizeGrowth ?? expandingWave?.sizeGrowth ?? 0),
				maxSize: Math.max(
					scaledSize,
					primaryShrapnelOrb ? scaledSize : (maxSize ?? expandingWave?.maxSize ?? scaledSize)
				),
				hitEnemyIds: [],
				hitResetInterval,
				hitResetTimer: hitResetInterval,
				homingTargetEnemyId:
					homingTargetEnemyId ?? (weapon.id === 'heavy-orb' ? (target?.id ?? null) : null),
				homingTurnRate: homingTurnRate ?? (weapon.id === 'heavy-orb' ? 2.4 : 0),
				collidesWithEnemies,
				impactTargetX,
				impactTargetY,
				arrivalEffect,
				arrivalTriggerRadius,
				minePayloadWeaponId,
				mirrorBounceReady: false,
				reflectedByMirror: false
			});
		};

		const triggerProjectileArrivalEffect = (projectile: ProjectileState) => {
			if (projectile.arrivalEffect !== 'burning-ground') {
				return;
			}

			const weapon = getWeaponDefinition(projectile.weaponId);
			spawnBurningGroundAt(
				weapon,
				projectile.sourceWeaponInstanceId,
				projectile.impactTargetX ?? projectile.x,
				projectile.impactTargetY ?? projectile.y
			);
		};

		const fireProjectile = (
			target: EnemyState,
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			angleOffsetRadians = 0
		) => {
			if (weapon.id === 'the-knife') {
				knifeRemainingRicochetsByInstanceId[sourceWeaponInstanceId] =
					hemorrhageBurstEffect?.bounceCount ?? 0;
				spawnProjectile({
					sourceWeaponInstanceId,
					originX: centerX,
					originY: centerY,
					target,
					weapon,
					angleOffsetRadians
				});
				return;
			}

			spawnProjectile({
				sourceWeaponInstanceId,
				originX: centerX,
				originY: centerY,
				target,
				weapon,
				angleOffsetRadians
			});
		};

		const fireLineBurst = (
			target: EnemyState,
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string
		) => {
			const shotCount = Math.max(1, weapon.attack.projectileCount);
			const angle = Math.atan2(target.y - centerY, target.x - centerX);
			const directionX = Math.cos(angle);
			const directionY = Math.sin(angle);
			const spacing = 16;

			for (let index = 0; index < shotCount; index += 1) {
				const offset = spacing * (shotCount - 1 - index);
				spawnProjectile({
					sourceWeaponInstanceId,
					originX: centerX - directionX * offset,
					originY: centerY - directionY * offset,
					target,
					weapon,
					angleRadians: angle
				});
			}
		};

		const firePulseArrayBurst = (
			target: EnemyState,
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string
		) => {
			const burstCount = 3;
			const projectileCount = Math.max(1, weapon.attack.projectileCount);
			const totalSpreadRadians = ((weapon.attack.spreadDegrees ?? 0) * Math.PI) / 180;
			const startOffset = -totalSpreadRadians / 2;
			const step = projectileCount > 1 ? totalSpreadRadians / (projectileCount - 1) : 0;
			const angle = Math.atan2(target.y - centerY, target.x - centerX);
			const directionX = Math.cos(angle);
			const directionY = Math.sin(angle);
			const burstSpacing = 18;

			for (let burstIndex = 0; burstIndex < burstCount; burstIndex += 1) {
				const originOffset = burstSpacing * (burstCount - 1 - burstIndex);
				const originX = centerX - directionX * originOffset;
				const originY = centerY - directionY * originOffset;

				for (let projectileIndex = 0; projectileIndex < projectileCount; projectileIndex += 1) {
					spawnProjectile({
						sourceWeaponInstanceId,
						originX,
						originY,
						target,
						weapon,
						angleRadians: angle,
						angleOffsetRadians: startOffset + step * projectileIndex
					});
				}
			}
		};

		const spawnShrapnelBurst = (
			projectile: ProjectileState,
			weapon: WeaponDefinition,
			impactX: number,
			impactY: number,
			hitEnemyId: number
		) => {
			const special = weapon.attack.special;

			if (!projectile.canSplitOnImpact || !special || special.type !== 'shrapnel-burst') {
				return;
			}

			const nearbyEnemies = getClosestEnemiesToPoint(
				impactX,
				impactY,
				special.fragmentCount,
				special.fragmentSearchRadius,
				[hitEnemyId]
			);

			for (const enemy of nearbyEnemies) {
				spawnProjectile({
					sourceWeaponInstanceId: projectile.sourceWeaponInstanceId,
					originX: impactX,
					originY: impactY,
					target: enemy,
					weapon,
					damage: getAdjustedWeaponDamage(
						weapon,
						special.fragmentDamageMultiplier,
						projectile.sourceWeaponInstanceId
					),
					speed: getAdjustedProjectileSpeed(
						weapon,
						projectile.sourceWeaponInstanceId,
						weapon.projectileSpeed * special.fragmentSpeedMultiplier
					),
					size: Math.max(4, projectile.size * 0.45),
					shape: 'spark',
					trail: 'streak',
					glow: true,
					color: '#ffb08f',
					motion: 'straight',
					pierceRemaining: 0,
					impactRadius: 0,
					impactRadiusGrowth: 0,
					maxImpactRadius: 0,
					ricochetRemaining: 0,
					sizeGrowth: 0,
					maxSize: Math.max(4, projectile.size * 0.45),
					canSplitOnImpact: false
				});
			}

			const remainingFragments = Math.max(0, special.fragmentCount - nearbyEnemies.length);

			for (let index = 0; index < remainingFragments; index += 1) {
				spawnProjectile({
					sourceWeaponInstanceId: projectile.sourceWeaponInstanceId,
					originX: impactX,
					originY: impactY,
					angleRadians: (index / Math.max(1, remainingFragments)) * Math.PI * 2,
					weapon,
					damage: getAdjustedWeaponDamage(
						weapon,
						special.fragmentDamageMultiplier,
						projectile.sourceWeaponInstanceId
					),
					speed: getAdjustedProjectileSpeed(
						weapon,
						projectile.sourceWeaponInstanceId,
						weapon.projectileSpeed * special.fragmentSpeedMultiplier
					),
					size: Math.max(4, projectile.size * 0.45),
					shape: 'spark',
					trail: 'streak',
					glow: true,
					color: '#ffb08f',
					motion: 'straight',
					pierceRemaining: 0,
					impactRadius: 0,
					impactRadiusGrowth: 0,
					maxImpactRadius: 0,
					ricochetRemaining: 0,
					sizeGrowth: 0,
					maxSize: Math.max(4, projectile.size * 0.45),
					canSplitOnImpact: false
				});
			}
		};

		const spawnPerimeterMineShrapnelBurst = (
			weapon: WeaponDefinition,
			sourceWeaponInstanceId: string,
			impactX: number,
			impactY: number,
			hitEnemyId: number
		) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'perimeter-mine' || !special.detonationShrapnel) {
				return;
			}

			const shrapnel = special.detonationShrapnel;
			const nearbyEnemies = getClosestEnemiesToPoint(
				impactX,
				impactY,
				shrapnel.fragmentCount,
				shrapnel.fragmentSearchRadius,
				[hitEnemyId]
			);
			const fragmentSize = Math.max(
				4,
				PROJECTILE_SIZE_BY_VISUAL[weapon.projectileVisual.size] * 0.45
			);

			for (const enemy of nearbyEnemies) {
				spawnProjectile({
					sourceWeaponInstanceId,
					originX: impactX,
					originY: impactY,
					target: enemy,
					weapon,
					damage: getAdjustedWeaponDamage(
						weapon,
						shrapnel.fragmentDamageMultiplier,
						sourceWeaponInstanceId
					),
					speed: getAdjustedProjectileSpeed(
						weapon,
						sourceWeaponInstanceId,
						weapon.projectileSpeed * shrapnel.fragmentSpeedMultiplier
					),
					size: fragmentSize,
					shape: 'spark',
					trail: 'streak',
					glow: true,
					color: '#ffb08f',
					motion: 'straight',
					pierceRemaining: Number.POSITIVE_INFINITY,
					impactRadius: 0,
					impactRadiusGrowth: 0,
					maxImpactRadius: 0,
					ricochetRemaining: 0,
					sizeGrowth: 0,
					maxSize: fragmentSize,
					canSplitOnImpact: false
				});
			}

			const remainingFragments = Math.max(0, shrapnel.fragmentCount - nearbyEnemies.length);

			for (let index = 0; index < remainingFragments; index += 1) {
				spawnProjectile({
					sourceWeaponInstanceId,
					originX: impactX,
					originY: impactY,
					angleRadians: (index / Math.max(1, remainingFragments)) * Math.PI * 2,
					weapon,
					damage: getAdjustedWeaponDamage(
						weapon,
						shrapnel.fragmentDamageMultiplier,
						sourceWeaponInstanceId
					),
					speed: getAdjustedProjectileSpeed(
						weapon,
						sourceWeaponInstanceId,
						weapon.projectileSpeed * shrapnel.fragmentSpeedMultiplier
					),
					size: fragmentSize,
					shape: 'spark',
					trail: 'streak',
					glow: true,
					color: '#ffb08f',
					motion: 'straight',
					pierceRemaining: Number.POSITIVE_INFINITY,
					impactRadius: 0,
					impactRadiusGrowth: 0,
					maxImpactRadius: 0,
					ricochetRemaining: 0,
					sizeGrowth: 0,
					maxSize: fragmentSize,
					canSplitOnImpact: false
				});
			}
		};

		const activateWeapon = (weapon: EquippedWeaponState, target: { x: number; y: number }) => {
			if (
				weapon.definition.attack.special?.type === 'knife-sheath' ||
				weapon.definition.attack.special?.type === 'pea-ascender'
			) {
				return;
			}

			if (weapon.cyclesUntilTrigger > 1) {
				weapon.cyclesUntilTrigger -= 1;
				return;
			}

			weapon.cyclesUntilTrigger = weapon.cycleInterval;
			const queuedDamageMultiplier = pendingNextWeaponDamageMultiplier;
			weaponDamageMultiplierByInstanceId[weapon.instanceId] = queuedDamageMultiplier;
			pendingNextWeaponDamageMultiplier = 1;

			const weaponModule = getWeaponModule(weapon.definition.id);
			const result = weaponModule.activate(weapon, target, {
				spawnJudgmentRune: (definition, instanceId, judgmentTarget) => {
					return spawnJudgmentRune(definition, instanceId, judgmentTarget as EnemyState);
				},
				spawnAscendanceRune,
				spawnRuneReiterator,
				spawnBindingRune: (definition, instanceId, runeTarget) => {
					spawnBindingRune(definition, instanceId, runeTarget as EnemyState);
				},
				spawnSunbrandRune: (definition, instanceId, runeTarget) => {
					spawnSunbrandRune(definition, instanceId, runeTarget as EnemyState);
				},
				spawnSlowingRune: (definition, instanceId, runeTarget) => {
					spawnSlowingRune(definition, instanceId, runeTarget as EnemyState);
				},
				spawnHealingRune: (definition, instanceId, runeTarget) => {
					spawnHealingRune(definition, instanceId, runeTarget as EnemyState);
				},
				spawnSunRune: (definition, instanceId, runeTarget) => {
					spawnSunRune(definition, instanceId, runeTarget as EnemyState);
				},
				spawnNaturesWrath: (definition, instanceId, wrathTarget) => {
					return spawnNaturesWrath(definition, instanceId, wrathTarget as EnemyState);
				},
				spawnForceField,
				spawnKillSwitchPulse,
				spawnVulnerablePulse,
				spawnLaserSweep,
				spawnLaserRod,
				spawnSupportPylon: (definition, instanceId, pylonTarget) => {
					spawnSupportPylon(definition, instanceId, pylonTarget as EnemyState);
				},
				spawnNeedleFan,
				ensureMarkedEnemy,
				assignMarkedEnemy: (markedTarget) => {
					assignMarkedEnemy(markedTarget as EnemyState);
				},
				fireProjectile: (projectileTarget, definition, instanceId, angleOffsetRadians) => {
					fireProjectile(
						projectileTarget as EnemyState,
						definition,
						instanceId,
						angleOffsetRadians
					);
				},
				spawnSniperLock,
				spawnExecutionLattice,
				spawnForkLightning,
				spawnPerimeterMine: (definition, instanceId, mineTarget) => {
					spawnPerimeterMine(definition, instanceId, mineTarget as EnemyState);
				},
				spawnTurretMine: (definition, instanceId, turretTarget) => {
					spawnTurretMine(definition, instanceId, turretTarget as EnemyState);
				},
				spawnStasisField: (definition, instanceId, stasisTarget) => {
					spawnStasisField(definition, instanceId, stasisTarget as EnemyState);
				},
				spawnPrismPrison,
				spawnVoidTunnel: (definition, instanceId, tunnelTarget) => {
					spawnVoidTunnel(definition, instanceId, tunnelTarget as EnemyState);
				},
				spawnVoidRift,
				spawnPhaseshift,
				spawnBurningGroundProjectile: (definition, instanceId, burnTarget) => {
					spawnProjectile({
						sourceWeaponInstanceId: instanceId,
						originX: centerX,
						originY: centerY,
						target: burnTarget as EnemyState,
						weapon: definition,
						damage: 0,
						speed: Math.max(280, getAdjustedProjectileSpeed(definition, instanceId)),
						size: PROJECTILE_SIZE_BY_VISUAL[definition.projectileVisual.size] * 1.15,
						motion: 'accelerate',
						waveAmplitude: 5,
						waveFrequency: 9,
						wavePhase: p.random(p.TWO_PI),
						waveDrift: p.random(-0.02, 0.02),
						collidesWithEnemies: false,
						impactTargetX: burnTarget.x,
						impactTargetY: burnTarget.y,
						arrivalEffect: 'burning-ground',
						arrivalTriggerRadius: 16
					});
				},
				spawnDelayedBomb: (definition, instanceId, bombTarget) => {
					spawnDelayedBomb(definition, instanceId, bombTarget as EnemyState);
				},
				spawnFlamethrowerCone: (definition, instanceId, flameTarget) => {
					spawnFlamethrowerCone(definition, instanceId, flameTarget as EnemyState);
				},
				spawnIceShower,
				spawnVoidTendrils,
				getClosestEnemies,
				fireLineBurst: (burstTarget, definition, instanceId) => {
					fireLineBurst(burstTarget as EnemyState, definition, instanceId);
				},
				firePulseArrayBurst: (burstTarget, definition, instanceId) => {
					firePulseArrayBurst(burstTarget as EnemyState, definition, instanceId);
				}
			});

			if (result.didActivate === false) {
				pendingNextWeaponDamageMultiplier = queuedDamageMultiplier;
				weapon.cyclesUntilTrigger = weapon.cycleInterval;
				return;
			}

			if (result.nextCyclesUntilTrigger !== null && result.nextCyclesUntilTrigger !== undefined) {
				weapon.cyclesUntilTrigger = Math.max(1, result.nextCyclesUntilTrigger);
			}

			const activatedSpecialType = weapon.definition.attack.special?.type;
			const trackedSweepRuneType = trackedSweepRuneSpecialTypes.has(
				activatedSpecialType as TriggeredSweepRuneType
			)
				? (activatedSpecialType as TriggeredSweepRuneType)
				: null;
			const replayableRuneType = replayableRuneSpecialTypes.has(
				activatedSpecialType as PendingRuneEchoState['runeType']
			)
				? (activatedSpecialType as PendingRuneEchoState['runeType'])
				: null;

			if (trackedSweepRuneType) {
				currentSweepTriggeredRuneTypes.add(trackedSweepRuneType);
				currentSweepTriggeredRuneCount += 1;
			}

			if (replayableRuneType) {
				triggeredRuneReplays.push({
					runeType: replayableRuneType,
					weapon: weapon.definition,
					sourceWeaponInstanceId: weapon.instanceId
				});
			}

			if (result.pendingNextWeaponDamageMultiplier !== null) {
				pendingNextWeaponDamageMultiplier = Math.max(
					pendingNextWeaponDamageMultiplier,
					result.pendingNextWeaponDamageMultiplier
				);
			}

			fireTurretMinesForTriggeredWeapon(weapon.definition);
		};

		const activateUtility = (utility: EquippedUtilityState) => {
			const requiredInfusion = utility.definition.requiredInfusion;
			const requiredInfusionCount = Math.max(1, utility.definition.requiredInfusionCount ?? 1);

			if (requiredInfusion) {
				if (elementalInfusions[requiredInfusion] < requiredInfusionCount) {
					return;
				}

				elementalInfusions[requiredInfusion] -= requiredInfusionCount;
			}

			getUtilityModuleByInstanceId(utility.instanceId).activate(utility, {
				currentSweepIndex,
				getTriggeredRuneCount: () => currentSweepTriggeredRuneTypes.size,
				getShieldPoolForSource: (sourceId) => pixlShieldSources[sourceId] ?? 0,
				setShieldPoolForSource: (sourceId, shieldPercent) => {
					setPixlShieldSourceAmount(
						sourceId,
						Math.ceil(pixlProgression.health * shieldPercent * PLAYER_SHIELD_GAIN_MULTIPLIER)
					);
				},
				getUtilityShieldOutputMultiplier,
				getMineWeaponDamageTotal,
				spawnMineShieldTurret,
				recalculateShieldPool: recalculatePixlShieldPool,
				setActiveShieldColor: (color) => {
					activeShieldColor = color;
				},
				addElementalInfusion: (element) => {
					elementalInfusions[element] += 1;
				},
				getElementalInfusionCount: (element) => elementalInfusions[element],
				spendElementalInfusion: (element, amount) => {
					elementalInfusions[element] = Math.max(0, elementalInfusions[element] - amount);
				},
				spawnOathbreakerSigil,
				spawnMirrorArray,
				applyVanishRune,
				applyCycleDamageBoost: (damageMultiplier, expiresAfterSweepIndex) => {
					cycleDamageMultiplier = Math.max(cycleDamageMultiplier, damageMultiplier);
					cycleDamageBuffExpiresAfterSweepIndex = expiresAfterSweepIndex;
				},
				applyElementalCycleBoost: (element, damageMultiplier, expiresAfterSweepIndex) => {
					for (const activeElement of Object.keys(
						elementalCycleDamageMultipliers
					) as ElementalInfusionType[]) {
						elementalCycleDamageMultipliers[activeElement] = 1;
						elementalCycleBuffExpiresAfterSweepIndex[activeElement] = null;
					}

					elementalCycleDamageMultipliers[element] = Math.max(
						elementalCycleDamageMultipliers[element],
						damageMultiplier
					);
					elementalCycleBuffExpiresAfterSweepIndex[element] = expiresAfterSweepIndex;
				},
				applyElementalMasteryBoost: (damageMultiplier, expiresAfterSweepIndex) => {
					for (const activeElement of Object.keys(
						elementalCycleDamageMultipliers
					) as ElementalInfusionType[]) {
						elementalCycleDamageMultipliers[activeElement] = damageMultiplier;
						elementalCycleBuffExpiresAfterSweepIndex[activeElement] = expiresAfterSweepIndex;
					}
				}
			});
		};

		const activateWeaponsAtColumn = (column: number) => {
			if (hasActiveVanishRune()) {
				return;
			}

			for (const utility of triggeredUtilities) {
				if (utility.triggerColumn !== column) {
					continue;
				}

				if (utility.definition.effect.type === 'elemental-mastery') {
					continue;
				}

				activateUtility(utility);
			}

			const weaponsAtColumn = equippedWeapons
				.filter((weapon) => weapon.triggerColumn === column)
				.sort(
					(left, right) =>
						left.placementY - right.placementY ||
						left.placementX - right.placementX ||
						left.instanceId.localeCompare(right.instanceId)
				);

			for (const weapon of weaponsAtColumn) {
				if (hasActiveAscender && weapon.definition.id === 'pea-shooter') {
					continue;
				}

				const requiredInfusion = weapon.definition.attack.requiredInfusion;
				const baseRequiredInfusionCount = Math.max(
					1,
					weapon.definition.attack.requiredInfusionCount ?? 1
				);
				const requiredInfusionCount = requiredInfusion
					? Math.max(0, baseRequiredInfusionCount - (hasActiveElementalMastery() ? 1 : 0))
					: baseRequiredInfusionCount;

				if (requiredInfusion) {
					const reservedInfusionCount = getPendingElementalMasteryReservation(requiredInfusion);
					const availableInfusionCount = Math.max(
						0,
						elementalInfusions[requiredInfusion] - reservedInfusionCount
					);

					if (availableInfusionCount < requiredInfusionCount) {
						continue;
					}

					elementalInfusions[requiredInfusion] -= requiredInfusionCount;
				}

				const target = getEnemyWeaponTarget(weapon.targeting);

				if (!target) {
					continue;
				}

				activateWeapon(weapon, target);
			}
		};

		const updateAscendedPeaShooterBeams = (dt: number) => {
			if (!hasActiveAscender || hasActiveVanishRune()) {
				return;
			}

			for (const peaShooter of ascendedPeaShooters) {
				const target = getEnemyWeaponTarget(peaShooter.targeting);

				if (!target) {
					ascenderBeamTickTimersByInstanceId[peaShooter.instanceId] = Math.min(
						0.2,
						(ascenderBeamTickTimersByInstanceId[peaShooter.instanceId] ?? 0.2) + dt
					);
					continue;
				}

				ascenderBeamTickTimersByInstanceId[peaShooter.instanceId] =
					(ascenderBeamTickTimersByInstanceId[peaShooter.instanceId] ?? 0.2) - dt;

				while ((ascenderBeamTickTimersByInstanceId[peaShooter.instanceId] ?? 0) <= 0) {
					const deltaX = target.x - centerX;
					const deltaY = target.y - centerY;
					const distance = Math.hypot(deltaX, deltaY) || 1;
					const directionX = deltaX / distance;
					const directionY = deltaY / distance;
					const beamLength = Math.max(arenaRadius * 2.6, Math.hypot(p.width, p.height));
					const beamWidth = 10 + Math.sin(pixlAuraClock * 8 + peaShooter.placementX) * 0.8;
					const elapsedRampMultiplier = 1 + currentLevelElapsedTime * 0.03;
					const beamTickDamage = getAdjustedWeaponDamage(
						peaShooter.definition,
						2.2 * Math.max(0.5, pixlProgression.attackSpeed) * elapsedRampMultiplier,
						peaShooter.instanceId
					);

					for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
						const enemy = enemies[enemyIndex];
						const offsetX = enemy.x - centerX;
						const offsetY = enemy.y - centerY;
						const alongBeam = offsetX * directionX + offsetY * directionY;

						if (alongBeam < 0 || alongBeam > beamLength) {
							continue;
						}

						const perpendicularDistance = Math.abs(offsetX * -directionY + offsetY * directionX);
						const hitWidth = beamWidth / 2 + ENEMY_VISUALS[enemy.kind].radius;

						if (perpendicularDistance > hitWidth) {
							continue;
						}

						applyDamageToEnemy(enemyIndex, beamTickDamage, 0.09, peaShooter.instanceId);
					}

					ascenderBeamTickTimersByInstanceId[peaShooter.instanceId] += 0.2;
				}
			}
		};

		const triggerSweepColumns = (startColumn: number, endColumn: number) => {
			for (const column of equippedWeaponColumns) {
				if (column >= startColumn && column < endColumn) {
					activateWeaponsAtColumn(column);
				}
			}
		};

		const advanceSweep = (dt: number) => {
			pixlAuraClock += dt;

			if (equippedWeaponColumns.length === 0) {
				return;
			}

			const loadoutColumnCount = pixlProgression.loadoutColumns;

			let remainingColumns = dt * pixlProgression.attackSpeed * loadoutColumnCount;

			while (remainingColumns > 0) {
				const distanceToEnd = loadoutColumnCount - sweepProgress;
				const step = Math.min(distanceToEnd, remainingColumns);
				const nextSweepProgress = sweepProgress + step;

				triggerSweepColumns(sweepProgress, nextSweepProgress);
				sweepProgress = nextSweepProgress;
				remainingColumns -= step;

				if (sweepProgress >= loadoutColumnCount) {
					for (const utility of triggeredUtilities) {
						if (hasActiveVanishRune()) {
							break;
						}

						if (utility.definition.effect.type !== 'elemental-mastery') {
							continue;
						}

						activateUtility(utility);
					}

					sweepProgress = 0;
					currentSweepIndex += 1;
					publishedAverageDamageByWeaponInstanceId = Object.fromEntries(
						equippedWeapons.map((weapon) => [
							weapon.instanceId,
							(cumulativeDamageByWeaponInstanceId[weapon.instanceId] ?? 0) / currentSweepIndex
						])
					) as Record<string, number>;
					currentSweepTriggeredRuneTypes = new Set<TriggeredSweepRuneType>();
					currentSweepTriggeredRuneCount = 0;

					if (
						cycleDamageBuffExpiresAfterSweepIndex !== null &&
						currentSweepIndex >= cycleDamageBuffExpiresAfterSweepIndex
					) {
						cycleDamageMultiplier = 1;
						cycleDamageBuffExpiresAfterSweepIndex = null;
					}

					for (const element of Object.keys(
						elementalCycleBuffExpiresAfterSweepIndex
					) as ElementalInfusionType[]) {
						if (
							elementalCycleBuffExpiresAfterSweepIndex[element] !== null &&
							currentSweepIndex >= (elementalCycleBuffExpiresAfterSweepIndex[element] as number)
						) {
							elementalCycleDamageMultipliers[element] = 1;
							elementalCycleBuffExpiresAfterSweepIndex[element] = null;
						}
					}

					elementalInfusions = createEmptyElementalInfusions();
				}
			}
		};

		const markCleared = () => {
			rewardPacks = rollLevelRewardPacks();
			waveDrops = [];
			status = endlessMode
				? 'cleared'
				: currentLevelIndex === levels.length - 1
					? 'complete'
					: 'cleared';
			statusTimer = status === 'complete' ? CAMPAIGN_LOOP_DELAY : LEVEL_CLEAR_DELAY;
			commitLevelRewards(rewardPacks);
		};

		const commitLevelRewards = (rewardPacks: PersistedRewardPack[] = []) => {
			if (levelRewardsCommitted || status === 'defeated') {
				return;
			}

			pixlProgression = applyXpGain(pixlProgression, waveXp);
			bankedXp = pixlProgression.xp;

			highestClearedLevel = Math.max(highestClearedLevel, getResolvedLevelNumber(currentLevel));

			if (endlessMode) {
				const didAwardDungeonKey = Math.random() < 0.01;

				if (didAwardDungeonKey) {
					dungeonKeys = {
						...dungeonKeys,
						'dungeon-1-key': (dungeonKeys['dungeon-1-key'] ?? 0) + 1
					};
				}

				highestUnlockedLevel = Math.max(
					highestUnlockedLevel,
					getResolvedLevelNumber(currentLevel) + 1
				);
				persistProgress(
					getResolvedLevelNumber(currentLevel) + 1,
					rewardPacks,
					getResolvedLevelNumber(currentLevel),
					didAwardDungeonKey
				);
			} else if (status === 'complete') {
				completed = true;
				highestUnlockedLevel = campaign.totalLevels;
				persistProgress(
					campaign.totalLevels,
					rewardPacks,
					getResolvedLevelNumber(currentLevel),
					false
				);
			} else {
				highestUnlockedLevel = Math.max(
					highestUnlockedLevel,
					getResolvedLevelNumber(currentLevel) + 1
				);
				persistProgress(
					getResolvedLevelNumber(currentLevel) + 1,
					rewardPacks,
					getResolvedLevelNumber(currentLevel),
					false
				);
			}

			levelRewardsCommitted = true;
		};

		const applySkipResultsSignal = () => {
			const nextSkipResultsSignal = options.getSkipResultsSignal?.() ?? 0;

			if (nextSkipResultsSignal === lastSkipResultsSignal) {
				return;
			}

			lastSkipResultsSignal = nextSkipResultsSignal;

			if (status === 'cleared' || status === 'complete') {
				statusTimer = 0;
			}
		};

		const markDefeated = () => {
			status = 'defeated';
			statusTimer = LEVEL_RESET_DELAY;
		};

		const updateWaveFlow = (dt: number) => {
			spawnAccumulator += dt * currentLevel.spawnRatePerSecond;

			while (spawnAccumulator >= 1 && spawnQueue.length > 0) {
				spawnAccumulator -= 1;
				spawnEnemy(spawnQueue.shift() as CombatEnemyKind);
			}

			advanceSweep(dt);
		};

		const updateForceFields = (dt: number) => {
			for (let index = forceFields.length - 1; index >= 0; index -= 1) {
				const field = forceFields[index];
				field.age += dt;

				if (field.age < field.startDelay) {
					continue;
				}

				field.radius += field.expansionSpeed * dt;

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (field.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
					const distance = Math.hypot(enemy.x - field.centerX, enemy.y - field.centerY);
					const ringThreshold = field.lineWidth / 2 + enemyRadius;

					if (Math.abs(distance - field.radius) > ringThreshold) {
						continue;
					}

					field.hitEnemyIds = [...field.hitEnemyIds, enemy.id];
					const directionX = distance > 0 ? (enemy.x - field.centerX) / distance : 1;
					const directionY = distance > 0 ? (enemy.y - field.centerY) / distance : 0;
					enemy.x += directionX * (field.pushDistance + enemyRadius);
					enemy.y += directionY * (field.pushDistance + enemyRadius);
					applyDamageToEnemy(enemyIndex, field.damage, 0.1, field.sourceWeaponInstanceId);
				}

				if (field.radius >= field.maxRadius) {
					forceFields.splice(index, 1);
				}
			}
		};

		const updateKillSwitchPulses = (dt: number) => {
			for (let index = killSwitchPulses.length - 1; index >= 0; index -= 1) {
				const pulse = killSwitchPulses[index];
				pulse.age += dt;
				pulse.radius += pulse.expansionSpeed * dt;

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (pulse.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
					const distance = Math.hypot(enemy.x - pulse.centerX, enemy.y - pulse.centerY);
					const ringThreshold = pulse.lineWidth / 2 + enemyRadius;

					if (Math.abs(distance - pulse.radius) > ringThreshold) {
						continue;
					}

					pulse.hitEnemyIds = [...pulse.hitEnemyIds, enemy.id];

					if (enemy.health / Math.max(1, enemy.maxHealth) > pulse.executeThresholdRatio) {
						continue;
					}

					const executeDamage = enemy.supportShieldPool + enemy.health + enemy.maxHealth * 2;
					applyDamageToEnemy(enemyIndex, executeDamage, 0.18, pulse.sourceWeaponInstanceId, {
						applyWeaponHitEffects: false,
						allowContextHealing: false
					});
				}

				if (pulse.radius >= pulse.maxRadius) {
					killSwitchPulses.splice(index, 1);
				}
			}
		};

		const updateVulnerablePulses = (dt: number) => {
			for (let index = vulnerablePulses.length - 1; index >= 0; index -= 1) {
				const pulse = vulnerablePulses[index];
				pulse.age += dt;
				pulse.radius += pulse.expansionSpeed * dt;

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (pulse.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
					const distance = Math.hypot(enemy.x - pulse.centerX, enemy.y - pulse.centerY);
					const ringThreshold = pulse.lineWidth / 2 + enemyRadius;

					if (Math.abs(distance - pulse.radius) > ringThreshold) {
						continue;
					}

					pulse.hitEnemyIds = [...pulse.hitEnemyIds, enemy.id];
					applyDamageToEnemy(enemyIndex, pulse.damage, 0.14, pulse.sourceWeaponInstanceId, {
						applyWeaponHitEffects: false,
						allowContextHealing: false
					});

					const updatedEnemy = enemies[enemyIndex];

					if (updatedEnemy) {
						updatedEnemy.vulnerableTimer = Math.max(
							updatedEnemy.vulnerableTimer,
							pulse.vulnerableDuration
						);
					}
				}

				if (pulse.radius >= pulse.maxRadius) {
					vulnerablePulses.splice(index, 1);
				}
			}
		};

		const updateParasiteBloomPulses = (dt: number) => {
			for (let index = parasiteBloomPulses.length - 1; index >= 0; index -= 1) {
				const pulse = parasiteBloomPulses[index];
				pulse.age += dt;
				const progress = Math.max(0, Math.min(1, pulse.age / pulse.duration));
				pulse.radius = p.lerp(12, pulse.maxRadius, easeInQuad(progress));

				if (pulse.age >= pulse.duration) {
					parasiteBloomPulses.splice(index, 1);
				}
			}
		};

		const updateOathbreakerSigils = (dt: number) => {
			for (let index = oathbreakerSigils.length - 1; index >= 0; index -= 1) {
				const sigil = oathbreakerSigils[index];
				sigil.age += dt;
				sigil.enemyIds = sigil.enemyIds.filter((enemyId) =>
					enemies.some((enemy) => enemy.id === enemyId)
				);

				if (sigil.currentRadius < sigil.radius) {
					sigil.currentRadius = Math.min(
						sigil.radius,
						sigil.currentRadius + sigil.expansionSpeed * dt
					);

					for (const enemy of enemies) {
						if (sigil.enemyIds.includes(enemy.id)) {
							continue;
						}

						const enemyAngle = Math.atan2(enemy.y - centerY, enemy.x - centerX);

						if (Math.abs(normalizeAngleDelta(sigil.angle, enemyAngle)) > sigil.halfArcRadians) {
							continue;
						}

						const distance = Math.hypot(enemy.x - centerX, enemy.y - centerY);
						const ringThreshold = sigil.lineWidth / 2 + ENEMY_VISUALS[enemy.kind].radius;

						if (Math.abs(distance - sigil.currentRadius) > ringThreshold) {
							continue;
						}

						sigil.enemyIds = [...sigil.enemyIds, enemy.id];
					}
				}

				if (sigil.age >= sigil.sweepDuration + sigil.duration) {
					oathbreakerSigils.splice(index, 1);
				}
			}
		};

		const updateMirrorArrays = (dt: number) => {
			for (let index = mirrorArrays.length - 1; index >= 0; index -= 1) {
				const mirror = mirrorArrays[index];
				mirror.age += dt;

				if (mirror.currentRadius < mirror.radius) {
					mirror.currentRadius = Math.min(
						mirror.radius,
						mirror.currentRadius + mirror.expansionSpeed * dt
					);
				}

				if (mirror.age >= mirror.sweepDuration + mirror.duration) {
					mirrorArrays.splice(index, 1);
				}
			}
		};

		const updatePrismPrisons = (dt: number) => {
			for (let index = prismPrisons.length - 1; index >= 0; index -= 1) {
				const prison = prismPrisons[index];
				prison.age += dt;

				if (prison.triggered) {
					prison.activeAge += dt;
				}

				for (const [key, value] of prison.edgeHitCooldowns.entries()) {
					const nextValue = value - dt;

					if (nextValue <= 0) {
						prison.edgeHitCooldowns.delete(key);
					} else {
						prison.edgeHitCooldowns.set(key, nextValue);
					}
				}

				const points = getRegularPolygonPoints(
					prison.centerX,
					prison.centerY,
					prison.radius,
					prison.sides,
					prison.rotation
				);

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (isEnemyCapturedByVoidTendril(enemy.id)) {
						continue;
					}

					const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
					const distanceToCenter = Math.hypot(enemy.x - prison.centerX, enemy.y - prison.centerY);

					if (distanceToCenter > prison.radius + enemyRadius + prison.lineWidth) {
						continue;
					}

					for (let edgeIndex = 0; edgeIndex < points.length; edgeIndex += 1) {
						const nextEdgeIndex = (edgeIndex + 1) % points.length;
						const start = points[edgeIndex];
						const end = points[nextEdgeIndex];
						const cooldownKey = `${enemy.id}:${edgeIndex}`;

						if ((prison.edgeHitCooldowns.get(cooldownKey) ?? 0) > 0) {
							continue;
						}

						const distanceToEdge = getDistanceToSegment(
							enemy.x,
							enemy.y,
							start.x,
							start.y,
							end.x,
							end.y
						);

						if (distanceToEdge > enemyRadius + prison.lineWidth * 0.5) {
							continue;
						}

						if (!prison.triggered) {
							prison.triggered = true;
							prison.activeAge = 0;
						}

						prison.edgeHitCooldowns.set(cooldownKey, prison.edgeHitCooldown);
						applyDamageToEnemy(enemyIndex, prison.damage, 0.09, prison.sourceWeaponInstanceId, {
							allowOathbreakerShare: true
						});
						break;
					}
				}

				if (prison.triggered && prison.activeAge >= prison.activeDuration) {
					prismPrisons.splice(index, 1);
				}
			}
		};

		const updateStasisFields = (dt: number) => {
			for (let index = stasisFields.length - 1; index >= 0; index -= 1) {
				const field = stasisFields[index];
				field.age += dt;
				field.radius = Math.min(field.maxRadius, field.radius + field.expansionSpeed * dt);

				if (field.age >= field.duration) {
					stasisFields.splice(index, 1);
				}
			}
		};

		const updateSupportPylons = (dt: number) => {
			for (let index = supportPylons.length - 1; index >= 0; index -= 1) {
				const pylon = supportPylons[index];
				pylon.age += dt;

				if (pylon.age >= pylon.duration) {
					supportPylons.splice(index, 1);
				}
			}
		};

		const updateLaserRods = (dt: number) => {
			const previousAgeByInstanceId = new Map(
				laserRods.map((rod) => [rod.sourceWeaponInstanceId, rod.age])
			);

			laserRods = equippedWeapons
				.filter((weapon) => weapon.definition.attack.special?.type === 'laser-rod-network')
				.map((weapon) => {
					const special = weapon.definition.attack.special;

					if (!special || special.type !== 'laser-rod-network') {
						return null;
					}

					const target = getLaserRodPlacementPoint(weapon.targeting);

					if (!target) {
						return null;
					}

					return {
						sourceWeaponInstanceId: weapon.instanceId,
						definitionId: weapon.definition.id,
						variant: special.variant,
						centerX: target.x,
						centerY: target.y,
						rodAngle: 0,
						rodLength: special.rodLength,
						lineWidth: special.lineWidth,
						color: weapon.definition.projectileVisual.color,
						glow: weapon.definition.projectileVisual.glow ?? false,
						age: (previousAgeByInstanceId.get(weapon.instanceId) ?? 0) + dt,
						duration: Number.POSITIVE_INFINITY,
						chillPerSecond: special.chillPerSecond ?? 0,
						freezeDuration: special.freezeDuration ?? 0,
						fireDamageMultiplier: special.fireDamageMultiplier ?? 1,
						fireDebuffDuration: special.fireDebuffDuration ?? 0,
						vulnerableDuration: special.vulnerableDuration ?? 0,
						targeting: weapon.targeting
					} satisfies LaserRodState;
				})
				.filter((rod): rod is LaserRodState => rod !== null);

			if (laserRods.length < 2) {
				return;
			}

			for (let leftIndex = 0; leftIndex < laserRods.length - 1; leftIndex += 1) {
				const leftRod = laserRods[leftIndex];

				for (let rightIndex = leftIndex + 1; rightIndex < laserRods.length; rightIndex += 1) {
					const rightRod = laserRods[rightIndex];

					if (leftRod.definitionId !== rightRod.definitionId) {
						continue;
					}

					const lineWidth = Math.max(leftRod.lineWidth, rightRod.lineWidth);
					const chillPerSecond = Math.max(leftRod.chillPerSecond, rightRod.chillPerSecond);
					const freezeDuration = Math.max(leftRod.freezeDuration, rightRod.freezeDuration);
					const fireDamageMultiplier = Math.max(
						leftRod.fireDamageMultiplier,
						rightRod.fireDamageMultiplier
					);
					const fireDebuffDuration = Math.max(
						leftRod.fireDebuffDuration,
						rightRod.fireDebuffDuration
					);
					const vulnerableDuration = Math.max(
						leftRod.vulnerableDuration,
						rightRod.vulnerableDuration
					);

					for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
						const enemy = enemies[enemyIndex];
						const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
						const distanceToSegment = getDistanceToSegment(
							enemy.x,
							enemy.y,
							leftRod.centerX,
							leftRod.centerY,
							rightRod.centerX,
							rightRod.centerY
						);

						if (distanceToSegment > lineWidth / 2 + enemyRadius) {
							continue;
						}

						const updatedEnemy = enemies[enemyIndex];

						if (!updatedEnemy) {
							continue;
						}

						if (chillPerSecond > 0) {
							applyChillToEnemy(updatedEnemy, chillPerSecond * dt, freezeDuration);
						}

						if (fireDamageMultiplier > 1 && fireDebuffDuration > 0) {
							updatedEnemy.fireExposedTimer = Math.max(
								updatedEnemy.fireExposedTimer,
								fireDebuffDuration
							);
						}

						if (vulnerableDuration > 0) {
							updatedEnemy.vulnerableTimer = Math.max(
								updatedEnemy.vulnerableTimer,
								vulnerableDuration
							);
						}
					}
				}
			}
		};

		const updateVoidTunnels = (dt: number) => {
			for (let index = voidTunnels.length - 1; index >= 0; index -= 1) {
				const tunnel = voidTunnels[index];
				tunnel.age += dt;

				if (tunnel.age >= tunnel.duration) {
					voidTunnels.splice(index, 1);
				}
			}
		};

		const updateVoidRifts = (dt: number) => {
			for (let index = voidRifts.length - 1; index >= 0; index -= 1) {
				const rift = voidRifts[index];
				rift.age += dt;

				if (!rift.hasCollapsed) {
					rift.tickTimer -= dt;

					while (rift.tickTimer <= 0 && rift.age <= rift.activeDuration) {
						rift.tickTimer += rift.tickInterval;

						const axisX = Math.cos(rift.angle);
						const axisY = Math.sin(rift.angle);
						const perpendicularX = -axisY;
						const perpendicularY = axisX;
						const targets = enemies
							.map((enemy, enemyIndex) => {
								const offsetX = enemy.x - rift.centerX;
								const offsetY = enemy.y - rift.centerY;
								const localX = offsetX * axisX + offsetY * axisY;
								const localY = offsetX * perpendicularX + offsetY * perpendicularY;
								const normalizedDistance =
									(localX * localX) / Math.max(1, rift.halfWidth * rift.halfWidth) +
									(localY * localY) / Math.max(1, rift.halfHeight * rift.halfHeight);

								return {
									enemyIndex,
									normalizedDistance,
									seamOffset: Math.abs(localY)
								};
							})
							.filter(({ normalizedDistance }) => normalizedDistance <= 1)
							.sort(
								(left, right) =>
									left.seamOffset - right.seamOffset ||
									left.normalizedDistance - right.normalizedDistance
							)
							.slice(0, rift.maxTargets);

						for (const target of targets) {
							const damageResult = applyDamageToEnemy(
								target.enemyIndex,
								rift.damagePerTick,
								0.05,
								rift.sourceWeaponInstanceId
							);
							rift.accumulatedDamage += damageResult.actualDamage;
						}
					}

					if (rift.age >= rift.activeDuration) {
						rift.hasCollapsed = true;
						rift.finalPulseDamage =
							rift.finalPulseBaseDamage + rift.accumulatedDamage * rift.finalPulseDamageRatio;

						for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
							const enemy = enemies[enemyIndex];
							const distance = Math.hypot(enemy.x - rift.centerX, enemy.y - rift.centerY);

							if (distance > rift.finalPulseRadius + ENEMY_VISUALS[enemy.kind].radius) {
								continue;
							}

							applyDamageToEnemy(
								enemyIndex,
								rift.finalPulseDamage,
								0.08,
								rift.sourceWeaponInstanceId
							);
						}

						pixlFlash = Math.max(pixlFlash, 0.18);
					}
					continue;
				}

				rift.collapseAge += dt;

				if (rift.collapseAge >= rift.collapseDuration) {
					voidRifts.splice(index, 1);
				}
			}
		};

		const updatePhaseshifts = (dt: number) => {
			for (let index = phaseshifts.length - 1; index >= 0; index -= 1) {
				const phaseshift = phaseshifts[index];
				phaseshift.age += dt;

				if (phaseshift.age >= phaseshift.duration) {
					phaseshifts.splice(index, 1);
				}
			}
		};

		const updateBurningGrounds = (dt: number) => {
			for (let index = runeCasts.length - 1; index >= 0; index -= 1) {
				const runeCast = runeCasts[index];
				runeCast.age += dt;

				if (runeCast.age >= runeCast.duration) {
					runeCasts.splice(index, 1);
				}
			}

			for (let index = sunRunes.length - 1; index >= 0; index -= 1) {
				const sunRune = sunRunes[index];
				const previousAge = sunRune.age;
				sunRune.age += dt;
				const previousProgress = Math.min(1, previousAge / Math.max(0.0001, sunRune.duration));
				const currentProgress = Math.min(1, sunRune.age / Math.max(0.0001, sunRune.duration));
				const previousWaveRadius = sunRune.radius * (1 - Math.pow(1 - previousProgress, 2.4));
				const currentWaveRadius = sunRune.radius * (1 - Math.pow(1 - currentProgress, 2.4));
				const bandMin = Math.max(
					0,
					Math.min(previousWaveRadius, currentWaveRadius) - sunRune.waveThickness
				);
				const bandMax = Math.max(previousWaveRadius, currentWaveRadius) + sunRune.waveThickness;

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (sunRune.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
					const distance = Math.hypot(enemy.x - sunRune.centerX, enemy.y - sunRune.centerY);

					if (distance + enemyRadius < bandMin || distance - enemyRadius > bandMax) {
						continue;
					}

					sunRune.hitEnemyIds.push(enemy.id);
					applyDamageToEnemy(
						enemyIndex,
						sunRune.damagePerPulse,
						0.05,
						sunRune.sourceWeaponInstanceId
					);
				}

				if (sunRune.age >= sunRune.duration) {
					sunRunes.splice(index, 1);
				}
			}

			for (let index = healingRunes.length - 1; index >= 0; index -= 1) {
				const healingRune = healingRunes[index];
				healingRune.age += dt;

				if (healingRune.age >= healingRune.duration) {
					healingRunes.splice(index, 1);
				}
			}

			for (let index = slowingRunes.length - 1; index >= 0; index -= 1) {
				const slowingRune = slowingRunes[index];
				const previousAge = slowingRune.age;
				slowingRune.age += dt;
				const previousProgress = Math.min(1, previousAge / Math.max(0.0001, slowingRune.duration));
				const currentProgress = Math.min(
					1,
					slowingRune.age / Math.max(0.0001, slowingRune.duration)
				);
				const previousWaveRadius = slowingRune.radius * (1 - Math.pow(1 - previousProgress, 2.2));
				const currentWaveRadius = slowingRune.radius * (1 - Math.pow(1 - currentProgress, 2.2));
				const bandMin = Math.max(
					0,
					Math.min(previousWaveRadius, currentWaveRadius) - slowingRune.waveThickness
				);
				const bandMax = Math.max(previousWaveRadius, currentWaveRadius) + slowingRune.waveThickness;

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (slowingRune.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
					const distance = Math.hypot(enemy.x - slowingRune.centerX, enemy.y - slowingRune.centerY);

					if (distance + enemyRadius < bandMin || distance - enemyRadius > bandMax) {
						continue;
					}

					slowingRune.hitEnemyIds.push(enemy.id);
					enemy.slowTimer = Math.max(enemy.slowTimer, slowingRune.slowDuration);
					enemy.slowMultiplier = Math.min(enemy.slowMultiplier, slowingRune.slowMultiplier);
				}

				if (slowingRune.age >= slowingRune.duration) {
					slowingRunes.splice(index, 1);
				}
			}

			for (let index = bindingRunes.length - 1; index >= 0; index -= 1) {
				const bindingRune = bindingRunes[index];
				const previousAge = bindingRune.age;
				bindingRune.age += dt;
				const previousProgress = Math.min(1, previousAge / Math.max(0.0001, bindingRune.duration));
				const currentProgress = Math.min(
					1,
					bindingRune.age / Math.max(0.0001, bindingRune.duration)
				);
				const previousWaveRadius = bindingRune.radius * (1 - Math.pow(1 - previousProgress, 2.2));
				const currentWaveRadius = bindingRune.radius * (1 - Math.pow(1 - currentProgress, 2.2));
				const bandMin = Math.max(
					0,
					Math.min(previousWaveRadius, currentWaveRadius) - bindingRune.waveThickness
				);
				const bandMax = Math.max(previousWaveRadius, currentWaveRadius) + bindingRune.waveThickness;

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (bindingRune.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
					const distance = Math.hypot(enemy.x - bindingRune.centerX, enemy.y - bindingRune.centerY);

					if (distance + enemyRadius < bandMin || distance - enemyRadius > bandMax) {
						continue;
					}

					bindingRune.hitEnemyIds.push(enemy.id);
					enemy.bindingRuneHitCount = Math.max(enemy.bindingRuneHitCount, 1);
					enemy.bindingRuneDamageMultiplierPerHit = Math.max(
						enemy.bindingRuneDamageMultiplierPerHit,
						bindingRune.damageMultiplierPerHit
					);
					enemy.bindingRuneSourceWeaponInstanceId = bindingRune.sourceWeaponInstanceId;
				}

				if (bindingRune.age >= bindingRune.duration) {
					bindingRunes.splice(index, 1);
				}
			}

			for (let index = sunbrandRunes.length - 1; index >= 0; index -= 1) {
				const rune = sunbrandRunes[index];
				const previousAge = rune.age;
				rune.age += dt;
				const previousProgress = Math.min(1, previousAge / Math.max(0.0001, rune.duration));
				const currentProgress = Math.min(1, rune.age / Math.max(0.0001, rune.duration));
				const previousWaveRadius = rune.radius * (1 - Math.pow(1 - previousProgress, 2.3));
				const currentWaveRadius = rune.radius * (1 - Math.pow(1 - currentProgress, 2.3));
				const bandMin = Math.max(
					0,
					Math.min(previousWaveRadius, currentWaveRadius) - rune.waveThickness
				);
				const bandMax = Math.max(previousWaveRadius, currentWaveRadius) + rune.waveThickness;

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (rune.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
					const distance = Math.hypot(enemy.x - rune.centerX, enemy.y - rune.centerY);

					if (distance + enemyRadius < bandMin || distance - enemyRadius > bandMax) {
						continue;
					}

					rune.hitEnemyIds.push(enemy.id);
					enemy.sunbrandTimer = Math.max(enemy.sunbrandTimer, rune.brandDuration);
					enemy.sunbrandBaseDamage = Math.max(enemy.sunbrandBaseDamage, rune.burstBaseDamage);
					enemy.sunbrandTriggerDamageMultiplier = Math.max(
						enemy.sunbrandTriggerDamageMultiplier,
						rune.triggerDamageMultiplier
					);
					enemy.sunbrandSourceWeaponInstanceId = rune.sourceWeaponInstanceId;
				}

				if (rune.age >= rune.duration) {
					sunbrandRunes.splice(index, 1);
				}
			}

			for (let index = pendingRuneEchoes.length - 1; index >= 0; index -= 1) {
				const pendingEcho = pendingRuneEchoes[index];
				pendingEcho.delay -= dt;

				if (pendingEcho.delay > 0) {
					continue;
				}

				if (pendingEcho.runeType === 'sun-rune') {
					spawnSunRune(
						pendingEcho.weapon,
						pendingEcho.sourceWeaponInstanceId,
						null,
						pendingEcho.efficiencyMultiplier,
						false
					);
				} else if (pendingEcho.runeType === 'healing-rune') {
					spawnHealingRune(
						pendingEcho.weapon,
						pendingEcho.sourceWeaponInstanceId,
						null,
						pendingEcho.efficiencyMultiplier,
						false
					);
				} else if (pendingEcho.runeType === 'slowing-rune') {
					spawnSlowingRune(
						pendingEcho.weapon,
						pendingEcho.sourceWeaponInstanceId,
						null,
						pendingEcho.efficiencyMultiplier,
						false
					);
				} else if (pendingEcho.runeType === 'binding-rune') {
					spawnBindingRune(
						pendingEcho.weapon,
						pendingEcho.sourceWeaponInstanceId,
						null,
						pendingEcho.efficiencyMultiplier,
						false
					);
				} else if (pendingEcho.runeType === 'ascendance-rune') {
					spawnAscendanceRune(pendingEcho.weapon, pendingEcho.sourceWeaponInstanceId);
				} else {
					spawnSunbrandRune(
						pendingEcho.weapon,
						pendingEcho.sourceWeaponInstanceId,
						null,
						pendingEcho.efficiencyMultiplier,
						false
					);
				}

				pendingRuneEchoes.splice(index, 1);
			}

			for (let index = burningGrounds.length - 1; index >= 0; index -= 1) {
				const ground = burningGrounds[index];
				ground.age += dt;
				ground.tickTimer -= dt;

				while (ground.tickTimer <= 0 && ground.age <= ground.duration) {
					ground.tickTimer += ground.tickInterval;

					for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
						const enemy = enemies[enemyIndex];
						const distance = Math.hypot(enemy.x - ground.centerX, enemy.y - ground.centerY);

						if (distance > ground.radius + ENEMY_VISUALS[enemy.kind].radius) {
							continue;
						}

						applyDamageToEnemy(
							enemyIndex,
							ground.damagePerTick,
							0.05,
							ground.sourceWeaponInstanceId
						);
					}
				}

				if (ground.age >= ground.duration) {
					burningGrounds.splice(index, 1);
				}
			}
		};

		const updatePerimeterMines = (dt: number) => {
			for (let index = perimeterMines.length - 1; index >= 0; index -= 1) {
				const mine = perimeterMines[index];
				mine.age += dt;
				const mineCalibratorEffect = getMineCalibratorEffectAtPoint(mine.centerX, mine.centerY);
				const effectiveTriggerRadius =
					mine.triggerRadius + mineCalibratorEffect.mineTriggerRadiusBonus;

				if (!mine.hasDetonated) {
					for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
						const enemy = enemies[enemyIndex];
						const distanceToMine = Math.hypot(enemy.x - mine.centerX, enemy.y - mine.centerY);

						if (distanceToMine > effectiveTriggerRadius + ENEMY_VISUALS[enemy.kind].radius) {
							continue;
						}

						mine.hasDetonated = true;
						mine.explosionFlash = 0.24;
						const sourceWeapon = equippedWeaponByInstanceId.get(
							mine.sourceWeaponInstanceId
						)?.definition;

						if (sourceWeapon) {
							triggerPerimeterMinePayloadAtPoint({
								weapon: sourceWeapon,
								sourceWeaponInstanceId: mine.sourceWeaponInstanceId,
								centerX: mine.centerX,
								centerY: mine.centerY,
								primaryHitEnemyId: enemy.id,
								damage: mine.damage
							});
						}

						break;
					}
				}

				if (!mine.hasDetonated) {
					continue;
				}

				mine.explosionFlash = Math.max(0, mine.explosionFlash - dt);

				if (mine.explosionFlash <= 0) {
					if (sharedMinePersistenceChance > 0 && Math.random() < sharedMinePersistenceChance) {
						mine.hasDetonated = false;
						mine.explosionFlash = 0;
						mine.age = 0;
						continue;
					}

					perimeterMines.splice(index, 1);
				}
			}
		};

		const updateTurretMines = (dt: number) => {
			for (let index = turretMines.length - 1; index >= 0; index -= 1) {
				const turret = turretMines[index];
				turret.age += dt;
				turret.fireFlash = Math.max(0, turret.fireFlash - dt * 3.5);

				if (currentSweepIndex >= turret.expiresAfterSweepIndex) {
					turretMines.splice(index, 1);
					continue;
				}
			}

			for (let index = turretMineBursts.length - 1; index >= 0; index -= 1) {
				const burst = turretMineBursts[index];

				if (!turretMines.includes(burst.turret) || burst.shotsRemaining <= 0) {
					turretMineBursts.splice(index, 1);
					continue;
				}

				burst.emissionTimer -= dt;

				while (burst.emissionTimer <= 0 && burst.shotsRemaining > 0) {
					const payloadWeapon = getWeaponDefinition(burst.payloadWeaponId);
					const didFireShot = fireTurretMinePayload(burst.turret, payloadWeapon);

					burst.emissionTimer += burst.emissionInterval;

					if (!didFireShot) {
						break;
					}

					burst.shotsRemaining -= 1;
				}

				if (burst.shotsRemaining <= 0) {
					turretMineBursts.splice(index, 1);
				}
			}
		};

		const updateMineShieldTurrets = (dt: number) => {
			for (let index = mineShieldTurrets.length - 1; index >= 0; index -= 1) {
				const turret = mineShieldTurrets[index];
				turret.age += dt;
				turret.beamPulse += dt;

				if ((pixlShieldSources[turret.sourceUtilityInstanceId] ?? 0) <= 0) {
					mineShieldTurrets.splice(index, 1);
				}
			}
		};

		const updateDelayedBombs = (dt: number) => {
			for (let index = delayedBombs.length - 1; index >= 0; index -= 1) {
				const bomb = delayedBombs[index];
				bomb.age += dt;

				if (!bomb.hasDetonated && bomb.age >= bomb.detonationDelay) {
					bomb.hasDetonated = true;
					bomb.explosionFlash = 0.22;

					for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
						const enemy = enemies[enemyIndex];
						const distance = Math.hypot(enemy.x - bomb.centerX, enemy.y - bomb.centerY);

						if (distance > bomb.radius + ENEMY_VISUALS[enemy.kind].radius) {
							continue;
						}

						applyDamageToEnemy(enemyIndex, bomb.damage, 0.14, bomb.sourceWeaponInstanceId);
					}
				}

				if (bomb.hasDetonated) {
					bomb.explosionFlash = Math.max(0, bomb.explosionFlash - dt);

					if (bomb.explosionFlash <= 0) {
						delayedBombs.splice(index, 1);
					}
				}
			}
		};

		const updateHemorrhageBursts = (dt: number) => {
			for (let index = hemorrhageBursts.length - 1; index >= 0; index -= 1) {
				const burst = hemorrhageBursts[index];
				const previousProgress = Math.min(1, burst.age / Math.max(0.0001, burst.duration));
				const previousHeadX = p.lerp(burst.startX, burst.endX, previousProgress);
				const previousHeadY = p.lerp(burst.startY, burst.endY, previousProgress);
				burst.age += dt;

				if (burst.targetEnemyId !== null) {
					const target = enemies.find((enemy) => enemy.id === burst.targetEnemyId) ?? null;

					if (target) {
						burst.endX = target.x;
						burst.endY = target.y;
					}
				}

				const nextProgress = Math.min(1, burst.age / Math.max(0.0001, burst.duration));
				const nextHeadX = p.lerp(burst.startX, burst.endX, nextProgress);
				const nextHeadY = p.lerp(burst.startY, burst.endY, nextProgress);
				recordKnifeTrailSegment(previousHeadX, previousHeadY, nextHeadX, nextHeadY, burst.color);

				if (!burst.hasApplied && burst.age >= burst.duration) {
					burst.hasApplied = true;

					if (
						burst.targetEnemyId !== null &&
						burst.sourceWeaponInstanceId &&
						burst.bleedDuration > 0 &&
						burst.bleedRicochet > 0
					) {
						const targetIndex = enemies.findIndex(
							(candidate) => candidate.id === burst.targetEnemyId
						);

						if (targetIndex >= 0) {
							applyBleedToEnemy(
								targetIndex,
								burst.bleedRicochet,
								burst.bleedDuration,
								burst.sourceWeaponInstanceId,
								burst.lifeStealRatio,
								{ ricochetStep: burst.ricochetStep }
							);
						}
					}
				}

				if (burst.age >= burst.duration + 0.08) {
					hemorrhageBursts.splice(index, 1);
				}
			}
		};

		const updateKnifeTrailSegments = (dt: number) => {
			for (let index = knifeTrailSegments.length - 1; index >= 0; index -= 1) {
				const segment = knifeTrailSegments[index];
				segment.age += dt;

				if (segment.age >= segment.duration) {
					knifeTrailSegments.splice(index, 1);
				}
			}
		};

		const updateLaserSweeps = (dt: number) => {
			for (let index = laserSweeps.length - 1; index >= 0; index -= 1) {
				const sweep = laserSweeps[index];
				sweep.age += dt;
				const progress = Math.min(1, sweep.age / sweep.duration);
				sweep.angle = sweep.startAngle + p.TWO_PI * progress * progress;

				const directionX = Math.cos(sweep.angle);
				const directionY = Math.sin(sweep.angle);

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (sweep.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const offsetX = enemy.x - centerX;
					const offsetY = enemy.y - centerY;
					const alongBeam = offsetX * directionX + offsetY * directionY;

					if (alongBeam < 0 || alongBeam > sweep.beamLength) {
						continue;
					}

					const perpendicularDistance = Math.abs(offsetX * -directionY + offsetY * directionX);
					const hitWidth = sweep.beamWidth / 2 + ENEMY_VISUALS[enemy.kind].radius;

					if (perpendicularDistance > hitWidth) {
						continue;
					}

					sweep.hitEnemyIds = [...sweep.hitEnemyIds, enemy.id];
					applyDamageToEnemy(enemyIndex, sweep.damage, 0.1, sweep.sourceWeaponInstanceId);
				}

				if (sweep.age >= sweep.duration) {
					laserSweeps.splice(index, 1);
				}
			}
		};

		const updateJudgmentRunes = (dt: number) => {
			for (let index = judgmentRunes.length - 1; index >= 0; index -= 1) {
				const judgment = judgmentRunes[index];
				judgment.age += dt;
				judgment.orbitAngle += judgment.orbitAngularSpeed * dt;

				while (
					currentSweepIndex >= judgment.nextDamageGrowthSweepIndex &&
					judgment.baseDamagePerTick < judgment.maxBaseDamagePerTick
				) {
					judgment.baseDamagePerTick = Math.min(
						judgment.maxBaseDamagePerTick,
						judgment.baseDamagePerTick + judgment.damageGrowthPerCycle
					);
					judgment.damagePerTick = judgment.baseDamagePerTick * judgment.damageMultiplier;
					judgment.nextDamageGrowthSweepIndex += 1;
				}

				judgment.tickTimer -= dt;

				while (judgment.tickTimer <= 0) {
					judgment.tickTimer += judgment.tickInterval;
					const sunX = centerX + Math.cos(judgment.orbitAngle) * judgment.orbitRadius;
					const sunY = centerY + Math.sin(judgment.orbitAngle) * judgment.orbitRadius;

					for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
						const enemy = enemies[enemyIndex];
						const distance = Math.hypot(enemy.x - sunX, enemy.y - sunY);

						if (distance > judgment.damageRadius + ENEMY_VISUALS[enemy.kind].radius) {
							continue;
						}

						applyDamageToEnemy(
							enemyIndex,
							judgment.damagePerTick,
							0.08,
							judgment.sourceWeaponInstanceId
						);
					}
				}

				if (judgment.age >= judgment.duration) {
					judgmentRunes.splice(index, 1);
				}
			}
		};

		const fireEnemyProjectile = (enemy: EnemyState, stats: GlitchStats) => {
			const dx = centerX - enemy.x;
			const dy = centerY - enemy.y;
			const distance = Math.hypot(dx, dy) || 1;
			const speed = stats.projectileSpeed ?? 210;
			const directionX = dx / distance;
			const directionY = dy / distance;

			enemyProjectiles.push({
				x: enemy.x + directionX * (ENEMY_VISUALS[enemy.kind].radius + 2),
				y: enemy.y + directionY * (ENEMY_VISUALS[enemy.kind].radius + 2),
				vx: directionX * speed,
				vy: directionY * speed,
				damage: Math.max(
					1,
					Math.round(
						(stats.projectileDamage ?? stats.contactDamage) * enemy.damageMultiplier +
							enemy.damageBonus
					)
				),
				color: stats.projectileColor ?? '#a6f0ff',
				size: stats.projectileSize ?? 7,
				age: 0,
				maxAge: 3.2
			});
		};

		const startEnemyBeam = (enemy: EnemyState, stats: GlitchStats) => {
			const beamDuration = stats.beamDuration ?? 0;
			const tickInterval = stats.beamTickInterval ?? 0;
			const beamDamage = stats.beamDamage ?? 0;

			if (beamDuration <= 0 || tickInterval <= 0 || beamDamage <= 0) {
				return;
			}

			enemyBeams = enemyBeams.filter((beam) => beam.sourceEnemyId !== enemy.id);
			enemyBeams.push({
				sourceEnemyId: enemy.id,
				age: 0,
				duration: beamDuration,
				tickInterval,
				tickTimer: 0,
				damage: beamDamage,
				width: stats.beamWidth ?? 20,
				color: stats.beamColor ?? '#ffd36b',
				glow: true
			});
		};

		const updateEnemies = (dt: number) => {
			ensureMarkedEnemy();
			const mineGravityAugmentEffect = getActiveMineGravityAugmentEffect();

			for (let index = enemies.length - 1; index >= 0; index -= 1) {
				if (updateBleedOnEnemy(index, dt)) {
					continue;
				}

				const enemy = enemies[index];
				const stats = getEnemyStats(enemy.kind);
				const contactRange = getEnemyContactRange(enemy.kind);
				const isSiege = stats.attackPattern === 'siege';
				const isHybrid = stats.attackPattern === 'hybrid';
				const isBeam = stats.attackPattern === 'beam';
				const prefersRangeControl = isSiege || isBeam;
				enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
				enemy.confusionTimer = Math.max(0, enemy.confusionTimer - dt);
				enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
				if (enemy.slowTimer <= 0) {
					enemy.slowMultiplier = 1;
				}
				enemy.sunbrandTimer = Math.max(0, enemy.sunbrandTimer - dt);
				if (enemy.sunbrandTimer <= 0) {
					enemy.sunbrandBaseDamage = 0;
					enemy.sunbrandTriggerDamageMultiplier = 0;
					enemy.sunbrandSourceWeaponInstanceId = null;
				}
				enemy.voidTouchedTimer = Math.max(0, enemy.voidTouchedTimer - dt);
				enemy.fireExposedTimer = Math.max(0, enemy.fireExposedTimer - dt);
				enemy.lifeStealMarkTimer = Math.max(0, enemy.lifeStealMarkTimer - dt);
				if (enemy.lifeStealMarkTimer <= 0) {
					enemy.lifeStealMarkRatio = 0;
				}
				enemy.parasiteBloomTimer = Math.max(0, enemy.parasiteBloomTimer - dt);
				if (enemy.parasiteBloomTimer <= 0) {
					enemy.parasiteBloomDuration = 0;
					enemy.parasiteBloomHealRatio = 0;
					enemy.parasiteBloomPulseRadius = 0;
					enemy.parasiteBloomColor = null;
				}
				enemy.vulnerableTimer = Math.max(0, enemy.vulnerableTimer - dt);
				enemy.frozenTimer = Math.max(0, enemy.frozenTimer - dt);
				if (enemy.frozenTimer <= 0 && enemy.chillAmount >= 1) {
					enemy.chillAmount = 0;
				}
				enemy.supportShieldTimer = Math.max(0, enemy.supportShieldTimer - dt);

				if (enemy.supportShieldTimer <= 0) {
					enemy.supportShieldPool = 0;
				}

				enemy.shieldPulseTimer = Math.max(0, enemy.shieldPulseTimer - dt);
				enemy.shieldPulseCooldown = Math.max(0, enemy.shieldPulseCooldown - dt);

				if (isBeam && enemyBeams.some((beam) => beam.sourceEnemyId === enemy.id)) {
					continue;
				}

				if (isEnemyCapturedByVoidTendril(enemy.id)) {
					continue;
				}

				for (const phaseshift of phaseshifts) {
					const insideLane =
						Math.abs(enemy.y - phaseshift.centerY) <= phaseshift.halfHeight &&
						Math.abs(enemy.x - phaseshift.centerX) <= phaseshift.zoneWidth * 0.5;
					const isOnRightSide = enemy.x >= centerX;
					const isApproachingCenter = enemy.x > phaseshift.centerX;

					if (
						!insideLane ||
						!isOnRightSide ||
						!isApproachingCenter ||
						phaseshift.teleportedEnemyIds.includes(enemy.id)
					) {
						continue;
					}

					const angle = Math.atan2(enemy.y - centerY, enemy.x - centerX);
					enemy.x = centerX + Math.cos(angle) * (FIXED_SPAWN_RADIUS + phaseshift.teleportOffset);
					enemy.y = centerY + Math.sin(angle) * (FIXED_SPAWN_RADIUS + phaseshift.teleportOffset);
					enemy.confusionTimer = Math.max(enemy.confusionTimer, phaseshift.slowDuration);
					phaseshift.teleportedEnemyIds = [...phaseshift.teleportedEnemyIds, enemy.id];
				}

				let immobilized = false;
				for (const field of stasisFields) {
					const distanceToField = Math.hypot(enemy.x - field.centerX, enemy.y - field.centerY);

					if (distanceToField <= field.radius + ENEMY_VISUALS[enemy.kind].radius) {
						immobilized = true;
						break;
					}
				}

				if (enemy.frozenTimer > 0) {
					immobilized = true;
				}

				for (const tunnel of voidTunnels) {
					const insideTunnel =
						Math.abs(enemy.x - tunnel.centerX) <= tunnel.halfWidth &&
						Math.abs(enemy.y - tunnel.centerY) <= tunnel.halfHeight;

					if (!insideTunnel) {
						continue;
					}

					const activationDelay = tunnel.variant === 'void-tunnel' ? tunnel.duration * 0.32 : 0;

					if (tunnel.age < activationDelay) {
						continue;
					}

					if (tunnel.variant === 'void-tunnel') {
						const isClaimedByTunnel = tunnel.claimedEnemyIds.includes(enemy.id);
						const wasAlreadyVoidTouched = enemy.voidTouchedTimer > 0;

						if (wasAlreadyVoidTouched && !isClaimedByTunnel) {
							continue;
						}

						if (!isClaimedByTunnel) {
							tunnel.claimedEnemyIds = [...tunnel.claimedEnemyIds, enemy.id];
						}

						enemy.voidTouchedTimer = Math.max(enemy.voidTouchedTimer, tunnel.debuffDuration);
						enemy.confusionTimer = Math.max(enemy.confusionTimer, 0.5);
						const sideOffset = tunnel.halfWidth * 0.6;
						const targetX =
							enemy.x <= tunnel.centerX ? tunnel.centerX - sideOffset : tunnel.centerX + sideOffset;
						const targetY = tunnel.centerY;
						const deltaX = targetX - enemy.x;
						const deltaY = targetY - enemy.y;
						const pullStepX = Math.min(Math.abs(deltaX), tunnel.pullStrength * dt);
						const pullStepY = Math.min(Math.abs(deltaY), tunnel.pullStrength * 0.8 * dt);
						enemy.x += Math.sign(deltaX || 1) * pullStepX;
						enemy.y += Math.sign(deltaY || 1) * pullStepY;
						continue;
					}

					const isClaimedByTunnel = tunnel.claimedEnemyIds.includes(enemy.id);
					const wasAlreadyVoidTouched = enemy.voidTouchedTimer > 0;

					if (wasAlreadyVoidTouched && !isClaimedByTunnel) {
						continue;
					}

					if (!isClaimedByTunnel) {
						tunnel.claimedEnemyIds = [...tunnel.claimedEnemyIds, enemy.id];
					}

					enemy.voidTouchedTimer = Math.max(enemy.voidTouchedTimer, tunnel.debuffDuration);
					enemy.confusionTimer = Math.max(enemy.confusionTimer, 0.5);
					const deltaX = tunnel.centerX - enemy.x;
					const deltaY = tunnel.centerY - enemy.y;
					const pullStepX = Math.min(Math.abs(deltaX), tunnel.pullStrength * dt);
					const pullStepY = Math.min(Math.abs(deltaY), tunnel.pullStrength * dt);
					enemy.x += Math.sign(deltaX || 1) * pullStepX;
					enemy.y += Math.sign(deltaY || 1) * pullStepY;
				}

				for (const rift of voidRifts) {
					if (rift.hasCollapsed) {
						continue;
					}

					const axisX = Math.cos(rift.angle);
					const axisY = Math.sin(rift.angle);
					const perpendicularX = -axisY;
					const perpendicularY = axisX;
					const offsetX = enemy.x - rift.centerX;
					const offsetY = enemy.y - rift.centerY;
					const localX = offsetX * axisX + offsetY * axisY;
					const localY = offsetX * perpendicularX + offsetY * perpendicularY;
					const normalizedDistance =
						(localX * localX) / Math.max(1, rift.halfWidth * rift.halfWidth) +
						(localY * localY) / Math.max(1, rift.halfHeight * rift.halfHeight);

					if (normalizedDistance > 1.18) {
						continue;
					}

					const alongDelta = -localX * 0.22;
					const seamDelta = -localY;
					const worldPullX = axisX * alongDelta + perpendicularX * seamDelta;
					const worldPullY = axisY * alongDelta + perpendicularY * seamDelta;
					const pullDistance = Math.hypot(worldPullX, worldPullY);

					if (pullDistance <= 0.001) {
						continue;
					}

					const pullFalloff = 1 - Math.min(1, normalizedDistance);
					const pullStep = rift.pullStrength * (0.45 + pullFalloff * 0.55) * dt;
					enemy.x += (worldPullX / pullDistance) * pullStep;
					enemy.y += (worldPullY / pullDistance) * pullStep;
				}

				const coldLattice = getDominantColdLatticeAtPoint(
					enemy.x,
					enemy.y,
					ENEMY_VISUALS[enemy.kind].radius
				);

				if (coldLattice) {
					applyChillToEnemy(enemy, coldLattice.chillPerSecond * dt, coldLattice.freezeDuration);

					const deltaX = coldLattice.centerX - enemy.x;
					const deltaY = coldLattice.centerY - enemy.y;
					const latticeDistance = Math.hypot(deltaX, deltaY);

					if (latticeDistance > 0.001) {
						const pullFalloff = 1 - Math.min(1, latticeDistance / coldLattice.radius);
						const pullStep = coldLattice.pullStrength * (0.35 + pullFalloff * 0.65) * dt;
						enemy.x += (deltaX / latticeDistance) * pullStep;
						enemy.y += (deltaY / latticeDistance) * pullStep;
					}
				}

				const confusionMultiplier = enemy.confusionTimer > 0 ? 0.67 : 1;
				const chillMultiplier = enemy.frozenTimer > 0 ? 0 : 1 - enemy.chillAmount;
				const oathbreakerSlowMultiplier = getOathbreakerSlowMultiplier(enemy.id);
				const runeSlowMultiplier = enemy.slowTimer > 0 ? enemy.slowMultiplier : 1;
				const moveSpeedMultiplier =
					confusionMultiplier * chillMultiplier * oathbreakerSlowMultiplier * runeSlowMultiplier;
				const effectiveMoveSpeed =
					stats.moveSpeed * moveSpeedMultiplier * enemy.moveSpeedMultiplier;

				if (immobilized) {
					continue;
				}

				if (hasActiveVanishRune()) {
					const retreatDistance = Math.hypot(enemy.x - centerX, enemy.y - centerY) || 1;
					const retreatStep = Math.max(10, effectiveMoveSpeed * 0.35) * dt;
					enemy.x += ((enemy.x - centerX) / retreatDistance) * retreatStep;
					enemy.y += ((enemy.y - centerY) / retreatDistance) * retreatStep;
					continue;
				}

				if (mineGravityAugmentEffect) {
					let closestMine: PerimeterMineState | null = null;
					let closestMineDistance = Number.POSITIVE_INFINITY;

					for (const mine of perimeterMines) {
						if (mine.hasDetonated) {
							continue;
						}

						const distanceToMine = Math.hypot(enemy.x - mine.centerX, enemy.y - mine.centerY);
						const pullReach =
							mineGravityAugmentEffect.pullRadius + ENEMY_VISUALS[enemy.kind].radius;

						if (distanceToMine > pullReach || distanceToMine >= closestMineDistance) {
							continue;
						}

						closestMine = mine;
						closestMineDistance = distanceToMine;
					}

					if (closestMine && closestMineDistance > 0.001) {
						const pullVectorX = closestMine.centerX - enemy.x;
						const pullVectorY = closestMine.centerY - enemy.y;
						const pullFalloff =
							1 -
							Math.min(
								1,
								closestMineDistance /
									(mineGravityAugmentEffect.pullRadius + ENEMY_VISUALS[enemy.kind].radius)
							);
						const pullStep = Math.min(
							Math.max(0, closestMineDistance - closestMine.triggerRadius * 0.35),
							mineGravityAugmentEffect.pullStrength * (0.85 + pullFalloff * 0.75) * dt
						);

						enemy.x += (pullVectorX / closestMineDistance) * pullStep;
						enemy.y += (pullVectorY / closestMineDistance) * pullStep;
					}
				}

				let movementTargetX = centerX;
				let movementTargetY = centerY;
				let desiredRange = Math.max(contactRange + 20, enemy.holdRadius);

				if (mineGravityAugmentEffect) {
					let closestMine: PerimeterMineState | null = null;
					let closestMineDistance = Number.POSITIVE_INFINITY;

					for (const mine of perimeterMines) {
						if (mine.hasDetonated) {
							continue;
						}

						const distanceToMine = Math.hypot(enemy.x - mine.centerX, enemy.y - mine.centerY);
						const pullReach =
							mineGravityAugmentEffect.pullRadius + ENEMY_VISUALS[enemy.kind].radius;

						if (distanceToMine > pullReach || distanceToMine >= closestMineDistance) {
							continue;
						}

						closestMine = mine;
						closestMineDistance = distanceToMine;
					}

					if (closestMine && closestMineDistance > closestMine.triggerRadius * 0.25) {
						movementTargetX = closestMine.centerX;
						movementTargetY = closestMine.centerY;
						desiredRange = Math.max(0, closestMine.triggerRadius * 0.18);
					}
				}

				const dx = movementTargetX - enemy.x;
				const dy = movementTargetY - enemy.y;
				const distance = Math.hypot(dx, dy) || 1;

				if (prefersRangeControl) {
					const distanceDelta = distance - desiredRange;

					if (Math.abs(distanceDelta) > 10) {
						const step = Math.min(Math.abs(distanceDelta), effectiveMoveSpeed * dt);
						const direction = distanceDelta > 0 ? 1 : -1;
						enemy.x += (dx / distance) * step * direction;
						enemy.y += (dy / distance) * step * direction;
					} else {
						const tangentX = -dy / distance;
						const tangentY = dx / distance;
						const orbitStep =
							(stats.orbitSpeed ?? 24) * moveSpeedMultiplier * dt * enemy.orbitDirection;
						enemy.x += tangentX * orbitStep;
						enemy.y += tangentY * orbitStep;
					}
				} else if (distance > contactRange) {
					const step = Math.min(distance - contactRange, effectiveMoveSpeed * dt);
					enemy.x += (dx / distance) * step;
					enemy.y += (dy / distance) * step;
					const blockingStoneWard = clampEnemyOutsideStoneWard(enemy);

					if (!isHybrid && !blockingStoneWard) {
						continue;
					}
				}

				const blockingStoneWard = clampEnemyOutsideStoneWard(enemy);

				enemy.attackTimer -= dt;

				while (enemy.attackTimer <= 0) {
					enemy.attackTimer += 1 / stats.attackSpeed;

					if (stats.supportPattern === 'shield-nearest-non-bulwark') {
						const target = getClosestShieldableEnemy();

						if (target && target.id !== enemy.id) {
							target.supportShieldPool = Math.max(
								target.supportShieldPool,
								stats.allyShieldAmount ?? 0
							);
							target.supportShieldTimer = Math.max(
								target.supportShieldTimer,
								stats.allyShieldDuration ?? 0
							);
						}

						continue;
					}

					if (stats.supportPattern === 'heal-frontline-ally') {
						const target = getFrontlineHealTarget(enemy.id);

						if (target) {
							const healAmount = Math.max(
								stats.allyHealAmount ?? 0,
								Math.round(target.maxHealth * (stats.allyHealRatio ?? 0))
							);

							if (healAmount > 0) {
								target.health = Math.min(target.maxHealth, target.health + healAmount);
								target.hitFlash = Math.max(target.hitFlash, 0.08);
							}
						}
					}

					if (isBeam) {
						startEnemyBeam(enemy, stats);
						continue;
					}

					if (isSiege || isHybrid) {
						fireEnemyProjectile(enemy, stats);

						if (isSiege) {
							continue;
						}
					}

					const contactDamage = Math.max(
						1,
						Math.round(stats.contactDamage * enemy.damageMultiplier + enemy.damageBonus)
					);

					if (blockingStoneWard) {
						applyDamageToShieldSource(blockingStoneWard.sourceUtilityInstanceId, contactDamage);
					} else {
						applyDamageToPixl(contactDamage);
					}

					if (pixlHealth === 0) {
						return;
					}
				}
			}
		};

		const updateEnemyBeams = (dt: number) => {
			for (let index = enemyBeams.length - 1; index >= 0; index -= 1) {
				const beam = enemyBeams[index];
				const sourceEnemy = enemies.find((enemy) => enemy.id === beam.sourceEnemyId);

				if (!sourceEnemy) {
					enemyBeams.splice(index, 1);
					continue;
				}

				beam.age += dt;
				beam.tickTimer -= dt;

				while (beam.tickTimer <= 0) {
					beam.tickTimer += beam.tickInterval;
					if (!hasActiveVanishRune()) {
						applyDamageToPixl(beam.damage);
					}

					if (pixlHealth === 0) {
						return;
					}
				}

				if (beam.age >= beam.duration) {
					enemyBeams.splice(index, 1);
				}
			}
		};

		const updateEnemyProjectiles = (dt: number) => {
			for (let index = enemyProjectiles.length - 1; index >= 0; index -= 1) {
				const projectile = enemyProjectiles[index];
				const previousDistance = Math.hypot(projectile.x - centerX, projectile.y - centerY);
				projectile.age += dt;
				projectile.x += projectile.vx * dt;
				projectile.y += projectile.vy * dt;
				const activeStoneWards = [...getActiveStoneWards()].sort(
					(left, right) => right.radius - left.radius
				);
				let interceptedByStoneWard = false;

				for (const ward of activeStoneWards) {
					const interceptionRadius = ward.radius + projectile.size * 0.5;
					const currentDistance = Math.hypot(projectile.x - centerX, projectile.y - centerY);

					if (previousDistance > interceptionRadius && currentDistance <= interceptionRadius) {
						applyDamageToShieldSource(ward.sourceUtilityInstanceId, projectile.damage);
						enemyProjectiles.splice(index, 1);
						interceptedByStoneWard = true;
						break;
					}
				}

				if (interceptedByStoneWard) {
					continue;
				}

				const hitDistance = Math.hypot(projectile.x - centerX, projectile.y - centerY);
				if (hitDistance <= combatProfile.collision.pixlRadius + projectile.size * 0.5) {
					if (!hasActiveVanishRune()) {
						applyDamageToPixl(projectile.damage);
					}
					enemyProjectiles.splice(index, 1);
					continue;
				}

				if (
					projectile.age >= projectile.maxAge ||
					projectile.x < -40 ||
					projectile.x > p.width + 40 ||
					projectile.y < -40 ||
					projectile.y > p.height + 40
				) {
					enemyProjectiles.splice(index, 1);
				}
			}
		};

		const updateVanishRune = (dt: number) => {
			if (!activeVanishRune) {
				return;
			}

			activeVanishRune.age += dt;
			activeVanishRune.pulse += dt;

			if (activeVanishRune.age >= activeVanishRune.duration) {
				activeVanishRune = null;
			}
		};

		const updateSniperLocks = (dt: number) => {
			for (let index = sniperLocks.length - 1; index >= 0; index -= 1) {
				const lock = sniperLocks[index];
				lock.age += dt;

				const trackedTarget =
					(lock.enemyId !== null && enemies.find((enemy) => enemy.id === lock.enemyId)) ?? null;

				if (trackedTarget) {
					lock.targetX = trackedTarget.x;
					lock.targetY = trackedTarget.y;
				}

				if (lock.age < lock.chargeDuration) {
					continue;
				}

				const special = lock.weapon.attack.special;
				const releaseTarget =
					special?.type === 'sniper-line' && special.rangedOnly
						? (trackedTarget ?? getRangedEnemyTarget(lock.weapon.attack.targeting))
						: (trackedTarget ?? getEnemyWeaponTarget(lock.weapon.attack.targeting));

				if (releaseTarget && special?.type === 'sniper-line' && special.rangedOnly) {
					const maxChainTargets = Math.max(1, special.maxChainTargets ?? 1);
					const bounceRange = Math.max(1, special.bounceRange ?? 0);
					const chainTargets = buildRangedBounceTargets(
						releaseTarget,
						maxChainTargets,
						bounceRange
					);
					const chainSegments = chainTargets.map((chainTarget, chainIndex) => ({
						from:
							chainIndex === 0
								? { x: centerX, y: centerY }
								: { x: chainTargets[chainIndex - 1].x, y: chainTargets[chainIndex - 1].y },
						to: { x: chainTarget.x, y: chainTarget.y }
					}));

					sniperChainBursts.push({
						sourceWeaponInstanceId: lock.sourceWeaponInstanceId,
						segments: chainSegments,
						lineWidth: special.lineWidth,
						color: lock.color,
						glow: lock.glow,
						age: 0,
						duration: 0.18
					});

					for (const chainTarget of chainTargets) {
						const enemyIndex = enemies.findIndex((enemy) => enemy.id === chainTarget.id);

						if (enemyIndex >= 0) {
							applyDamageToEnemy(
								enemyIndex,
								getAdjustedWeaponDamage(lock.weapon, 1, lock.sourceWeaponInstanceId),
								0.1,
								lock.sourceWeaponInstanceId,
								{ allowOathbreakerShare: true }
							);
						}
					}
				} else if (releaseTarget) {
					fireProjectile(releaseTarget, lock.weapon, lock.sourceWeaponInstanceId);
				}

				sniperLocks.splice(index, 1);
			}
		};

		const updateSniperChainBursts = (dt: number) => {
			for (let index = sniperChainBursts.length - 1; index >= 0; index -= 1) {
				const burst = sniperChainBursts[index];
				burst.age += dt;

				if (burst.age >= burst.duration) {
					sniperChainBursts.splice(index, 1);
				}
			}
		};

		const updateExecutionLatticeStrikes = (dt: number) => {
			for (let index = executionLatticeStrikes.length - 1; index >= 0; index -= 1) {
				const strike = executionLatticeStrikes[index];
				strike.age += dt;

				const trackedTarget =
					(strike.enemyId !== null && enemies.find((enemy) => enemy.id === strike.enemyId)) ?? null;

				if (trackedTarget) {
					strike.targetX = trackedTarget.x;
					strike.targetY = trackedTarget.y;
				}

				const progress = Math.min(
					1,
					Math.max(0, (strike.age - strike.startDelay) / strike.dropDuration)
				);

				if (!strike.hasHit && progress >= 1) {
					if (trackedTarget) {
						const enemyIndex = enemies.findIndex((enemy) => enemy.id === trackedTarget.id);

						if (enemyIndex >= 0) {
							applyDamageToEnemy(enemyIndex, strike.damage, 0.12, strike.sourceWeaponInstanceId, {
								allowOathbreakerShare: true
							});
						}
					}

					strike.hasHit = true;
				}

				if (progress >= 1.08 || !trackedTarget) {
					executionLatticeStrikes.splice(index, 1);
				}
			}
		};

		const updateForkLightningBursts = (dt: number) => {
			for (let index = forkLightningBursts.length - 1; index >= 0; index -= 1) {
				const burst = forkLightningBursts[index];
				burst.age += dt;

				for (const segment of burst.segments) {
					const progress = easeInQuad((burst.age - segment.startDelay) / burst.duration);

					if (!segment.hasHit && progress >= 1 && segment.enemyId !== null) {
						const enemyIndex = enemies.findIndex((enemy) => enemy.id === segment.enemyId);

						if (enemyIndex >= 0) {
							applyDamageToEnemy(enemyIndex, segment.damage, 0.1, burst.sourceWeaponInstanceId, {
								allowOathbreakerShare: true
							});
						}

						segment.hasHit = true;
					}
				}

				const latestSegmentStartDelay = burst.segments.reduce(
					(maxDelay, segment) => Math.max(maxDelay, segment.startDelay),
					0
				);

				if (burst.age >= burst.duration + latestSegmentStartDelay) {
					forkLightningBursts.splice(index, 1);
				}
			}
		};

		const updateFlamethrowerCones = (dt: number) => {
			for (let index = flamethrowerCones.length - 1; index >= 0; index -= 1) {
				const cone = flamethrowerCones[index];
				const totalFlameParticles = 400;
				cone.age += dt;

				const trackedTarget =
					(cone.enemyId !== null && enemies.find((enemy) => enemy.id === cone.enemyId)) ?? null;

				if (trackedTarget) {
					const desiredAngle = Math.atan2(trackedTarget.y - centerY, trackedTarget.x - centerX);
					let delta = desiredAngle - cone.angle;
					while (delta > Math.PI) delta -= Math.PI * 2;
					while (delta < -Math.PI) delta += Math.PI * 2;
					cone.angle += delta * Math.min(1, dt * 3.2);
					cone.enemyId = trackedTarget.id;
				} else {
					const fallbackTarget = getEnemyWeaponTarget('current-target');

					if (fallbackTarget) {
						const desiredAngle = Math.atan2(fallbackTarget.y - centerY, fallbackTarget.x - centerX);
						let delta = desiredAngle - cone.angle;
						while (delta > Math.PI) delta -= Math.PI * 2;
						while (delta < -Math.PI) delta += Math.PI * 2;
						cone.angle += delta * Math.min(1, dt * 2.2);
						cone.enemyId = fallbackTarget.id;
					}
				}

				cone.tickTimer -= dt;
				cone.emissionTimer -= dt;

				while (cone.emissionTimer <= 0) {
					cone.emissionTimer += cone.emissionInterval;

					if (cone.projectilesReleased >= totalFlameParticles) {
						continue;
					}

					const releaseTarget =
						(cone.enemyId !== null && enemies.find((enemy) => enemy.id === cone.enemyId)) ??
						getEnemyWeaponTarget('current-target');

					if (releaseTarget) {
						cone.enemyId = releaseTarget.id;
					}

					const baseAngle = cone.angle;
					const volleyCount = Math.min(2, totalFlameParticles - cone.projectilesReleased);
					const initialConeSpan = cone.halfAngleRadians * 0.28;
					const perProjectileDamage = Math.max(0.1, cone.damagePerTick / 10);

					for (let volleyIndex = 0; volleyIndex < volleyCount; volleyIndex += 1) {
						const globalProjectileIndex = cone.projectilesReleased + volleyIndex;
						const arcPosition = (globalProjectileIndex * 0.61803398875) % 1;
						const laneJitter = Math.sin(cone.age * 6 + globalProjectileIndex * 1.7) * 0.028;
						const normalizedLane = Math.max(0, Math.min(1, arcPosition + laneJitter));
						const t = normalizedLane;
						const alternatingSize = globalProjectileIndex % 2 === 0 ? 1.1 : 2.2;
						const waveDirection = globalProjectileIndex % 2 === 0 ? 1 : -1;
						const lateralRatio = normalizedLane * 2 - 1;
						const muzzleLateralOffset = lateralRatio * 3.5;
						const muzzleForwardOffset = 6;
						const offset = -initialConeSpan * 0.5 + initialConeSpan * normalizedLane;
						const directionAngle = baseAngle + offset;
						const directionX = Math.cos(directionAngle);
						const directionY = Math.sin(directionAngle);
						const perpendicularX = -directionY;
						const perpendicularY = directionX;
						spawnProjectile({
							sourceWeaponInstanceId: cone.sourceWeaponInstanceId,
							originX:
								centerX + directionX * muzzleForwardOffset + perpendicularX * muzzleLateralOffset,
							originY:
								centerY + directionY * muzzleForwardOffset + perpendicularY * muzzleLateralOffset,
							angleRadians: directionAngle,
							weapon: {
								...getWeaponDefinition('flamethrower'),
								projectileSpeed: 120,
								attack: {
									...getWeaponDefinition('flamethrower').attack,
									motion: 'straight'
								}
							},
							damage: perProjectileDamage,
							speed: 120,
							size: alternatingSize + t * 0.15,
							shape: 'spark',
							trail: 'pulse',
							glow: cone.glow,
							color: '#ff3b1f',
							motion: 'wave',
							waveAmplitude: 2 + (1 - t) * 3,
							waveFrequency: 12 + t * 4,
							wavePhase:
								globalProjectileIndex * 0.55 + normalizedLane * Math.PI * 2 * waveDirection,
							waveDrift:
								lateralRatio * (0.1 + Math.abs(lateralRatio) * 0.075) + waveDirection * 0.01,
							pierceRemaining: Number.POSITIVE_INFINITY,
							hitResetInterval: cone.tickInterval
						});
					}

					cone.projectilesReleased += volleyCount;
				}

				while (cone.tickTimer <= 0) {
					cone.tickTimer += cone.tickInterval;
				}

				if (currentSweepIndex >= cone.expiresAfterSweepIndex) {
					flamethrowerCones.splice(index, 1);
				}
			}
		};

		const getDistanceToSegment = (
			pointX: number,
			pointY: number,
			startX: number,
			startY: number,
			endX: number,
			endY: number
		) => {
			const segmentX = endX - startX;
			const segmentY = endY - startY;
			const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

			if (segmentLengthSquared === 0) {
				return Math.hypot(pointX - startX, pointY - startY);
			}

			const projection =
				((pointX - startX) * segmentX + (pointY - startY) * segmentY) / segmentLengthSquared;
			const clampedProjection = Math.max(0, Math.min(1, projection));
			const nearestX = startX + segmentX * clampedProjection;
			const nearestY = startY + segmentY * clampedProjection;

			return Math.hypot(pointX - nearestX, pointY - nearestY);
		};

		const updateIceSpikes = (dt: number) => {
			for (let index = iceSpikes.length - 1; index >= 0; index -= 1) {
				const spike = iceSpikes[index];
				spike.age += dt;
				const progress = Math.max(0, (spike.age - spike.startDelay) / spike.fallDuration);
				const currentY = spike.startY + (spike.endY - spike.startY) * progress;

				if (!spike.hasHit && currentY >= spike.targetY) {
					for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
						const enemy = enemies[enemyIndex];
						const distance = Math.hypot(enemy.x - spike.targetX, enemy.y - spike.targetY);

						if (distance > spike.impactRadius + ENEMY_VISUALS[enemy.kind].radius) {
							continue;
						}

						applyDamageToEnemy(enemyIndex, spike.damage, 0.09, spike.sourceWeaponInstanceId);
					}

					spike.hasHit = true;
				}

				if (currentY > p.height + 40) {
					iceSpikes.splice(index, 1);
				}
			}
		};

		const updateBlizzardStorms = (dt: number) => {
			for (let index = blizzardStorms.length - 1; index >= 0; index -= 1) {
				const storm = blizzardStorms[index];
				storm.age += dt;
				const progress = storm.age / Math.max(0.0001, storm.duration);

				if (!storm.hasAppliedChill && progress >= 0.45) {
					for (const enemy of enemies) {
						applyChillToEnemy(enemy, storm.chillAmount, storm.freezeDuration);
					}

					storm.hasAppliedChill = true;
				}

				if (storm.age >= storm.duration) {
					blizzardStorms.splice(index, 1);
				}
			}
		};

		const updatePixlSwallowPulses = (dt: number) => {
			for (let index = pixlSwallowPulses.length - 1; index >= 0; index -= 1) {
				const pulse = pixlSwallowPulses[index];
				pulse.age += dt;

				if (pulse.age >= pulse.duration) {
					pixlSwallowPulses.splice(index, 1);
				}
			}
		};

		const updateVoidTendrils = (dt: number) => {
			const currentCycleProgress = getCurrentCycleProgress();

			for (let index = voidTendrils.length - 1; index >= 0; index -= 1) {
				const tendril = voidTendrils[index];
				tendril.age += dt;

				const trackedTarget =
					(tendril.enemyId !== null && enemies.find((enemy) => enemy.id === tendril.enemyId)) ??
					null;

				if (!trackedTarget) {
					voidTendrils.splice(index, 1);
					continue;
				}

				const consumeProgress = Math.max(
					0,
					Math.min(
						1,
						(currentCycleProgress - tendril.startCycleProgress) /
							Math.max(0.001, tendril.consumeAtCycleProgress - tendril.startCycleProgress)
					)
				);
				const pullProgress = consumeProgress <= 0.7 ? 0 : easeInQuad((consumeProgress - 0.7) / 0.3);

				if (pullProgress > 0) {
					trackedTarget.x = tendril.startX + (centerX - tendril.startX) * pullProgress;
					trackedTarget.y = tendril.startY + (centerY - tendril.startY) * pullProgress;
				}

				tendril.targetX = trackedTarget.x;
				tendril.targetY = trackedTarget.y;
				trackedTarget.voidTouchedTimer = Math.max(trackedTarget.voidTouchedTimer, dt * 2);

				if (currentCycleProgress >= tendril.consumeAtCycleProgress) {
					const enemyIndex = enemies.findIndex((enemy) => enemy.id === trackedTarget.id);

					if (enemyIndex >= 0) {
						consumeEnemyIntoPixlShield(
							enemyIndex,
							`${tendril.sourceWeaponInstanceId}-void-consume-${trackedTarget.id}`,
							tendril.color
						);
					}

					voidTendrils.splice(index, 1);
				}
			}
		};

		const updateNaturesWraths = (dt: number) => {
			for (let index = naturesWraths.length - 1; index >= 0; index -= 1) {
				const wrath = naturesWraths[index];
				wrath.age += dt;
				wrath.pulseTimer -= dt;

				const trackedTarget =
					(wrath.enemyId !== null && enemies.find((enemy) => enemy.id === wrath.enemyId)) ?? null;

				if (!trackedTarget) {
					naturesWraths.splice(index, 1);
					continue;
				}

				wrath.targetX = trackedTarget.x;
				wrath.targetY = trackedTarget.y;

				while (wrath.pulseTimer <= 0) {
					healPixl(wrath.healAmount);
					wrath.pulseTimer += wrath.pulseInterval;
				}

				if (wrath.age < wrath.duration) {
					continue;
				}

				const enemyIndex = enemies.findIndex((enemy) => enemy.id === trackedTarget.id);

				if (enemyIndex >= 0) {
					consumeEnemyIntoNatureHeal(enemyIndex);
				}

				naturesWraths.splice(index, 1);
			}
		};

		const updateProjectiles = (dt: number) => {
			for (let index = projectiles.length - 1; index >= 0; index -= 1) {
				const projectile = projectiles[index];
				projectile.lastX = projectile.x;
				projectile.lastY = projectile.y;
				projectile.age += dt;

				if (projectile.motion === 'accelerate') {
					projectile.speed += 240 * dt;
				}

				if (projectile.homingTargetEnemyId !== null) {
					let targetEnemy =
						enemies.find((enemy) => enemy.id === projectile.homingTargetEnemyId) ?? null;

					if (!targetEnemy) {
						targetEnemy = retargetHomingProjectile(projectile);
					}

					if (targetEnemy) {
						const dx = targetEnemy.x - projectile.x;
						const dy = targetEnemy.y - projectile.y;
						const distance = Math.hypot(dx, dy) || 1;
						const desiredDirectionX = dx / distance;
						const desiredDirectionY = dy / distance;
						const turnAmount = Math.min(1, projectile.homingTurnRate * dt);
						const nextDirectionX =
							projectile.directionX + (desiredDirectionX - projectile.directionX) * turnAmount;
						const nextDirectionY =
							projectile.directionY + (desiredDirectionY - projectile.directionY) * turnAmount;
						const magnitude = Math.hypot(nextDirectionX, nextDirectionY) || 1;

						projectile.directionX = nextDirectionX / magnitude;
						projectile.directionY = nextDirectionY / magnitude;
						projectile.perpendicularX = -projectile.directionY;
						projectile.perpendicularY = projectile.directionX;
						projectile.animation.directionX = projectile.directionX;
						projectile.animation.directionY = projectile.directionY;
					}
				}

				if (projectile.hitResetInterval > 0) {
					projectile.hitResetTimer -= dt;

					while (projectile.hitResetTimer <= 0) {
						projectile.hitEnemyIds = [];
						projectile.hitResetTimer += projectile.hitResetInterval;
					}
				}

				projectile.distanceTravelled += projectile.speed * dt;

				if (projectile.sizeGrowth > 0) {
					projectile.size = Math.min(
						projectile.maxSize,
						projectile.size + projectile.sizeGrowth * dt
					);
					projectile.visual.size = projectile.size;
				}

				if (projectile.impactRadiusGrowth > 0) {
					projectile.impactRadius = Math.min(
						projectile.maxImpactRadius,
						projectile.impactRadius + projectile.impactRadiusGrowth * dt
					);
				}

				if (projectile.homingTurnRate > 0) {
					projectile.x += projectile.directionX * projectile.speed * dt;
					projectile.y += projectile.directionY * projectile.speed * dt;
				} else {
					const waveRamp = Math.min(1, projectile.distanceTravelled / 105);
					const bloomRamp = waveRamp * waveRamp;
					const waveOffset =
						projectile.motion === 'wave'
							? Math.sin(projectile.age * projectile.waveFrequency + projectile.wavePhase) *
									projectile.waveAmplitude *
									bloomRamp +
								projectile.distanceTravelled * projectile.waveDrift * bloomRamp
							: 0;

					projectile.x =
						projectile.originX +
						projectile.directionX * projectile.distanceTravelled +
						projectile.perpendicularX * waveOffset;
					projectile.y =
						projectile.originY +
						projectile.directionY * projectile.distanceTravelled +
						projectile.perpendicularY * waveOffset;
				}

				if (projectile.weaponId === 'the-knife') {
					recordKnifeTrailSegment(projectile.lastX, projectile.lastY, projectile.x, projectile.y);
				}

				if (!projectile.arrivalEffect && !projectile.reflectedByMirror) {
					const mirror = getMirrorArrayForSegment(
						projectile.lastX,
						projectile.lastY,
						projectile.x,
						projectile.y
					);

					if (mirror && reflectProjectileFromMirror(projectile, mirror)) {
						continue;
					}
				}

				if (
					projectile.arrivalEffect &&
					projectile.impactTargetX !== null &&
					projectile.impactTargetY !== null
				) {
					const remainingDistance = Math.hypot(
						projectile.x - projectile.impactTargetX,
						projectile.y - projectile.impactTargetY
					);
					const plannedTravelDistance = Math.hypot(
						projectile.impactTargetX - projectile.originX,
						projectile.impactTargetY - projectile.originY
					);

					if (
						remainingDistance <= Math.max(projectile.arrivalTriggerRadius, projectile.size) ||
						projectile.distanceTravelled >= plannedTravelDistance
					) {
						triggerProjectileArrivalEffect(projectile);
						projectiles.splice(index, 1);
						continue;
					}
				}

				const hitEnemyIdsThisStep: number[] = [];
				const multiHitProjectile = projectile.hitResetInterval > 0;

				if (projectile.collidesWithEnemies) {
					for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex += 1) {
						const enemy = enemies[enemyIndex];
						if (projectile.hitEnemyIds.includes(enemy.id)) {
							continue;
						}

						const hitRadius = ENEMY_VISUALS[enemy.kind].radius + projectile.size;
						const distance = multiHitProjectile
							? getDistanceToSegment(
									enemy.x,
									enemy.y,
									projectile.lastX,
									projectile.lastY,
									projectile.x,
									projectile.y
								)
							: Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

						if (distance <= hitRadius) {
							hitEnemyIdsThisStep.push(enemy.id);

							if (!multiHitProjectile) {
								break;
							}
						}
					}
				}

				if (hitEnemyIdsThisStep.length > 0) {
					projectile.hitEnemyIds = [...projectile.hitEnemyIds, ...hitEnemyIdsThisStep];

					if (multiHitProjectile) {
						for (const enemyId of hitEnemyIdsThisStep) {
							const enemyIndex = enemies.findIndex((enemy) => enemy.id === enemyId);

							if (enemyIndex >= 0) {
								applyDamageToEnemy(
									enemyIndex,
									projectile.damage,
									0.04,
									projectile.sourceWeaponInstanceId,
									{ allowOathbreakerShare: true }
								);
							}
						}

						if (projectile.pierceRemaining > 0) {
							projectile.pierceRemaining -= hitEnemyIdsThisStep.length;
							projectile.mirrorBounceReady = true;
						} else {
							projectiles.splice(index, 1);
						}

						continue;
					}

					let hitEnemyIndex = enemies.findIndex((enemy) => enemy.id === hitEnemyIdsThisStep[0]);

					if (hitEnemyIndex < 0) {
						continue;
					}

					const enemy = enemies[hitEnemyIndex];

					if (projectile.impactRadius > 0) {
						const splashDamage = Math.max(1, Math.round(projectile.damage * 0.6));

						for (let splashIndex = enemies.length - 1; splashIndex >= 0; splashIndex -= 1) {
							if (splashIndex === hitEnemyIndex) {
								continue;
							}

							const splashTarget = enemies[splashIndex];
							const splashDistance = Math.hypot(splashTarget.x - enemy.x, splashTarget.y - enemy.y);

							if (splashDistance > projectile.impactRadius) {
								continue;
							}

							if (
								applyDamageToEnemy(
									splashIndex,
									splashDamage,
									0.06,
									projectile.sourceWeaponInstanceId
								).defeated &&
								splashIndex < hitEnemyIndex
							) {
								hitEnemyIndex -= 1;
							}
						}
					}

					spawnShrapnelBurst(
						projectile,
						getWeaponDefinition(projectile.weaponId),
						projectile.x,
						projectile.y,
						enemy.id
					);

					if (projectile.minePayloadWeaponId) {
						triggerPerimeterMinePayloadAtPoint({
							weapon: getWeaponDefinition(projectile.minePayloadWeaponId),
							sourceWeaponInstanceId: projectile.sourceWeaponInstanceId,
							centerX: projectile.x,
							centerY: projectile.y,
							primaryHitEnemyId: enemy.id
						});
					}

					applyDamageToEnemy(
						hitEnemyIndex,
						projectile.damage,
						0.08,
						projectile.sourceWeaponInstanceId,
						{ allowOathbreakerShare: true }
					);

					if (projectile.ricochetRemaining > 0 && retargetRicochetProjectile(projectile)) {
						projectile.ricochetRemaining -= 1;
						continue;
					}

					if (projectile.pierceRemaining > 0) {
						projectile.pierceRemaining -= 1;
						projectile.mirrorBounceReady = true;
					} else {
						projectiles.splice(index, 1);
					}

					continue;
				}

				if (
					projectile.x < -24 ||
					projectile.x > p.width + 24 ||
					projectile.y < -24 ||
					projectile.y > p.height + 24
				) {
					const mirror = getMirrorArrayForSegment(
						projectile.lastX,
						projectile.lastY,
						projectile.x,
						projectile.y
					);

					if (mirror && reflectProjectileFromMirror(projectile, mirror)) {
						continue;
					}

					projectiles.splice(index, 1);
				}
			}
		};

		const drawArena = () => {
			p.background(0);

			p.noFill();
			p.stroke(38, 38, 38);
			p.strokeWeight(1);
			p.circle(centerX, centerY, arenaRadius * 2);

			p.stroke(25, 25, 25);
			p.circle(centerX, centerY, combatProfile.collision.contactRange * 2.8);
		};

		const drawLoadout = () => {
			const layout = getLoadoutLayout();
			const loadoutColumnCount = pixlProgression.loadoutColumns;
			const loadoutRowCount = pixlProgression.loadoutRows;
			const sweepX = layout.left + (sweepProgress / loadoutColumnCount) * layout.gridWidth;

			p.push();
			p.rectMode(p.CORNER);
			p.strokeWeight(1);

			p.noStroke();
			p.fill(0, 0, 0, 188);
			p.rect(layout.left - 8, layout.top - 8, layout.gridWidth + 16, layout.gridHeight + 16, 14);

			for (let row = 0; row < loadoutRowCount; row += 1) {
				for (let column = 0; column < loadoutColumnCount; column += 1) {
					const x = layout.left + column * layout.cellSize;
					const y = layout.top + row * layout.cellSize;

					p.stroke(48, 48, 48, 200);
					p.fill(14, 14, 14, 220);
					p.rect(x, y, layout.cellSize, layout.cellSize, 4);
				}
			}

			for (const item of equippedLoadoutEntries) {
				const fill = WEAPON_FILL_BY_RARITY[item.definition.rarity];

				for (const [cellX, cellY] of item.shape.cells) {
					const gridX = item.placementX + cellX;
					const gridY = item.placementY + cellY;

					if (gridX < 0 || gridX >= loadoutColumnCount || gridY < 0 || gridY >= loadoutRowCount) {
						continue;
					}

					const x = layout.left + gridX * layout.cellSize;
					const y = layout.top + gridY * layout.cellSize;

					p.stroke(255, 255, 255, 42);
					p.fill(fill[0], fill[1], fill[2], 214);
					p.rect(x + 1, y + 1, layout.cellSize - 2, layout.cellSize - 2, 4);
				}
			}

			p.stroke(110, 255, 150, 235);
			p.strokeWeight(2);
			p.line(sweepX, layout.top - 2, sweepX, layout.top + layout.gridHeight + 2);

			p.pop();
		};

		const drawPixl = () => {
			p.push();
			const activeElementalBuffs = (
				Object.entries(elementalCycleBuffExpiresAfterSweepIndex) as Array<
					[ElementalInfusionType, number | null]
				>
			).filter(([, expiresAfterSweepIndex]) => expiresAfterSweepIndex !== null);

			for (const [element] of activeElementalBuffs) {
				const age = pixlAuraClock;
				const pulse = 0.92 + Math.sin(age * 6) * 0.08;
				const radius = combatProfile.collision.pixlRadius + 8;

				if (element === 'fire') {
					p.noFill();
					p.stroke('#fb923ccc');
					p.strokeWeight(2);
					p.arc(centerX, centerY, radius * 2.4, radius * 2.4, age * 2.4, age * 2.4 + Math.PI * 1.2);
					for (let emberIndex = 0; emberIndex < 3; emberIndex += 1) {
						const angle = age * 2.8 + emberIndex * ((Math.PI * 2) / 3);
						p.noStroke();
						p.fill('#fdba74cc');
						p.circle(
							centerX + Math.cos(angle) * radius * 1.18,
							centerY + Math.sin(angle) * radius * 1.18,
							3.5 + pulse
						);
					}
				} else if (element === 'lightning') {
					p.stroke('#fde047dd');
					p.strokeWeight(1.8);
					for (let boltIndex = 0; boltIndex < 3; boltIndex += 1) {
						const angle = age * 4 + boltIndex * ((Math.PI * 2) / 3);
						const startX = centerX + Math.cos(angle) * radius * 0.88;
						const startY = centerY + Math.sin(angle) * radius * 0.88;
						const midX = centerX + Math.cos(angle + 0.18) * radius * 1.18;
						const midY = centerY + Math.sin(angle + 0.18) * radius * 1.02;
						const endX = centerX + Math.cos(angle - 0.08) * radius * 1.42;
						const endY = centerY + Math.sin(angle - 0.08) * radius * 1.26;
						p.line(startX, startY, midX, midY);
						p.line(midX, midY, endX, endY);
					}
				} else if (element === 'cold') {
					p.noFill();
					p.stroke('#7dd3fccc');
					p.strokeWeight(1.7);
					p.circle(centerX, centerY, radius * 2.45);
					for (let shardIndex = 0; shardIndex < 4; shardIndex += 1) {
						const angle = age * 1.6 + shardIndex * (Math.PI / 2);
						const x = centerX + Math.cos(angle) * radius * 1.22;
						const y = centerY + Math.sin(angle) * radius * 1.22;
						p.line(x - 3, y, x + 3, y);
						p.line(x, y - 3, x, y + 3);
					}
				} else {
					p.noFill();
					p.stroke('#a78bfacc');
					p.strokeWeight(1.8);
					for (let ringIndex = 0; ringIndex < 2; ringIndex += 1) {
						const wobble = Math.sin(age * 3.4 + ringIndex * 1.8) * 2.6;
						p.circle(centerX, centerY, radius * (2.15 + ringIndex * 0.38) + wobble);
					}
				}
			}

			if (activeElementalBuffs.length === 4) {
				const age = pixlAuraClock;
				const masteryRadius = combatProfile.collision.pixlRadius + 13;
				const colors = ['#fb923c', '#fde047', '#7dd3fc', '#a78bfa'];

				p.noFill();
				for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
					const angle = age * (1.2 + ringIndex * 0.18) + ringIndex * (Math.PI / 4);
					const radius = masteryRadius + Math.sin(age * 3 + ringIndex) * 3;
					p.push();
					p.translate(centerX, centerY);
					p.rotate(angle);
					p.stroke(colors[ringIndex]);
					p.strokeWeight(1.8 + (ringIndex % 2) * 0.4);
					p.rectMode(p.CENTER);
					p.rect(0, 0, radius * (2 + ringIndex * 0.14), radius * (2 + ringIndex * 0.14), 6);
					p.pop();
				}

				for (let sparkIndex = 0; sparkIndex < 8; sparkIndex += 1) {
					const color = colors[sparkIndex % colors.length];
					const angle = age * 2.8 + sparkIndex * (Math.PI / 4);
					const innerRadius = masteryRadius * 0.7;
					const outerRadius = masteryRadius * 1.65;
					p.stroke(color);
					p.strokeWeight(1.3);
					p.line(
						centerX + Math.cos(angle) * innerRadius,
						centerY + Math.sin(angle) * innerRadius,
						centerX + Math.cos(angle) * outerRadius,
						centerY + Math.sin(angle) * outerRadius
					);
				}
			}

			for (const pulse of pixlSwallowPulses) {
				const progress = Math.max(0, Math.min(1, pulse.age / pulse.duration));
				const collapseProgress = easeInQuad(progress);
				const centerBurst = Math.max(0, (progress - 0.58) / 0.42);
				const impactSize = Math.min(18, 8 + Math.sqrt(pulse.shieldGain) * 0.9);
				const streamAlphaHex = Math.round((1 - progress) * 180)
					.toString(16)
					.padStart(2, '0');
				const coreAlphaHex = Math.round((1 - progress) * 220)
					.toString(16)
					.padStart(2, '0');

				for (let streamIndex = 0; streamIndex < 4; streamIndex += 1) {
					const angle = pulse.age * 8 + streamIndex * (Math.PI / 2);
					const orbitRadius = (1 - collapseProgress) * (12 + streamIndex * 3);
					const streamX =
						p.lerp(pulse.originX, centerX, collapseProgress) + Math.cos(angle) * orbitRadius;
					const streamY =
						p.lerp(pulse.originY, centerY, collapseProgress) + Math.sin(angle) * orbitRadius;

					p.stroke(`${pulse.color}${streamAlphaHex}`);
					p.strokeWeight(1.4 + (1 - progress) * 2.2);
					p.line(streamX, streamY, centerX, centerY);
					p.noStroke();
					p.fill(`${pulse.color}${coreAlphaHex}`);
					p.circle(streamX, streamY, 4 + (1 - progress) * 5);
				}

				if (centerBurst > 0) {
					p.noFill();
					p.stroke(
						`${pulse.color}${Math.round((1 - centerBurst) * 210)
							.toString(16)
							.padStart(2, '0')}`
					);
					p.strokeWeight(2.5 - centerBurst * 1.3);
					p.circle(centerX, centerY, impactSize + centerBurst * 22);

					p.noStroke();
					p.fill(
						`${pulse.color}${Math.round((1 - centerBurst) * 120)
							.toString(16)
							.padStart(2, '0')}`
					);
					p.circle(centerX, centerY, impactSize * (0.9 + centerBurst * 0.7));
				}
			}

			p.noFill();
			p.strokeWeight(2);

			if (pixlFlash > 0) {
				p.stroke(255, 96, 96);
			} else {
				p.stroke(255);
			}

			p.circle(centerX, centerY, combatProfile.collision.pixlRadius * 2);

			if (pixlShieldPool > 0) {
				p.noFill();
				p.stroke(activeShieldColor);
				p.strokeWeight(3);
				p.circle(centerX, centerY, combatProfile.collision.pixlRadius * 2.9);
			}

			if (options.showPixlCrown) {
				drawPixlCrown(p, centerX, centerY, combatProfile.collision.pixlRadius);
			}
			p.pop();
		};

		const drawProjectiles = () => {
			p.push();

			for (const field of forceFields) {
				if (
					getWeaponModuleByInstanceId(field.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'force-field',
						centerX: field.centerX,
						centerY: field.centerY,
						startDelay: field.startDelay,
						radius: field.radius,
						lineWidth: field.lineWidth,
						color: field.color,
						glow: field.glow,
						age: field.age
					})
				) {
					continue;
				}

				if (field.age < field.startDelay) {
					continue;
				}

				if (field.glow) {
					p.noFill();
					p.stroke(`${field.color}44`);
					p.strokeWeight(field.lineWidth * 1.6);
					p.circle(field.centerX, field.centerY, field.radius * 2.15);
				}

				p.noFill();
				p.stroke(field.color);
				p.strokeWeight(field.lineWidth);
				p.circle(field.centerX, field.centerY, field.radius * 2);
			}

			for (const pulse of killSwitchPulses) {
				if (
					getWeaponModuleByInstanceId(pulse.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'kill-switch-pulse',
						centerX: pulse.centerX,
						centerY: pulse.centerY,
						radius: pulse.radius,
						lineWidth: pulse.lineWidth,
						color: pulse.color,
						glow: pulse.glow
					})
				) {
					continue;
				}

				if (pulse.glow) {
					p.noFill();
					p.stroke(`${pulse.color}33`);
					p.strokeWeight(pulse.lineWidth * 1.9);
					p.circle(pulse.centerX, pulse.centerY, pulse.radius * 2.1);
				}

				p.noFill();
				p.stroke(pulse.color);
				p.strokeWeight(pulse.lineWidth);
				p.circle(pulse.centerX, pulse.centerY, pulse.radius * 2);
			}

			for (const pulse of vulnerablePulses) {
				if (
					getWeaponModuleByInstanceId(pulse.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'vulnerable-pulse',
						centerX: pulse.centerX,
						centerY: pulse.centerY,
						radius: pulse.radius,
						lineWidth: pulse.lineWidth,
						color: pulse.color,
						glow: pulse.glow
					})
				) {
					continue;
				}

				if (pulse.glow) {
					p.noFill();
					p.stroke(`${pulse.color}33`);
					p.strokeWeight(pulse.lineWidth * 1.8);
					p.circle(pulse.centerX, pulse.centerY, pulse.radius * 2.1);
				}

				p.noFill();
				p.stroke(pulse.color);
				p.strokeWeight(pulse.lineWidth);
				p.circle(pulse.centerX, pulse.centerY, pulse.radius * 2);
			}

			for (const pulse of parasiteBloomPulses) {
				const progress = Math.max(0, Math.min(1, pulse.age / pulse.duration));
				const alphaHex = Math.round((1 - progress) * 220)
					.toString(16)
					.padStart(2, '0');
				const glowAlphaHex = Math.round((1 - progress) * 72)
					.toString(16)
					.padStart(2, '0');

				p.noFill();
				p.stroke(`${pulse.color}${glowAlphaHex}`);
				p.strokeWeight(12 - progress * 6);
				p.circle(pulse.originX, pulse.originY, pulse.radius * 2.18);

				p.stroke(`${pulse.color}${alphaHex}`);
				p.strokeWeight(4.2 - progress * 2.1);
				p.circle(pulse.originX, pulse.originY, pulse.radius * 2);

				p.noStroke();
				p.fill(`#dcfce7${alphaHex}`);
				p.circle(pulse.originX, pulse.originY, 10 + (1 - progress) * 10);
			}

			for (const mirror of mirrorArrays) {
				const life = 1 - mirror.age / Math.max(0.0001, mirror.sweepDuration + mirror.duration);
				const alphaHex = Math.round(Math.max(0.18, life * 0.75) * 255)
					.toString(16)
					.padStart(2, '0');
				const startAngle = mirror.angle - mirror.halfArcRadians;
				const endAngle = mirror.angle + mirror.halfArcRadians;

				if (mirror.glow) {
					p.noFill();
					p.stroke(`${mirror.color}22`);
					p.strokeWeight(mirror.lineWidth * 2.2);
					p.arc(
						centerX,
						centerY,
						mirror.currentRadius * 2.15,
						mirror.currentRadius * 2.15,
						startAngle,
						endAngle
					);
				}

				p.noFill();
				p.stroke(`${mirror.color}${alphaHex}`);
				p.strokeWeight(mirror.lineWidth);
				p.arc(
					centerX,
					centerY,
					mirror.currentRadius * 2,
					mirror.currentRadius * 2,
					startAngle,
					endAngle
				);

				for (let shardIndex = 0; shardIndex < 7; shardIndex += 1) {
					const t = shardIndex / 6;
					const shardAngle = p.lerp(startAngle, endAngle, t);
					const shardX = centerX + Math.cos(shardAngle) * mirror.currentRadius;
					const shardY = centerY + Math.sin(shardAngle) * mirror.currentRadius;
					const tangentAngle = shardAngle + Math.PI / 2;
					const shardLength = 12 + (shardIndex % 2) * 4;

					p.stroke(`#eff6ff${alphaHex}`);
					p.strokeWeight(2.2);
					p.line(
						shardX - Math.cos(tangentAngle) * shardLength * 0.5,
						shardY - Math.sin(tangentAngle) * shardLength * 0.5,
						shardX + Math.cos(tangentAngle) * shardLength * 0.5,
						shardY + Math.sin(tangentAngle) * shardLength * 0.5
					);
				}
			}

			for (const sigil of oathbreakerSigils) {
				const chainedEnemies = sigil.enemyIds
					.map((enemyId) => enemies.find((enemy) => enemy.id === enemyId) ?? null)
					.filter((enemy): enemy is EnemyState => enemy !== null);

				if (
					getUtilityModuleByInstanceId(sigil.sourceUtilityInstanceId).renderArenaEffect(p, {
						kind: 'oathbreaker-sigil',
						arenaCenterX: centerX,
						arenaCenterY: centerY,
						currentRadius: sigil.currentRadius,
						radius: sigil.radius,
						age: sigil.age,
						sweepDuration: sigil.sweepDuration,
						duration: sigil.duration,
						angle: sigil.angle,
						halfArcRadians: sigil.halfArcRadians,
						lineWidth: sigil.lineWidth,
						color: sigil.color,
						glow: sigil.glow,
						chainedEnemies: chainedEnemies.map((enemy) => ({
							x: enemy.x,
							y: enemy.y,
							radius: ENEMY_VISUALS[enemy.kind].radius
						}))
					})
				) {
					continue;
				}

				const life = 1 - sigil.age / Math.max(0.0001, sigil.sweepDuration + sigil.duration);
				const alphaHex = Math.round(Math.max(0.22, life * 0.72) * 255)
					.toString(16)
					.padStart(2, '0');
				const startAngle = sigil.angle - sigil.halfArcRadians;
				const endAngle = sigil.angle + sigil.halfArcRadians;
				const chainPointCount = 11;
				let previousChainX = 0;
				let previousChainY = 0;

				if (sigil.glow) {
					p.noFill();
					p.stroke(`${sigil.color}33`);
					p.strokeWeight(sigil.lineWidth * 1.8);
					p.arc(
						centerX,
						centerY,
						sigil.currentRadius * 2.1,
						sigil.currentRadius * 2.1,
						startAngle,
						endAngle
					);
				}

				p.noFill();
				p.stroke(`${sigil.color}${alphaHex}`);
				p.strokeWeight(sigil.lineWidth);
				p.arc(
					centerX,
					centerY,
					sigil.currentRadius * 2,
					sigil.currentRadius * 2,
					startAngle,
					endAngle
				);

				for (let pointIndex = 0; pointIndex < chainPointCount; pointIndex += 1) {
					const t = pointIndex / (chainPointCount - 1);
					const pointAngle = p.lerp(startAngle, endAngle, t);
					const pointX = centerX + Math.cos(pointAngle) * sigil.currentRadius;
					const pointY = centerY + Math.sin(pointAngle) * sigil.currentRadius;

					if (pointIndex > 0) {
						p.stroke(`${sigil.color}${alphaHex}`);
						p.strokeWeight(2.2);
						p.line(previousChainX, previousChainY, pointX, pointY);
					}

					p.noStroke();
					p.fill(pointIndex % 2 === 0 ? `#fef3c7${alphaHex}` : `${sigil.color}${alphaHex}`);
					p.circle(
						pointX,
						pointY,
						pointIndex === 0 || pointIndex === chainPointCount - 1 ? 7 : 5.6
					);

					previousChainX = pointX;
					previousChainY = pointY;
				}

				for (const enemy of chainedEnemies) {
					const enemyAngle = Math.atan2(enemy.y - centerY, enemy.x - centerX);
					const anchorX =
						centerX + Math.cos(enemyAngle) * Math.min(sigil.currentRadius, sigil.radius);
					const anchorY =
						centerY + Math.sin(enemyAngle) * Math.min(sigil.currentRadius, sigil.radius);
					p.noFill();
					p.stroke(`${sigil.color}${alphaHex}`);
					p.strokeWeight(1.8);
					p.line(anchorX, anchorY, enemy.x, enemy.y);
					p.noStroke();
					p.fill(`#fef3c7${alphaHex}`);
					p.circle(anchorX, anchorY, 5);
					p.circle(enemy.x, enemy.y, ENEMY_VISUALS[enemy.kind].radius * 2.4);
				}

				if (chainedEnemies.length > 1) {
					for (let enemyIndex = 0; enemyIndex < chainedEnemies.length; enemyIndex += 1) {
						const enemy = chainedEnemies[enemyIndex];
						const nextEnemy = chainedEnemies[(enemyIndex + 1) % chainedEnemies.length];
						p.stroke(`${sigil.color}88`);
						p.strokeWeight(1.2);
						p.line(enemy.x, enemy.y, nextEnemy.x, nextEnemy.y);
					}
				}
			}

			for (const field of stasisFields) {
				if (
					getWeaponModuleByInstanceId(field.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'stasis-field',
						centerX: field.centerX,
						centerY: field.centerY,
						radius: field.radius,
						color: field.color,
						glow: field.glow
					})
				) {
					continue;
				}

				if (field.glow) {
					p.noFill();
					p.stroke(`${field.color}33`);
					p.strokeWeight(10);
					p.circle(field.centerX, field.centerY, field.radius * 2.2);
				}

				p.noFill();
				p.stroke(field.color);
				p.strokeWeight(2.8);
				p.circle(field.centerX, field.centerY, field.radius * 2);
			}

			for (const prison of prismPrisons) {
				const openProgress = Math.min(1, prison.age / 0.24);
				const scale = 0.58 + easeInQuad(openProgress) * 0.42;
				const points = getRegularPolygonPoints(
					prison.centerX,
					prison.centerY,
					prison.radius * scale,
					prison.sides,
					prison.rotation
				);
				const alphaHex = Math.round(
					(prison.triggered ? 1 - prison.activeAge / Math.max(0.0001, prison.activeDuration) : 1) *
						200
				)
					.toString(16)
					.padStart(2, '0');

				if (prison.glow) {
					p.noFill();
					p.stroke(`${prison.color}22`);
					p.strokeWeight(prison.lineWidth * 2.1);
					p.beginShape();
					for (const point of points) {
						p.vertex(point.x, point.y);
					}
					p.endShape(p.CLOSE);
				}

				p.noFill();
				p.stroke(`${prison.color}${alphaHex}`);
				p.strokeWeight(prison.lineWidth);
				p.beginShape();
				for (const point of points) {
					p.vertex(point.x, point.y);
				}
				p.endShape(p.CLOSE);

				p.stroke(`#ecfeff${alphaHex}`);
				p.strokeWeight(1.8);
				for (let edgeIndex = 0; edgeIndex < points.length; edgeIndex += 1) {
					const start = points[edgeIndex];
					const end = points[(edgeIndex + 1) % points.length];
					const midX = (start.x + end.x) / 2;
					const midY = (start.y + end.y) / 2;
					p.line(start.x, start.y, midX, midY);
				}
			}
			for (const pylon of supportPylons) {
				getWeaponModuleByInstanceId(pylon.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'support-pylon',
					variant: pylon.variant,
					centerX: pylon.centerX,
					centerY: pylon.centerY,
					radius: pylon.radius,
					markerSize: pylon.markerSize,
					color: pylon.color,
					glow: pylon.glow,
					age: pylon.age,
					duration: pylon.duration
				});
			}

			for (let rodIndex = 0; rodIndex < laserRods.length; rodIndex += 1) {
				const rod = laserRods[rodIndex];
				const links = laserRods
					.slice(rodIndex + 1)
					.filter((candidate) => candidate.definitionId === rod.definitionId)
					.map((candidate) => ({ x: candidate.centerX, y: candidate.centerY }));

				getWeaponModuleByInstanceId(rod.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'laser-rod-network',
					variant: rod.variant,
					centerX: rod.centerX,
					centerY: rod.centerY,
					rodAngle: rod.rodAngle,
					rodLength: rod.rodLength,
					lineWidth: rod.lineWidth,
					color: rod.color,
					glow: rod.glow,
					age: rod.age,
					duration: rod.duration,
					links
				});
			}

			for (const rift of voidRifts) {
				getWeaponModuleByInstanceId(rift.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'void-rift',
					centerX: rift.centerX,
					centerY: rift.centerY,
					angle: rift.angle,
					halfWidth: rift.halfWidth,
					halfHeight: rift.halfHeight,
					age: rift.age,
					activeDuration: rift.activeDuration,
					collapseAge: rift.collapseAge,
					collapseDuration: rift.collapseDuration,
					hasCollapsed: rift.hasCollapsed,
					finalPulseRadius: rift.finalPulseRadius,
					pulseMaxRadius: rift.pulseMaxRadius,
					finalPulseDamage: rift.finalPulseDamage,
					color: rift.color,
					glow: rift.glow,
					easeInQuad
				});
			}

			for (const tunnel of voidTunnels) {
				if (
					getWeaponModuleByInstanceId(tunnel.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'void-tunnel',
						variant: tunnel.variant,
						centerX: tunnel.centerX,
						centerY: tunnel.centerY,
						halfWidth: tunnel.halfWidth,
						halfHeight: tunnel.halfHeight,
						age: tunnel.age,
						duration: tunnel.duration,
						color: tunnel.color,
						glow: tunnel.glow,
						easeInQuad
					})
				) {
					continue;
				}

				if (tunnel.variant === 'void-tunnel') {
					const progress = Math.min(1, tunnel.age / Math.max(0.0001, tunnel.duration * 0.32));
					const easedProgress = easeInQuad(progress);
					const gapHalf = 10;
					const left = tunnel.centerX - tunnel.halfWidth;
					const width = tunnel.halfWidth * 2;
					const halfHeight = tunnel.halfHeight;
					const slabHeight = Math.max(8, halfHeight - gapHalf);
					const topStartY = tunnel.centerY - halfHeight - slabHeight;
					const topEndY = tunnel.centerY - halfHeight;
					const bottomStartY = tunnel.centerY + halfHeight;
					const bottomEndY = tunnel.centerY + gapHalf;
					const topY = topStartY + (topEndY - topStartY) * easedProgress;
					const bottomY = bottomStartY + (bottomEndY - bottomStartY) * easedProgress;
					const alphaHex = Math.round((1 - tunnel.age / tunnel.duration) * 120)
						.toString(16)
						.padStart(2, '0');

					p.noStroke();
					p.fill(`${tunnel.color}${alphaHex}`);
					p.rect(left, topY, width, slabHeight, 6);
					p.rect(left, bottomY, width, slabHeight, 6);
					continue;
				}

				const bloomProgress = Math.min(1, tunnel.age / Math.max(0.0001, tunnel.duration * 0.28));
				const easedBloomProgress = easeInQuad(bloomProgress);
				const radiusX = tunnel.halfWidth * easedBloomProgress;
				const radiusY = tunnel.halfHeight * easedBloomProgress;
				const alphaHex = Math.round((1 - tunnel.age / tunnel.duration) * 120)
					.toString(16)
					.padStart(2, '0');

				if (tunnel.glow) {
					p.noStroke();
					p.fill(`${tunnel.color}22`);
					p.ellipse(tunnel.centerX, tunnel.centerY, radiusX * 2.6, radiusY * 2.6);
				}

				const gridAlphaHex = Math.round((1 - tunnel.age / tunnel.duration) * 168)
					.toString(16)
					.padStart(2, '0');
				const gridColor = `${tunnel.color}${gridAlphaHex}`;

				p.noFill();
				p.stroke(gridColor);
				p.strokeWeight(1.1);

				for (let ringIndex = 0; ringIndex < 8; ringIndex += 1) {
					const ringT = ringIndex / 7;
					const ringScale = 1 - ringT * 0.78;
					p.ellipse(
						tunnel.centerX,
						tunnel.centerY,
						Math.max(10, radiusX * 2 * ringScale),
						Math.max(10, radiusY * 2 * ringScale)
					);
				}

				for (let spokeIndex = 0; spokeIndex < 20; spokeIndex += 1) {
					const angle = (spokeIndex / 20) * Math.PI * 2;
					const outerX = tunnel.centerX + Math.cos(angle) * radiusX;
					const outerY = tunnel.centerY + Math.sin(angle) * radiusY;
					const innerX = tunnel.centerX + Math.cos(angle) * radiusX * 0.14;
					const innerY = tunnel.centerY + Math.sin(angle) * radiusY * 0.14;
					p.line(outerX, outerY, innerX, innerY);
				}

				p.noStroke();
				p.fill(`${tunnel.color}${alphaHex}`);
				p.ellipse(tunnel.centerX, tunnel.centerY, radiusX * 2, radiusY * 2);
				p.fill('#050308cc');
				p.ellipse(tunnel.centerX, tunnel.centerY, radiusX * 1.05, radiusY * 1.05);
				p.fill(
					`${tunnel.color}${Math.round((1 - tunnel.age / tunnel.duration) * 210)
						.toString(16)
						.padStart(2, '0')}`
				);
				p.ellipse(tunnel.centerX, tunnel.centerY, radiusX * 0.22, radiusY * 0.22);
			}

			for (const phaseshift of phaseshifts) {
				if (
					getWeaponModuleByInstanceId(phaseshift.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'phaseshift',
						centerX: phaseshift.centerX,
						centerY: phaseshift.centerY,
						zoneWidth: phaseshift.zoneWidth,
						halfHeight: phaseshift.halfHeight,
						color: phaseshift.color
					})
				) {
					continue;
				}

				p.noStroke();
				p.fill(`${phaseshift.color}22`);
				p.rect(
					phaseshift.centerX - phaseshift.zoneWidth * 0.5,
					phaseshift.centerY - phaseshift.halfHeight,
					phaseshift.zoneWidth,
					phaseshift.halfHeight * 2,
					8
				);

				p.stroke(phaseshift.color);
				p.strokeWeight(4);
				p.line(
					phaseshift.centerX,
					phaseshift.centerY - phaseshift.halfHeight,
					phaseshift.centerX,
					phaseshift.centerY + phaseshift.halfHeight
				);
			}

			for (const runeCast of runeCasts) {
				getWeaponModuleByInstanceId(runeCast.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'rune-cast',
					variant: runeCast.variant,
					centerX: runeCast.centerX,
					centerY: runeCast.centerY,
					runeSize: runeCast.runeSize,
					color: runeCast.color,
					glow: runeCast.glow,
					age: runeCast.age,
					duration: runeCast.duration
				});
			}

			for (const sunRune of sunRunes) {
				getWeaponModuleByInstanceId(sunRune.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'sun-rune',
					centerX: sunRune.centerX,
					centerY: sunRune.centerY,
					radius: sunRune.radius,
					impactSize: sunRune.impactSize,
					color: sunRune.color,
					glow: sunRune.glow,
					age: sunRune.age,
					duration: sunRune.duration
				});
			}

			for (const healingRune of healingRunes) {
				getWeaponModuleByInstanceId(healingRune.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'healing-rune',
					centerX: healingRune.centerX,
					centerY: healingRune.centerY,
					radius: healingRune.radius,
					color: healingRune.color,
					glow: healingRune.glow,
					age: healingRune.age,
					duration: healingRune.duration
				});
			}

			for (const bindingRune of bindingRunes) {
				getWeaponModuleByInstanceId(bindingRune.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'binding-rune',
					centerX: bindingRune.centerX,
					centerY: bindingRune.centerY,
					radius: bindingRune.radius,
					impactSize: bindingRune.impactSize,
					color: bindingRune.color,
					glow: bindingRune.glow,
					age: bindingRune.age,
					duration: bindingRune.duration
				});
			}

			for (const rune of sunbrandRunes) {
				getWeaponModuleByInstanceId(rune.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'sunbrand-rune',
					centerX: rune.centerX,
					centerY: rune.centerY,
					radius: rune.radius,
					impactSize: rune.impactSize,
					color: rune.color,
					glow: rune.glow,
					age: rune.age,
					duration: rune.duration
				});
			}

			for (const slowingRune of slowingRunes) {
				getWeaponModuleByInstanceId(slowingRune.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'slowing-rune',
					centerX: slowingRune.centerX,
					centerY: slowingRune.centerY,
					radius: slowingRune.radius,
					impactSize: slowingRune.impactSize,
					color: slowingRune.color,
					glow: slowingRune.glow,
					age: slowingRune.age,
					duration: slowingRune.duration
				});
			}

			for (const judgment of judgmentRunes) {
				getWeaponModuleByInstanceId(judgment.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'judgment-rune-sun',
					centerX,
					centerY,
					orbitRadius: judgment.orbitRadius,
					orbitAngle: judgment.orbitAngle,
					sunRadius: judgment.sunRadius,
					damageRadius: judgment.damageRadius,
					age: judgment.age,
					duration: judgment.duration,
					color: judgment.color,
					glow: judgment.glow
				});
			}

			for (const ground of burningGrounds) {
				if (
					getWeaponModuleByInstanceId(ground.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'burning-ground',
						centerX: ground.centerX,
						centerY: ground.centerY,
						radius: ground.radius,
						impactSize: ground.impactSize,
						color: ground.color,
						glow: ground.glow,
						age: ground.age,
						duration: ground.duration
					})
				) {
					continue;
				}

				const lifeRatio = 1 - ground.age / Math.max(0.0001, ground.duration);
				const emberRadius = ground.radius * (0.45 + lifeRatio * 0.08);
				const flicker = 0.92 + Math.sin(ground.age * 13) * 0.06;

				if (ground.glow) {
					p.noStroke();
					p.fill(`${ground.color}18`);
					p.circle(ground.centerX, ground.centerY, ground.radius * 2.8 * flicker);
					p.fill('#ff6a0030');
					p.circle(ground.centerX, ground.centerY, ground.radius * 2.35 * flicker);
				}

				p.noStroke();
				p.fill('#1c0906d0');
				p.circle(ground.centerX, ground.centerY, ground.radius * 2.08);
				p.fill('#5a180acc');
				p.circle(ground.centerX, ground.centerY, ground.radius * 1.92);

				for (let lobeIndex = 0; lobeIndex < 6; lobeIndex += 1) {
					const angle = (lobeIndex / 6) * p.TWO_PI + ground.age * (0.4 + lobeIndex * 0.08);
					const orbit = ground.radius * (0.14 + (lobeIndex % 3) * 0.08);
					const lobeX = ground.centerX + Math.cos(angle) * orbit;
					const lobeY = ground.centerY + Math.sin(angle) * orbit * 0.78;
					p.fill(lobeIndex % 2 === 0 ? '#ff5f1f66' : '#ff9d2f55');
					p.ellipse(lobeX, lobeY, ground.radius * 1.18, ground.radius * 0.9);
				}

				p.fill('#ff6a1fcc');
				p.circle(ground.centerX, ground.centerY, emberRadius * 2.02 * flicker);
				p.fill('#ffb347b8');
				p.circle(ground.centerX, ground.centerY, ground.radius * 0.92 * flicker);
				p.fill('#fff0a0aa');
				p.circle(ground.centerX, ground.centerY, ground.radius * 0.42 * flicker);

				for (let flameIndex = 0; flameIndex < 8; flameIndex += 1) {
					const angle = (flameIndex / 8) * p.TWO_PI + ground.age * (1.8 + flameIndex * 0.07);
					const orbit = ground.radius * (0.1 + (flameIndex % 4) * 0.1);
					const flameX = ground.centerX + Math.cos(angle) * orbit;
					const flameY = ground.centerY + Math.sin(angle) * orbit * 0.7;
					p.fill(flameIndex % 2 === 0 ? '#ffd166bb' : '#ff8c42aa');
					p.ellipse(
						flameX,
						flameY,
						Math.max(6, ground.impactSize * 0.5),
						Math.max(10, ground.impactSize * 0.95)
					);
				}

				for (let smokeIndex = 0; smokeIndex < 4; smokeIndex += 1) {
					const angle = (smokeIndex / 4) * p.TWO_PI + ground.age * (0.5 + smokeIndex * 0.04);
					const orbit = ground.radius * (0.42 + smokeIndex * 0.08);
					const smokeX = ground.centerX + Math.cos(angle) * orbit * 0.75;
					const smokeY = ground.centerY + Math.sin(angle) * orbit * 0.55;
					p.fill('#3d3d3d44');
					p.circle(smokeX, smokeY, Math.max(8, ground.impactSize * 0.58));
				}

				for (let emberIndex = 0; emberIndex < 7; emberIndex += 1) {
					const angle = (emberIndex / 7) * p.TWO_PI + ground.age * (1.6 + emberIndex * 0.12);
					const orbit = Math.max(ground.impactSize, ground.radius * (0.16 + emberIndex * 0.06));
					const emberX = ground.centerX + Math.cos(angle) * orbit * 0.55;
					const emberY = ground.centerY + Math.sin(angle) * orbit * 0.38;
					p.fill(emberIndex % 2 === 0 ? '#fff3b088' : '#ff7a2a88');
					p.circle(emberX, emberY, Math.max(3, ground.impactSize * 0.22));
				}
			}

			for (const mine of perimeterMines) {
				if (
					getWeaponModuleByInstanceId(mine.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'perimeter-mine',
						centerX: mine.centerX,
						centerY: mine.centerY,
						triggerRadius: mine.triggerRadius,
						blastRadius: mine.blastRadius,
						markerSize: mine.markerSize,
						color: mine.color,
						glow: mine.glow,
						age: mine.age,
						hasDetonated: mine.hasDetonated,
						explosionFlash: mine.explosionFlash
					})
				) {
					continue;
				}
			}

			for (const turret of turretMines) {
				if (
					getWeaponModuleByInstanceId(turret.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'turret-mine',
						centerX: turret.centerX,
						centerY: turret.centerY,
						markerSize: turret.markerSize,
						barrelAngle: turret.barrelAngle,
						color: turret.color,
						glow: turret.glow,
						age: turret.age,
						fireFlash: turret.fireFlash
					})
				) {
					continue;
				}
			}

			for (const turret of mineShieldTurrets) {
				if (
					getUtilityModuleByInstanceId(turret.sourceUtilityInstanceId).renderArenaEffect(p, {
						kind: 'mine-shield-turret',
						arenaCenterX: centerX,
						arenaCenterY: centerY,
						centerX: turret.centerX,
						centerY: turret.centerY,
						markerSize: turret.markerSize,
						color: turret.color,
						glow: turret.glow,
						age: turret.age,
						beamPulse: turret.beamPulse,
						shieldRatioFromMineDamage: turret.shieldRatioFromMineDamage
					})
				) {
					continue;
				}
			}

			for (const ward of getActiveStoneWards()) {
				if (
					getUtilityModuleByInstanceId(ward.sourceUtilityInstanceId).renderArenaEffect(p, {
						kind: 'stone-ward',
						arenaCenterX: centerX,
						arenaCenterY: centerY,
						radius: ward.radius,
						lineWidth: ward.lineWidth,
						color: ward.color,
						glow: ward.glow,
						pulse: ward.pulse,
						shieldRatio: ward.maxShield > 0 ? ward.shield / ward.maxShield : 1
					})
				) {
					continue;
				}
			}

			if (
				activeVanishRune &&
				getUtilityModuleByInstanceId(activeVanishRune.sourceUtilityInstanceId).renderArenaEffect(
					p,
					{
						kind: 'vanish-rune',
						arenaCenterX: centerX,
						arenaCenterY: centerY,
						radius: activeVanishRune.radius,
						age: activeVanishRune.age,
						duration: activeVanishRune.duration,
						pulse: activeVanishRune.pulse,
						color: activeVanishRune.color,
						glow: activeVanishRune.glow
					}
				)
			) {
				// effect handled by the vanish utility module
			}

			for (const bomb of delayedBombs) {
				if (
					getWeaponModuleByInstanceId(bomb.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'delayed-bomb',
						centerX: bomb.centerX,
						centerY: bomb.centerY,
						radius: bomb.radius,
						markerSize: bomb.markerSize,
						color: bomb.color,
						glow: bomb.glow,
						age: bomb.age,
						detonationDelay: bomb.detonationDelay,
						hasDetonated: bomb.hasDetonated,
						explosionFlash: bomb.explosionFlash
					})
				) {
					continue;
				}

				if (!bomb.hasDetonated) {
					const progress = Math.min(1, bomb.age / Math.max(0.0001, bomb.detonationDelay));
					const pulse = 1 + Math.sin(progress * Math.PI * 6) * 0.08;

					if (bomb.glow) {
						p.noStroke();
						p.fill(`${bomb.color}24`);
						p.circle(bomb.centerX, bomb.centerY, bomb.radius * 1.9 * pulse);
					}

					p.noFill();
					p.stroke(`${bomb.color}88`);
					p.strokeWeight(2);
					p.circle(bomb.centerX, bomb.centerY, bomb.radius * 2);

					p.noStroke();
					p.fill('#111111ee');
					p.circle(bomb.centerX, bomb.centerY, bomb.markerSize * 1.2);
					p.fill(bomb.color);
					p.circle(bomb.centerX, bomb.centerY, bomb.markerSize);
					p.fill('#fff3b0cc');
					p.circle(bomb.centerX, bomb.centerY - bomb.markerSize * 0.12, bomb.markerSize * 0.28);
					continue;
				}

				const flashProgress = 1 - bomb.explosionFlash / 0.22;
				const flashRadius = bomb.radius * (0.6 + flashProgress * 0.95);

				p.noStroke();
				p.fill('#fff3b088');
				p.circle(bomb.centerX, bomb.centerY, flashRadius * 2.2);
				p.fill(`${bomb.color}88`);
				p.circle(bomb.centerX, bomb.centerY, flashRadius * 1.75);
				p.fill('#ffffffaa');
				p.circle(bomb.centerX, bomb.centerY, flashRadius * 0.95);
			}

			for (const burst of hemorrhageBursts) {
				const progress = Math.min(1, burst.age / Math.max(0.0001, burst.duration));
				const alphaHex = Math.round((1 - progress) * 210)
					.toString(16)
					.padStart(2, '0');
				const markerAlphaHex = Math.round((1 - Math.min(1, progress * 1.35)) * 255)
					.toString(16)
					.padStart(2, '0');
				const headX = p.lerp(burst.startX, burst.endX, progress);
				const headY = p.lerp(burst.startY, burst.endY, progress);
				const tailProgress = Math.max(0, progress - 0.22) / 0.78;
				const tailX = p.lerp(burst.startX, burst.endX, tailProgress);
				const tailY = p.lerp(burst.startY, burst.endY, tailProgress);
				const angle = Math.atan2(burst.endY - burst.startY, burst.endX - burst.startX);
				const directionX = Math.cos(angle);
				const directionY = Math.sin(angle);
				const normalX = -Math.sin(angle);
				const normalY = Math.cos(angle);
				const bladeLength = 16;
				const bladeWidth = 4.8;
				const handleLength = 7;
				const handleWidth = 2.6;
				const guardWidth = 5.4;
				const markerSize = 9 + (1 - progress) * 4;

				p.stroke(`#7f1d1d${markerAlphaHex}`);
				p.strokeWeight(3.4 * (1 - progress * 0.35));
				p.line(
					burst.startX - markerSize,
					burst.startY - markerSize,
					burst.startX + markerSize,
					burst.startY + markerSize
				);
				p.line(
					burst.startX + markerSize,
					burst.startY - markerSize,
					burst.startX - markerSize,
					burst.startY + markerSize
				);
				p.stroke(`#ef4444${markerAlphaHex}`);
				p.strokeWeight(1.5 * (1 - progress * 0.25));
				p.line(
					burst.startX - markerSize,
					burst.startY - markerSize,
					burst.startX + markerSize,
					burst.startY + markerSize
				);
				p.line(
					burst.startX + markerSize,
					burst.startY - markerSize,
					burst.startX - markerSize,
					burst.startY + markerSize
				);

				p.noFill();
				p.stroke(`${burst.color}${alphaHex}`);
				p.strokeWeight(6 * (1 - progress * 0.45));
				p.line(tailX, tailY, headX, headY);
				p.stroke(`#fecaca${alphaHex}`);
				p.strokeWeight(2.2);
				p.line(tailX, tailY, headX, headY);

				p.noStroke();
				p.fill(`#7f1d1d${alphaHex}`);
				p.quad(
					headX + directionX * bladeLength,
					headY + directionY * bladeLength,
					headX - directionX * (bladeLength * 0.12) + normalX * bladeWidth,
					headY - directionY * (bladeLength * 0.12) + normalY * bladeWidth,
					headX - directionX * (bladeLength + handleLength * 0.35) + normalX * bladeWidth * 0.22,
					headY - directionY * (bladeLength + handleLength * 0.35) + normalY * bladeWidth * 0.22,
					headX - directionX * (bladeLength + handleLength * 0.35) - normalX * bladeWidth * 0.22,
					headY - directionY * (bladeLength + handleLength * 0.35) - normalY * bladeWidth * 0.22
				);
				p.fill(`#fee2e2${alphaHex}`);
				p.quad(
					headX + directionX * bladeLength * 0.8,
					headY + directionY * bladeLength * 0.8,
					headX - directionX * (bladeLength * 0.02) + normalX * bladeWidth * 0.46,
					headY - directionY * (bladeLength * 0.02) + normalY * bladeWidth * 0.46,
					headX - directionX * (bladeLength * 0.88) + normalX * bladeWidth * 0.08,
					headY - directionY * (bladeLength * 0.88) + normalY * bladeWidth * 0.08,
					headX - directionX * (bladeLength * 0.88) - normalX * bladeWidth * 0.08,
					headY - directionY * (bladeLength * 0.88) - normalY * bladeWidth * 0.08
				);
				p.fill(`#fca5a5${alphaHex}`);
				p.quad(
					headX - directionX * (bladeLength * 0.98) + normalX * guardWidth,
					headY - directionY * (bladeLength * 0.98) + normalY * guardWidth,
					headX - directionX * (bladeLength * 1.08) + normalX * guardWidth,
					headY - directionY * (bladeLength * 1.08) + normalY * guardWidth,
					headX - directionX * (bladeLength * 1.08) - normalX * guardWidth,
					headY - directionY * (bladeLength * 1.08) - normalY * guardWidth,
					headX - directionX * (bladeLength * 0.98) - normalX * guardWidth,
					headY - directionY * (bladeLength * 0.98) - normalY * guardWidth
				);
				p.fill(`#450a0a${alphaHex}`);
				p.quad(
					headX - directionX * (bladeLength * 1.08) + normalX * handleWidth,
					headY - directionY * (bladeLength * 1.08) + normalY * handleWidth,
					headX - directionX * (bladeLength * 1.08 + handleLength) + normalX * handleWidth,
					headY - directionY * (bladeLength * 1.08 + handleLength) + normalY * handleWidth,
					headX - directionX * (bladeLength * 1.08 + handleLength) - normalX * handleWidth,
					headY - directionY * (bladeLength * 1.08 + handleLength) - normalY * handleWidth,
					headX - directionX * (bladeLength * 1.08) - normalX * handleWidth,
					headY - directionY * (bladeLength * 1.08) - normalY * handleWidth
				);

				p.noStroke();
			}

			for (const segment of knifeTrailSegments) {
				const progress = Math.min(1, segment.age / Math.max(0.0001, segment.duration));
				const alphaHex = Math.round((1 - progress) * 120)
					.toString(16)
					.padStart(2, '0');

				p.noFill();
				p.stroke(`${segment.color}${alphaHex}`);
				p.strokeWeight(1.1 * (1 - progress * 0.2));
				p.line(segment.startX, segment.startY, segment.endX, segment.endY);
			}

			for (const sweep of laserSweeps) {
				if (
					getWeaponModuleByInstanceId(sweep.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'laser-sweep',
						arenaCenterX: centerX,
						arenaCenterY: centerY,
						angle: sweep.angle,
						beamLength: sweep.beamLength,
						beamWidth: sweep.beamWidth,
						color: sweep.color,
						glow: sweep.glow
					})
				) {
					continue;
				}

				const beamX = centerX + Math.cos(sweep.angle) * sweep.beamLength;
				const beamY = centerY + Math.sin(sweep.angle) * sweep.beamLength;

				if (sweep.glow) {
					p.stroke(`${sweep.color}44`);
					p.strokeWeight(sweep.beamWidth * 1.85);
					p.line(centerX, centerY, beamX, beamY);
				}

				p.stroke(sweep.color);
				p.strokeWeight(sweep.beamWidth);
				p.line(centerX, centerY, beamX, beamY);

				p.fill(sweep.color);
				p.noStroke();
				p.circle(beamX, beamY, sweep.beamWidth * 0.9);
			}

			if (hasActiveAscender && !hasActiveVanishRune()) {
				for (const peaShooter of ascendedPeaShooters) {
					const target = getEnemyWeaponTarget(peaShooter.targeting);

					if (!target) {
						continue;
					}

					const beamColor = ascenderWeapon?.definition.projectileVisual.color ?? '#7dd3fc';
					const glow = ascenderWeapon?.definition.projectileVisual.glow ?? true;
					const beamWidth = 10 + Math.sin(pixlAuraClock * 8 + peaShooter.placementX) * 0.8;
					const deltaX = target.x - centerX;
					const deltaY = target.y - centerY;
					const distance = Math.hypot(deltaX, deltaY) || 1;
					const beamLength = Math.max(arenaRadius * 2.6, Math.hypot(p.width, p.height));
					const beamEndX = centerX + (deltaX / distance) * beamLength;
					const beamEndY = centerY + (deltaY / distance) * beamLength;

					if (glow) {
						p.stroke(`${beamColor}44`);
						p.strokeWeight(beamWidth * 2.1);
						p.line(centerX, centerY, beamEndX, beamEndY);
					}

					p.stroke(beamColor);
					p.strokeWeight(beamWidth);
					p.line(centerX, centerY, beamEndX, beamEndY);

					p.noStroke();
					p.fill('#e0f2fecc');
					p.circle(target.x, target.y, beamWidth * 1.25);
					p.fill(beamColor);
					p.circle(target.x, target.y, beamWidth * 0.72);
				}
			}

			for (const projectile of projectiles) {
				projectile.animation.age = projectile.age;
				projectile.animation.directionX = projectile.directionX;
				projectile.animation.directionY = projectile.directionY;
				projectile.animation.lastX = projectile.lastX;
				projectile.animation.lastY = projectile.lastY;

				getWeaponModule(projectile.weaponId).renderProjectile(p, {
					weaponId: projectile.weaponId,
					x: projectile.x,
					y: projectile.y,
					originX: projectile.originX,
					originY: projectile.originY,
					visual: projectile.visual,
					animation: projectile.animation
				});
			}

			for (const projectile of enemyProjectiles) {
				p.noStroke();
				p.fill(`${projectile.color}44`);
				p.circle(projectile.x, projectile.y, projectile.size * 2.2);
				p.fill(projectile.color);
				p.circle(projectile.x, projectile.y, projectile.size);
			}

			for (const beam of enemyBeams) {
				const sourceEnemy = enemies.find((enemy) => enemy.id === beam.sourceEnemyId);

				if (!sourceEnemy) {
					continue;
				}

				const pulse = 0.88 + Math.sin(beam.age * 14) * 0.12;
				const alphaHex = Math.round((1 - beam.age / Math.max(0.0001, beam.duration)) * 216)
					.toString(16)
					.padStart(2, '0');

				if (beam.glow) {
					p.stroke(`${beam.color}28`);
					p.strokeWeight(beam.width * 1.8 * pulse);
					p.line(sourceEnemy.x, sourceEnemy.y, centerX, centerY);
				}

				p.stroke(`${beam.color}${alphaHex}`);
				p.strokeWeight(beam.width * pulse);
				p.line(sourceEnemy.x, sourceEnemy.y, centerX, centerY);
				p.noStroke();
				p.fill(`${beam.color}${alphaHex}`);
				p.circle(centerX, centerY, beam.width * 0.9);
			}

			for (const lock of sniperLocks) {
				if (
					getWeaponModuleByInstanceId(lock.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'sniper-lock',
						arenaCenterX: centerX,
						arenaCenterY: centerY,
						targetX: lock.targetX,
						targetY: lock.targetY,
						age: lock.age,
						chargeDuration: lock.chargeDuration,
						lineWidth: lock.lineWidth,
						color: lock.color,
						glow: lock.glow
					})
				) {
					continue;
				}

				const progress = Math.min(1, lock.age / lock.chargeDuration);
				const pulseWidth = lock.lineWidth + Math.sin(progress * Math.PI * 6) * 0.35;

				if (lock.glow) {
					p.stroke(`${lock.color}33`);
					p.strokeWeight(lock.lineWidth * 4);
					p.line(centerX, centerY, lock.targetX, lock.targetY);
				}

				p.stroke(lock.color);
				p.strokeWeight(Math.max(1.2, pulseWidth));
				p.line(centerX, centerY, lock.targetX, lock.targetY);

				p.noFill();
				p.stroke(`${lock.color}cc`);
				p.strokeWeight(1.4);
				p.circle(lock.targetX, lock.targetY, 10 + progress * 8);
				p.circle(lock.targetX, lock.targetY, 18 + Math.sin(progress * Math.PI * 4) * 3);
			}

			for (const burst of sniperChainBursts) {
				if (
					getWeaponModuleByInstanceId(burst.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'sniper-chain-burst',
						segments: burst.segments,
						lineWidth: burst.lineWidth,
						color: burst.color,
						glow: burst.glow,
						age: burst.age,
						duration: burst.duration
					})
				) {
					continue;
				}

				const fade = 1 - burst.age / Math.max(0.0001, burst.duration);
				const alpha = Math.round(255 * fade)
					.toString(16)
					.padStart(2, '0');
				const glowAlpha = Math.round(110 * fade)
					.toString(16)
					.padStart(2, '0');

				for (const segment of burst.segments) {
					if (burst.glow) {
						p.stroke(`${burst.color}${glowAlpha}`);
						p.strokeWeight(burst.lineWidth * 3.4);
						p.line(segment.from.x, segment.from.y, segment.to.x, segment.to.y);
					}

					p.stroke(`${burst.color}${alpha}`);
					p.strokeWeight(Math.max(1.5, burst.lineWidth * 1.35));
					p.line(segment.from.x, segment.from.y, segment.to.x, segment.to.y);

					p.noStroke();
					p.fill(`#fff1bf${alpha}`);
					p.circle(segment.to.x, segment.to.y, 6 + fade * 6);
				}
			}

			for (const burst of needleBursts) {
				if (
					getWeaponModuleByInstanceId(burst.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'needle-burst',
						arenaCenterX: centerX,
						arenaCenterY: centerY,
						targetX: burst.targetX,
						targetY: burst.targetY,
						maxReach: burst.maxReach,
						lineWidth: burst.lineWidth,
						color: burst.color,
						glow: burst.glow,
						age: burst.age,
						duration: burst.duration
					})
				) {
					continue;
				}

				const progress = Math.min(1, burst.age / burst.duration);
				const reachFactor = Math.sin(progress * Math.PI);
				const dx = burst.targetX - centerX;
				const dy = burst.targetY - centerY;
				const distance = Math.hypot(dx, dy) || 1;
				const clampedReach = Math.min(distance, burst.maxReach) * reachFactor;
				const directionX = dx / distance;
				const directionY = dy / distance;
				const tipX = centerX + directionX * clampedReach;
				const tipY = centerY + directionY * clampedReach;

				if (burst.glow) {
					p.stroke(`${burst.color}44`);
					p.strokeWeight(burst.lineWidth * 2.8);
					p.line(centerX, centerY, tipX, tipY);
				}

				p.stroke(burst.color);
				p.strokeWeight(burst.lineWidth);
				p.line(centerX, centerY, tipX, tipY);

				p.push();
				p.translate(tipX, tipY);
				p.rotate(Math.atan2(directionY, directionX));
				p.noStroke();
				p.fill(burst.color);
				p.triangle(0, 0, -8, 2.4, -8, -2.4);
				p.pop();
			}

			for (const strike of executionLatticeStrikes) {
				if (
					getWeaponModuleByInstanceId(strike.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'execution-lattice-strike',
						targetX: strike.targetX,
						targetY: strike.targetY,
						startY: strike.startY,
						markerSize: strike.markerSize,
						color: strike.color,
						glow: strike.glow,
						age: strike.age,
						dropDuration: strike.dropDuration,
						startDelay: strike.startDelay
					})
				) {
					continue;
				}

				const progress = Math.min(
					1,
					Math.max(0, (strike.age - strike.startDelay) / strike.dropDuration)
				);
				const currentY = strike.startY + (strike.targetY - strike.startY) * progress;
				const size = strike.markerSize;

				if (strike.glow) {
					p.noStroke();
					p.fill(`${strike.color}33`);
					p.circle(strike.targetX, currentY, size * 3.2);
				}

				p.push();
				p.translate(strike.targetX, currentY);
				p.noStroke();
				p.fill(strike.color);
				p.triangle(0, size, -size * 0.72, -size * 0.64, size * 0.72, -size * 0.64);
				p.pop();

				if (progress >= 1) {
					p.noFill();
					p.stroke(`${strike.color}aa`);
					p.strokeWeight(2);
					p.circle(strike.targetX, strike.targetY, size * 2.2);
				}
			}

			for (const burst of forkLightningBursts) {
				if (
					getWeaponModuleByInstanceId(burst.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'fork-lightning',
						segments: burst.segments.map((segment) => ({
							from: segment.from,
							to: segment.to,
							startDelay: segment.startDelay
						})),
						branchWidth: burst.branchWidth,
						color: burst.color,
						glow: burst.glow,
						age: burst.age,
						duration: burst.duration,
						easeInQuad
					})
				) {
					continue;
				}

				for (const segment of burst.segments) {
					const progress = easeInQuad((burst.age - segment.startDelay) / burst.duration);

					if (progress <= 0) {
						continue;
					}

					const from = segment.from;
					const to = segment.to;
					const dx = to.x - from.x;
					const dy = to.y - from.y;
					const distance = Math.hypot(dx, dy) || 1;
					const directionX = dx / distance;
					const directionY = dy / distance;
					const perpendicularX = -directionY;
					const perpendicularY = directionX;
					const zigzagAmplitude = Math.min(18, distance * 0.18);
					const zigzagPoints = [
						{ t: 0, x: from.x, y: from.y },
						{
							t: 0.28,
							x: from.x + dx * 0.28 + perpendicularX * zigzagAmplitude,
							y: from.y + dy * 0.28 + perpendicularY * zigzagAmplitude
						},
						{
							t: 0.56,
							x: from.x + dx * 0.56 - perpendicularX * zigzagAmplitude,
							y: from.y + dy * 0.56 - perpendicularY * zigzagAmplitude
						},
						{
							t: 0.8,
							x: from.x + dx * 0.8 + perpendicularX * (zigzagAmplitude * 0.6),
							y: from.y + dy * 0.8 + perpendicularY * (zigzagAmplitude * 0.6)
						},
						{ t: 1, x: to.x, y: to.y }
					];
					const visiblePoints = [zigzagPoints[0]];

					for (let pointIndex = 1; pointIndex < zigzagPoints.length; pointIndex += 1) {
						const previous = zigzagPoints[pointIndex - 1];
						const current = zigzagPoints[pointIndex];

						if (progress >= current.t) {
							visiblePoints.push(current);
							continue;
						}

						const span = Math.max(0.0001, current.t - previous.t);
						const localProgress = Math.max(0, Math.min(1, (progress - previous.t) / span));
						visiblePoints.push({
							t: progress,
							x: previous.x + (current.x - previous.x) * localProgress,
							y: previous.y + (current.y - previous.y) * localProgress
						});
						break;
					}

					if (burst.glow) {
						p.stroke(`${burst.color}33`);
						p.strokeWeight(burst.branchWidth * 2.2);
						for (let pointIndex = 1; pointIndex < visiblePoints.length; pointIndex += 1) {
							const previous = visiblePoints[pointIndex - 1];
							const current = visiblePoints[pointIndex];
							p.line(previous.x, previous.y, current.x, current.y);
						}
					}

					p.stroke(burst.color);
					p.strokeWeight(burst.branchWidth);
					for (let pointIndex = 1; pointIndex < visiblePoints.length; pointIndex += 1) {
						const previous = visiblePoints[pointIndex - 1];
						const current = visiblePoints[pointIndex];
						p.line(previous.x, previous.y, current.x, current.y);
					}
				}
			}

			for (const spike of iceSpikes) {
				if (
					getWeaponModuleByInstanceId(spike.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'ice-spike',
						targetX: spike.targetX,
						targetY: spike.targetY,
						startY: spike.startY,
						endY: spike.endY,
						age: spike.age,
						startDelay: spike.startDelay,
						fallDuration: spike.fallDuration,
						color: spike.color,
						glow: spike.glow,
						driftAmplitude: spike.driftAmplitude,
						driftSpeed: spike.driftSpeed,
						driftPhase: spike.driftPhase,
						size: spike.size
					})
				) {
					continue;
				}

				const progress = Math.max(0, (spike.age - spike.startDelay) / spike.fallDuration);
				const currentY = spike.startY + (spike.endY - spike.startY) * progress;
				const currentX =
					spike.targetX +
					Math.sin(spike.driftPhase + spike.age * spike.driftSpeed) * spike.driftAmplitude;
				const fadeOut =
					currentY >= spike.targetY ? Math.max(0, 1 - (currentY - spike.targetY) / 120) : 1;
				const alphaHex = Math.round(255 * fadeOut)
					.toString(16)
					.padStart(2, '0');

				if (spike.glow) {
					p.noStroke();
					p.fill(
						`${spike.color}${Math.round(132 * fadeOut)
							.toString(16)
							.padStart(2, '0')}`
					);
					p.circle(currentX, currentY, spike.size * 3.8);
				}

				p.push();
				p.translate(currentX, currentY);
				p.rotate(spike.driftPhase + spike.age * 1.8);
				p.stroke(`${spike.color}${alphaHex}`);
				p.strokeWeight(1.8);
				const half = spike.size * 0.5;
				p.line(-half * 0.82, 0, half * 0.82, 0);
				p.line(0, -half * 0.82, 0, half * 0.82);
				p.line(-half * 0.58, -half * 0.58, half * 0.58, half * 0.58);
				p.line(-half * 0.58, half * 0.58, half * 0.58, -half * 0.58);
				p.noStroke();
				p.fill(
					`${spike.color}${Math.round(255 * fadeOut)
						.toString(16)
						.padStart(2, '0')}`
				);
				p.circle(0, 0, spike.size * 1.1);
				p.pop();
			}

			for (const storm of blizzardStorms) {
				if (
					getWeaponModuleByInstanceId(storm.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'blizzard-storm',
						age: storm.age,
						duration: storm.duration,
						color: storm.color,
						glow: storm.glow,
						canvasWidth: p.width,
						canvasHeight: p.height
					})
				) {
					continue;
				}

				const progress = Math.min(1, storm.age / Math.max(0.0001, storm.duration));
				const alphaHex = Math.round((1 - progress) * 110)
					.toString(16)
					.padStart(2, '0');
				const sweepY = p.lerp(-40, p.height + 40, progress);

				if (storm.glow) {
					p.noStroke();
					p.fill(`${storm.color}14`);
					p.rect(0, 0, p.width, p.height);
				}

				p.stroke(`${storm.color}${alphaHex}`);
				p.strokeWeight(2);
				for (let stripeIndex = 0; stripeIndex < 10; stripeIndex += 1) {
					const stripeX = (stripeIndex / 10) * p.width + Math.sin(storm.age * 4 + stripeIndex) * 16;
					p.line(stripeX, sweepY - 120, stripeX - 24, sweepY + 24);
				}

				p.noFill();
				p.stroke(`#dff6ff${alphaHex}`);
				p.strokeWeight(1.5);
				p.rect(10, 10, p.width - 20, p.height - 20, 18);
			}

			for (const tendril of voidTendrils) {
				if (
					getWeaponModuleByInstanceId(tendril.sourceWeaponInstanceId).renderArenaEffect(p, {
						kind: 'void-tendril',
						arenaCenterX: centerX,
						arenaCenterY: centerY,
						targetX: tendril.targetX,
						targetY: tendril.targetY,
						age: tendril.age,
						duration: tendril.latchDuration,
						color: tendril.color,
						glow: tendril.glow,
						easeInQuad
					})
				) {
					continue;
				}

				const normalizedAge = Math.max(0, Math.min(1, tendril.age / tendril.latchDuration));
				const progress = easeInQuad(normalizedAge);
				const reachX = centerX + (tendril.targetX - centerX) * progress;
				const reachY = centerY + (tendril.targetY - centerY) * progress;
				const angle = Math.atan2(reachY - centerY, reachX - centerX);
				const distance = Math.hypot(reachX - centerX, reachY - centerY) || 1;
				const directionX = (reachX - centerX) / distance;
				const directionY = (reachY - centerY) / distance;
				const perpendicularX = -directionY;
				const perpendicularY = directionX;
				const snakeSegments = Math.max(4, Math.ceil(distance / 22));
				const snakeAmplitude = Math.min(12, 2 + distance * 0.045);
				const snakePoints = Array.from({ length: snakeSegments + 1 }, (_, index) => {
					const t = index / snakeSegments;
					const baseFadeIn = Math.min(1, t * 2.4);
					const tipFadeOut = 1 - t * 0.2;
					const wave =
						Math.sin(t * Math.PI * 2.5 + tendril.age * 12) *
						snakeAmplitude *
						baseFadeIn *
						tipFadeOut;
					return {
						x: centerX + directionX * distance * t + perpendicularX * wave,
						y: centerY + directionY * distance * t + perpendicularY * wave
					};
				});
				const clawLength = 15;
				const clawSpread = 0.62;
				const baseOffset = 6;
				const clawPitch = Math.sin(normalizedAge * Math.PI * 1.3) * 0.22;
				const clawBaseX = reachX - Math.cos(angle) * baseOffset;
				const clawBaseY = reachY - Math.sin(angle) * baseOffset;

				if (tendril.glow) {
					p.stroke(`${tendril.color}33`);
					p.strokeWeight(8);
					for (let pointIndex = 1; pointIndex < snakePoints.length; pointIndex += 1) {
						const previous = snakePoints[pointIndex - 1];
						const current = snakePoints[pointIndex];
						p.line(previous.x, previous.y, current.x, current.y);
					}
				}

				p.stroke(tendril.color);
				p.strokeWeight(2.2);
				for (let pointIndex = 1; pointIndex < snakePoints.length; pointIndex += 1) {
					const previous = snakePoints[pointIndex - 1];
					const current = snakePoints[pointIndex];
					p.line(previous.x, previous.y, current.x, current.y);
				}

				for (const [offset, lengthMultiplier] of [
					[-clawSpread, 1],
					[0, 0.78],
					[clawSpread, 1]
				] as const) {
					const clawAngle = angle + offset + clawPitch * (offset === 0 ? -0.6 : 1);
					const clawTipX = reachX + Math.cos(clawAngle) * clawLength * lengthMultiplier;
					const clawTipY = reachY + Math.sin(clawAngle) * clawLength * lengthMultiplier;
					p.line(clawBaseX, clawBaseY, clawTipX, clawTipY);
				}
			}

			for (const wrath of naturesWraths) {
				getWeaponModuleByInstanceId(wrath.sourceWeaponInstanceId).renderArenaEffect(p, {
					kind: 'natures-wrath',
					arenaCenterX: centerX,
					arenaCenterY: centerY,
					targetX: wrath.targetX,
					targetY: wrath.targetY,
					age: wrath.age,
					duration: wrath.latchDuration,
					pulseInterval: wrath.pulseInterval,
					color: wrath.color,
					glow: wrath.glow,
					easeInQuad
				});
			}

			p.pop();
		};

		const drawEnemies = () => {
			const drawEnemyShape = (enemy: EnemyState, visual: (typeof ENEMY_VISUALS)[GlitchKind]) => {
				if (visual.shape === 'square') {
					p.rectMode(p.CENTER);
					p.square(enemy.x, enemy.y, visual.radius * 1.8);
					return;
				}

				if (visual.shape === 'diamond') {
					p.push();
					p.translate(enemy.x, enemy.y);
					p.rotate(Math.PI / 4);
					p.rectMode(p.CENTER);
					p.square(0, 0, visual.radius * 2.1);
					p.pop();
					return;
				}

				if (visual.shape === 'triangle') {
					p.triangle(
						enemy.x,
						enemy.y - visual.radius * 1.25,
						enemy.x - visual.radius,
						enemy.y + visual.radius,
						enemy.x + visual.radius,
						enemy.y + visual.radius
					);
					return;
				}

				p.circle(enemy.x, enemy.y, visual.radius * 2);
			};

			const clipEnemyShape = (
				enemy: EnemyState,
				visual: (typeof ENEMY_VISUALS)[GlitchKind],
				callback: () => void
			) => {
				const context = p.drawingContext as CanvasRenderingContext2D;
				context.save();
				context.beginPath();

				if (visual.shape === 'square') {
					const size = visual.radius * 1.8;
					context.rect(enemy.x - size / 2, enemy.y - size / 2, size, size);
				} else if (visual.shape === 'diamond') {
					const size = visual.radius * 1.48;
					context.moveTo(enemy.x, enemy.y - size);
					context.lineTo(enemy.x + size, enemy.y);
					context.lineTo(enemy.x, enemy.y + size);
					context.lineTo(enemy.x - size, enemy.y);
					context.closePath();
				} else if (visual.shape === 'triangle') {
					context.moveTo(enemy.x, enemy.y - visual.radius * 1.25);
					context.lineTo(enemy.x - visual.radius, enemy.y + visual.radius);
					context.lineTo(enemy.x + visual.radius, enemy.y + visual.radius);
					context.closePath();
				} else {
					context.arc(enemy.x, enemy.y, visual.radius, 0, Math.PI * 2);
				}

				context.clip();
				callback();
				context.restore();
			};

			for (const enemy of enemies) {
				const visual = ENEMY_VISUALS[enemy.kind];
				const flash = enemy.hitFlash > 0;

				p.push();
				p.strokeWeight(visual.stroke ? 1.5 : 0);

				if (visual.stroke) {
					p.stroke(...visual.stroke);
				} else {
					p.noStroke();
				}

				if (flash) {
					if (enemy.bleedStoredDamage > 0) {
						p.fill('#ffe4e6');
					} else {
						p.fill(255);
					}
				} else {
					p.fill(...visual.fill);
				}
				drawEnemyShape(enemy, visual);

				if (enemy.bleedStoredDamage > 0) {
					const bleedFillRatio = Math.max(
						0,
						Math.min(1, (enemy.bleedStoredDamage * bleedCatalystMultiplier) / enemy.maxHealth)
					);
					const overlayWidth =
						visual.shape === 'triangle' ? visual.radius * 2.2 : visual.radius * 2.4;
					const overlayHeight =
						visual.shape === 'triangle' ? visual.radius * 2.4 : visual.radius * 2.4;
					const fillHeight = overlayHeight * bleedFillRatio;

					clipEnemyShape(enemy, visual, () => {
						p.noStroke();
						p.fill('#dc2626cc');
						p.rectMode(p.CORNER);
						p.rect(
							enemy.x - overlayWidth / 2,
							enemy.y + overlayHeight / 2 - fillHeight,
							overlayWidth,
							fillHeight
						);
					});
				}

				if (markedEnemyId === enemy.id) {
					p.noFill();
					p.stroke('#facc15dd');
					p.strokeWeight(2);
					p.circle(enemy.x, enemy.y, visual.radius * 3.15);
					p.line(enemy.x, enemy.y - visual.radius * 2.1, enemy.x, enemy.y - visual.radius * 1.15);
					p.line(
						enemy.x - visual.radius * 0.55,
						enemy.y - visual.radius * 1.6,
						enemy.x + visual.radius * 0.55,
						enemy.y - visual.radius * 1.6
					);
				}

				if (enemy.shieldPulseTimer > 0) {
					const stats = getEnemyStats(enemy.kind);
					const shieldColor = stats.shieldColor ?? '#ffe6a3';
					const pulseStrength =
						enemy.shieldPulseTimer / Math.max(0.01, stats.onHitShieldDuration ?? 1);

					p.noFill();
					p.stroke(`${shieldColor}${pulseStrength > 0.45 ? 'cc' : '88'}`);
					p.strokeWeight(2.4);
					p.circle(enemy.x, enemy.y, visual.radius * (2.7 + (1 - pulseStrength) * 0.45));
				}

				if (enemy.supportShieldPool > 0) {
					p.noFill();
					p.stroke('#7fb7ffcc');
					p.strokeWeight(2);
					p.circle(enemy.x, enemy.y, visual.radius * 2.85);
				}

				if (enemy.voidTouchedTimer > 0) {
					p.noFill();
					p.stroke('#b794ffcc');
					p.strokeWeight(2);
					p.circle(enemy.x, enemy.y, visual.radius * 3.2);
				}

				if (enemy.vulnerableTimer > 0) {
					p.noFill();
					p.stroke('#ffd166cc');
					p.strokeWeight(1.8);
					p.circle(enemy.x, enemy.y, visual.radius * 2.55);
				}

				if (enemy.sunbrandTimer > 0) {
					const brandPulse = 0.55 + Math.sin(p.frameCount * 0.18) * 0.2;
					p.noFill();
					p.stroke('#fb923ccc');
					p.strokeWeight(2);
					p.circle(enemy.x, enemy.y, visual.radius * (2.9 + brandPulse * 0.18));
					p.noStroke();
					p.fill('#fde68abb');
					p.circle(enemy.x, enemy.y - visual.radius * 2.1, 4.5 + brandPulse * 1.5);
				}

				if (enemy.bindingRuneHitCount > 0) {
					const bindingPulse = 0.45 + Math.sin(p.frameCount * 0.12 + enemy.id) * 0.18;
					p.noFill();
					p.stroke('#e7c989cc');
					p.strokeWeight(1.8);
					p.circle(enemy.x, enemy.y, visual.radius * (2.7 + bindingPulse * 0.22));
					p.noStroke();
					p.fill('#faedd0dd');
					p.circle(
						enemy.x + visual.radius * 1.55,
						enemy.y - visual.radius * 1.55,
						3.8 + bindingPulse
					);
				}

				if (enemy.parasiteBloomTimer > 0) {
					const progress =
						enemy.parasiteBloomDuration > 0
							? enemy.parasiteBloomTimer / enemy.parasiteBloomDuration
							: 0;
					const parasiteColor = enemy.parasiteBloomColor ?? '#f472b6';
					const orbitRadius = visual.radius * (1.7 + (1 - progress) * 0.45);
					const growthSize = 4.5 + (1 - progress) * 5.5;

					p.noFill();
					p.stroke(`${parasiteColor}cc`);
					p.strokeWeight(2);
					p.circle(enemy.x, enemy.y, visual.radius * 2.95);

					for (let petalIndex = 0; petalIndex < 3; petalIndex += 1) {
						const angle = p.frameCount * 0.045 + petalIndex * ((Math.PI * 2) / 3);
						const bloomX = enemy.x + Math.cos(angle) * orbitRadius;
						const bloomY = enemy.y + Math.sin(angle) * orbitRadius;
						p.noStroke();
						p.fill(`${parasiteColor}bb`);
						p.circle(bloomX, bloomY, growthSize);
					}
				}

				if (enemy.chillAmount > 0) {
					p.noFill();
					p.stroke(enemy.frozenTimer > 0 ? '#dff6ffdd' : '#7dd3fccc');
					p.strokeWeight(enemy.frozenTimer > 0 ? 2.4 : 1.6);
					p.circle(enemy.x, enemy.y, visual.radius * (enemy.frozenTimer > 0 ? 3.45 : 2.7));
				}

				if (enemy.confusionTimer > 0) {
					p.noFill();
					p.stroke('#8be9fdcc');
					p.strokeWeight(1.5);
					p.circle(enemy.x, enemy.y, visual.radius * 2.45);
				}

				p.pop();
			}
		};

		p.setup = () => {
			canvas = p.createCanvas(MAX_WIDTH, BASE_HEIGHT).elt as HTMLCanvasElement;
			syncCanvasSize();
			if (initialResumeState) {
				currentLevelIndex = Math.max(
					0,
					endlessMode
						? initialResumeState.currentLevel - 1
						: Math.min(initialResumeState.currentLevel - 1, levels.length - 1)
				);
				currentLevel = resolveLevel(currentLevelIndex);
				status = initialResumeState.status;
				levelRewardsCommitted = initialResumeState.levelRewardsCommitted;
				statusTimer = initialResumeState.statusTimer;
				currentSweepIndex = initialResumeState.currentSweepIndex;
				spawnAccumulator = initialResumeState.spawnAccumulator;
				sweepProgress = initialResumeState.sweepProgress;
				bankedXp = initialResumeState.bankedXp;
				waveXp = initialResumeState.waveXp;
				waveDrops = [...initialResumeState.waveDrops];
				pixlHealth = initialResumeState.pixlHealth;
				pixlShieldSources = initialResumeState.pixlShieldSources
					? { ...initialResumeState.pixlShieldSources }
					: initialResumeState.pixlShieldPool > 0
						? { 'legacy-resume': initialResumeState.pixlShieldPool }
						: {};
				pendingNextWeaponDamageMultiplier =
					initialResumeState.pendingNextWeaponDamageMultiplier ?? 1;
				weaponDamageMultiplierByInstanceId = initialResumeState.weaponDamageMultiplierByInstanceId
					? { ...initialResumeState.weaponDamageMultiplierByInstanceId }
					: (Object.fromEntries(equippedWeapons.map((weapon) => [weapon.instanceId, 1])) as Record<
							string,
							number
						>);
				markedEnemyId = initialResumeState.markedEnemyId ?? null;
				recalculatePixlShieldPool();
				activeShieldColor = initialResumeState.activeShieldColor;
				enemyId = initialResumeState.enemyId;
				spawnQueue = [...initialResumeState.spawnQueue];
				enemies = initialResumeState.enemies.map((enemy) => ({
					...enemy,
					bleedStoredDamage: enemy.bleedStoredDamage ?? 0,
					bleedDurationRemaining: enemy.bleedDurationRemaining ?? 0,
					bleedSourceWeaponInstanceId: enemy.bleedSourceWeaponInstanceId ?? null,
					bleedLifeStealRatio: enemy.bleedLifeStealRatio ?? 0,
					parasiteBloomTimer: enemy.parasiteBloomTimer ?? 0,
					parasiteBloomDuration: enemy.parasiteBloomDuration ?? 0,
					parasiteBloomHealRatio: enemy.parasiteBloomHealRatio ?? 0,
					parasiteBloomPulseRadius: enemy.parasiteBloomPulseRadius ?? 0,
					parasiteBloomColor: enemy.parasiteBloomColor ?? null
				}));
				highestUnlockedLevel = initialResumeState.highestUnlockedLevel;
				highestClearedLevel = initialResumeState.highestClearedLevel;
				completed = initialResumeState.completed;
			} else {
				startLevel(currentLevelIndex);
			}
			emitCombatState();
			emitResumeState();
		};

		p.draw = () => {
			const dt = Math.min(p.deltaTime / 1000, 0.05);
			pixlFlash = Math.max(0, pixlFlash - dt);
			applySkipResultsSignal();

			syncCanvasSize();
			if (runMode === 'combat' && status === 'running') {
				currentLevelElapsedTime += dt;
				updateWaveFlow(dt);
				updateVanishRune(dt);
				updateForceFields(dt);
				updateKillSwitchPulses(dt);
				updateVulnerablePulses(dt);
				updateParasiteBloomPulses(dt);
				updateMirrorArrays(dt);
				updateOathbreakerSigils(dt);
				updateStasisFields(dt);
				updatePrismPrisons(dt);
				updateSupportPylons(dt);
				updateLaserRods(dt);
				updateVoidTunnels(dt);
				updateVoidRifts(dt);
				updatePhaseshifts(dt);
				updateBurningGrounds(dt);
				updatePerimeterMines(dt);
				updateTurretMines(dt);
				updateMineShieldTurrets(dt);
				updateDelayedBombs(dt);
				updateLaserSweeps(dt);
				updateJudgmentRunes(dt);
				updateNeedleBursts(dt);
				updateExecutionLatticeStrikes(dt);
				updateForkLightningBursts(dt);
				updateFlamethrowerCones(dt);
				updateIceSpikes(dt);
				updateBlizzardStorms(dt);
				updatePixlSwallowPulses(dt);
				updateVoidTendrils(dt);
				updateNaturesWraths(dt);
				updateAscendedPeaShooterBeams(dt);
				updateHemorrhageBursts(dt);
				updateKnifeTrailSegments(dt);
				updateEnemies(dt);
				updateEnemyBeams(dt);
				updateEnemyProjectiles(dt);
				updateSniperChainBursts(dt);
				updateSniperLocks(dt);

				if (pixlHealth === 0) {
					markDefeated();
				} else {
					updateProjectiles(dt);

					if (spawnQueue.length === 0 && enemies.length === 0) {
						markCleared();
					}
				}
			} else if (runMode === 'combat') {
				statusTimer -= dt;

				if (statusTimer <= 0) {
					if (status === 'defeated') {
						startLevel(getCurrentStageStartLevelIndex());
					} else {
						commitLevelRewards();

						if (endlessMode) {
							emitProgressState(getResolvedLevelNumber(currentLevel) + 1);
							startLevel(currentLevelIndex + 1);
						} else if (status === 'complete') {
							emitProgressState(campaign.totalLevels);
							startLevel(0);
						} else {
							emitProgressState(getResolvedLevelNumber(currentLevel) + 1);
							startLevel(currentLevelIndex + 1);
						}
					}
				}
			}

			emitCombatState();
			emitResumeState();

			drawScaledArenaLayer(drawArena);
			if (showLoadoutSketch) {
				drawLoadout();
			}
			drawScaledArenaLayer(drawProjectiles);
			drawScaledArenaLayer(drawEnemies);
			drawScaledArenaLayer(drawPixl);
		};

		p.windowResized = () => {
			syncCanvasSize();
		};
	};
}

interface LoadoutSweepPreviewOptions {
	pixlState?: SharedPixlStateInput | null;
}

export function createLoadoutSweepPreviewSketch(options: LoadoutSweepPreviewOptions = {}) {
	return (p: P5) => {
		const pixlProgression = createUpgradeablePixlState({
			xp: options.pixlState?.xp ?? 0,
			defence: options.pixlState?.defence ?? 0,
			agility: options.pixlState?.agility ?? 0
		});
		const equippedLoadoutEntries = buildEquippedLoadoutEntries(
			options.pixlState?.ownedWeapons,
			options.pixlState?.loadoutPlacements,
			pixlProgression.loadoutColumns
		);

		let canvas: HTMLCanvasElement | null = null;
		let sweepProgress = 0;

		const getLoadoutLayout = (): LoadoutLayout => {
			const loadoutColumnCount = pixlProgression.loadoutColumns;
			const loadoutRowCount = pixlProgression.loadoutRows;
			const frameWidth = p.width - 28;
			const frameHeight = p.height - 28;
			const cellSize = Math.max(
				14,
				Math.floor(Math.min(frameWidth / loadoutColumnCount, frameHeight / loadoutRowCount))
			);
			const gridWidth = cellSize * loadoutColumnCount;
			const gridHeight = cellSize * loadoutRowCount;

			return {
				cellSize,
				gridWidth,
				gridHeight,
				left: Math.round((p.width - gridWidth) / 2),
				top: Math.round((p.height - gridHeight) / 2)
			};
		};

		const syncCanvasSize = () => {
			if (!canvas) {
				return;
			}

			const { width, height } = getLoadoutPreviewCanvasSize(
				canvas,
				LOADOUT_PREVIEW_MAX_WIDTH,
				LOADOUT_PREVIEW_BASE_HEIGHT
			);

			if (width === p.width && height === p.height) {
				return;
			}

			p.resizeCanvas(width, height);
		};

		const advanceSweep = (dt: number) => {
			if (equippedLoadoutEntries.length === 0) {
				return;
			}

			const loadoutColumnCount = pixlProgression.loadoutColumns;

			sweepProgress += dt * pixlProgression.attackSpeed * loadoutColumnCount;

			while (sweepProgress >= loadoutColumnCount) {
				sweepProgress -= loadoutColumnCount;
			}
		};

		const drawLoadout = () => {
			const layout = getLoadoutLayout();
			const loadoutColumnCount = pixlProgression.loadoutColumns;
			const loadoutRowCount = pixlProgression.loadoutRows;
			const sweepX = layout.left + (sweepProgress / loadoutColumnCount) * layout.gridWidth;

			p.push();
			p.clear();
			p.rectMode(p.CORNER);
			p.noStroke();
			p.fill(0, 0, 0, 0);
			p.rect(0, 0, p.width, p.height);

			p.fill(12, 12, 12, 168);
			p.rect(layout.left - 10, layout.top - 10, layout.gridWidth + 20, layout.gridHeight + 20, 16);

			for (let row = 0; row < loadoutRowCount; row += 1) {
				for (let column = 0; column < loadoutColumnCount; column += 1) {
					const x = layout.left + column * layout.cellSize;
					const y = layout.top + row * layout.cellSize;

					p.stroke(72, 72, 72, 210);
					p.fill(18, 18, 18, 232);
					p.rect(x, y, layout.cellSize, layout.cellSize, 4);
				}
			}

			for (const item of equippedLoadoutEntries) {
				const fill = WEAPON_FILL_BY_RARITY[item.definition.rarity];

				for (const [cellX, cellY] of item.shape.cells) {
					const gridX = item.placementX + cellX;
					const gridY = item.placementY + cellY;

					if (gridX < 0 || gridX >= loadoutColumnCount || gridY < 0 || gridY >= loadoutRowCount) {
						continue;
					}

					const x = layout.left + gridX * layout.cellSize;
					const y = layout.top + gridY * layout.cellSize;

					p.stroke(255, 255, 255, 64);
					p.fill(fill[0], fill[1], fill[2], 228);
					p.rect(x + 1, y + 1, layout.cellSize - 2, layout.cellSize - 2, 4);
				}
			}

			p.stroke(110, 255, 150, 224);
			p.strokeWeight(2);
			p.line(sweepX, layout.top - 2, sweepX, layout.top + layout.gridHeight + 2);
			p.pop();
		};

		p.setup = () => {
			canvas = p.createCanvas(LOADOUT_PREVIEW_MAX_WIDTH, LOADOUT_PREVIEW_BASE_HEIGHT)
				.elt as HTMLCanvasElement;
			syncCanvasSize();
		};

		p.draw = () => {
			const dt = Math.min(p.deltaTime / 1000, 0.05);
			syncCanvasSize();
			advanceSweep(dt);
			drawLoadout();
		};

		p.windowResized = () => {
			syncCanvasSize();
		};
	};
}
