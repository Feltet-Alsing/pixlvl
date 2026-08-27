import type P5 from 'p5';

import { getCampaignLevel, getWeaponDefinition } from '$lib/data';
import { isPlacementWeaponTargetingKind } from '$lib/game/weapon-targeting';
import { rollLevelRewardPacks as buildRewardPacksForLevel } from '$lib/game/reward-packs';
import { applyXpGain, createUpgradeablePixlState } from '$lib/game/upgrades';
import {
	buildEquippedLoadoutEntries,
	buildEquippedUtilities,
	buildEquippedWeapons,
	buildSpawnQueue,
	createRewardPackId,
	doCellsTouchByEdge,
	doLoadoutEntriesTouch,
	ENEMY_VISUALS,
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
	CampaignDefinition,
	CampaignLevel,
	CombatProfile,
	GlitchKind,
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

type WaveStatus = 'running' | 'cleared' | 'defeated' | 'complete';
type RunMode = 'management' | 'combat';

interface EnemyState {
	id: number;
	kind: GlitchKind;
	x: number;
	y: number;
	health: number;
	maxHealth: number;
	bleedStoredDamage: number;
	bleedDurationRemaining: number;
	bleedSourceWeaponInstanceId: string | null;
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
	voidTouchedTimer: number;
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

interface ForceFieldState {
	sourceWeaponInstanceId: string;
	centerX: number;
	centerY: number;
	startDelay: number;
	radius: number;
	maxRadius: number;
	expansionSpeed: number;
	lineWidth: number;
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
	damagePerSecond: number;
	chillPerSecond: number;
	freezeDuration: number;
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
	enemyId: number;
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

interface FanKnifeBurstState {
	sourceWeaponInstanceId: string;
	baseAngle: number;
	angleStep: number;
	spinRate: number;
	projectileCount: number;
	projectilesReleased: number;
	projectilesPerEmission: number;
	emissionInterval: number;
	emissionTimer: number;
	damage: number;
	color: string;
	glow: boolean;
	age: number;
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

interface PixlSwallowPulseState {
	originX: number;
	originY: number;
	color: string;
	shieldGain: number;
	age: number;
	duration: number;
}

interface HemorrhageBurstState {
	centerX: number;
	centerY: number;
	radius: number;
	age: number;
	duration: number;
	color: string;
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
>;

interface ArenaCombatSketchOptions {
	persistPath?: string;
	runMode?: RunMode;
	flowMode?: 'campaign' | 'endless';
	levelResolver?: (levelIndex: number) => CampaignLevel;
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
	spawnQueue: GlitchKind[];
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
		const adjacentInstanceIdsByInstanceId = new Map<string, Set<string>>();

		for (const entry of equippedLoadoutEntries) {
			adjacentInstanceIdsByInstanceId.set(entry.instanceId, new Set<string>());
		}

		for (let leftIndex = 0; leftIndex < equippedLoadoutEntries.length; leftIndex += 1) {
			for (
				let rightIndex = leftIndex + 1;
				rightIndex < equippedLoadoutEntries.length;
				rightIndex += 1
			) {
				const leftEntry = equippedLoadoutEntries[leftIndex];
				const rightEntry = equippedLoadoutEntries[rightIndex];

				if (!doLoadoutEntriesTouch(leftEntry, rightEntry)) {
					continue;
				}

				adjacentInstanceIdsByInstanceId.get(leftEntry.instanceId)?.add(rightEntry.instanceId);
				adjacentInstanceIdsByInstanceId.get(rightEntry.instanceId)?.add(leftEntry.instanceId);
			}
		}

		const loadoutEntryByInstanceId = new Map(
			equippedLoadoutEntries.map((entry) => [entry.instanceId, entry])
		);
		const getAdjacentEntries = (instanceId: string) => {
			const adjacentInstanceIds = adjacentInstanceIdsByInstanceId.get(instanceId);

			if (!adjacentInstanceIds) {
				return [] as EquippedLoadoutEntry[];
			}

			return [...adjacentInstanceIds]
				.map((adjacentInstanceId) => loadoutEntryByInstanceId.get(adjacentInstanceId))
				.filter((entry): entry is EquippedLoadoutEntry => Boolean(entry));
		};
		const hasAdjacentDefinition = (instanceId: string, definitionId: string) => {
			for (const entry of getAdjacentEntries(instanceId)) {
				if (entry.definition.id === definitionId) {
					return true;
				}
			}

			return false;
		};
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
		const knifeSiphonUtilityByFanInstanceId = new Map<
			string,
			{ damageMultiplier: number; lifeStealRatio: number }
		>();
		const fanOfKnivesBleedEnabledInstanceIds = new Set<string>();

		for (const weapon of equippedWeapons) {
			if (weapon.definition.id !== 'fan-of-knives') {
				continue;
			}

			const touchesKnife = hasAdjacentDefinition(weapon.instanceId, 'the-knife');

			if (touchesKnife) {
				fanOfKnivesBleedEnabledInstanceIds.add(weapon.instanceId);
			}

			for (const utility of passiveUtilities) {
				if (utility.definition.effect.type !== 'knife-siphon') {
					continue;
				}

				const siphonTouchesKnife = hasAdjacentDefinition(utility.instanceId, 'the-knife');

				if (!touchesKnife || !siphonTouchesKnife) {
					continue;
				}

				knifeSiphonUtilityByFanInstanceId.set(weapon.instanceId, {
					damageMultiplier: utility.definition.effect.damageMultiplier,
					lifeStealRatio: utility.definition.effect.lifeStealRatio
				});
			}
		}
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
		let spawnAccumulator = 0;
		let sweepProgress = 0;
		let bankedXp = pixlProgression.xp;
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
		let pendingNextWeaponDamageMultiplier = 1;
		let markedEnemyId: number | null = null;
		let weaponDamageMultiplierByInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [weapon.instanceId, 1])
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
		let spawnQueue: GlitchKind[] = [];
		let enemies: EnemyState[] = [];
		let projectiles: ProjectileState[] = [];
		let enemyProjectiles: EnemyProjectileState[] = [];
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
		let fanKnifeBursts: FanKnifeBurstState[] = [];
		let iceSpikes: IceSpikeState[] = [];
		let blizzardStorms: BlizzardStormState[] = [];
		let voidRifts: VoidRiftState[] = [];
		let voidTendrils: VoidTendrilState[] = [];
		let pixlSwallowPulses: PixlSwallowPulseState[] = [];
		let voidTunnels: VoidTunnelState[] = [];
		let phaseshifts: PhaseshiftState[] = [];
		let oathbreakerSigils: OathbreakerSigilState[] = [];
		let mirrorArrays: MirrorArrayState[] = [];
		let burningGrounds: BurningGroundState[] = [];
		let delayedBombs: DelayedBombState[] = [];
		let hemorrhageBursts: HemorrhageBurstState[] = [];
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

		const getEnemyContactRange = (kind: GlitchKind) =>
			Math.max(
				combatProfile.collision.contactRange,
				(pixlShieldPool > 0
					? combatProfile.collision.pixlRadius * 1.45
					: combatProfile.collision.pixlRadius) + ENEMY_VISUALS[kind].radius
			);

		const getEnemyStageMultiplier = (scalingKey: 'healthPerStage' | 'damagePerStage') => {
			const perStage = campaign.baseline.enemyStageScaling?.[scalingKey] ?? 0;

			return 1 + Math.max(0, currentLevel.stage - 1) * perStage;
		};

		const getEnemyHealthMultiplier = () => {
			return currentLevel.enemyHealthMultiplier ?? getEnemyStageMultiplier('healthPerStage');
		};

		const getEnemyDamageMultiplier = () => {
			return currentLevel.enemyDamageMultiplier ?? getEnemyStageMultiplier('damagePerStage');
		};

		const getEnemyDamageBonus = () => {
			return currentLevel.enemyDamageBonus ?? 0;
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
				stageLevel: currentLevel.stageLevel,
				campaignLevel: currentLevel.campaignLevel,
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
					biters: currentLevel.composition.biters ?? 0,
					swarmers: currentLevel.composition.swarmers ?? 0,
					tankers: currentLevel.composition.tankers ?? 0,
					shard: currentLevel.composition.shard ?? 0,
					bulwark: currentLevel.composition.bulwark ?? 0
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
				currentLevel: currentLevel.campaignLevel,
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

		const recalculatePixlShieldPool = () => {
			pixlShieldPool = Object.values(pixlShieldSources).reduce(
				(total, amount) => total + amount,
				0
			);

			if (pixlShieldPool <= 0) {
				pixlShieldPool = 0;
				activeShieldColor = '#60a5fa';
			}
		};

		const getMineShieldTurretCap = () => pixlProgression.health * 2;

		const getMineShieldTurretTotal = () =>
			mineShieldTurrets.reduce(
				(total, turret) => total + (pixlShieldSources[turret.sourceUtilityInstanceId] ?? 0),
				0
			);

		const setMineShieldTurretShield = (sourceId: string, amount: number) => {
			const existingShield = pixlShieldSources[sourceId] ?? 0;
			const otherShieldTotal = Math.max(0, getMineShieldTurretTotal() - existingShield);
			const maxShieldForSource = Math.max(0, getMineShieldTurretCap() - otherShieldTotal);

			pixlShieldSources[sourceId] = Math.min(Math.max(0, amount), maxShieldForSource);
		};

		const addPixlShieldFromSource = (sourceId: string, amount: number, color: string) => {
			if (amount <= 0) {
				return;
			}

			pixlShieldSources[sourceId] = (pixlShieldSources[sourceId] ?? 0) + amount;
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

				pixlShieldSources[utility.instanceId] = Math.ceil(
					pixlProgression.health * utility.definition.effect.shieldPercent
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
			spawnAccumulator = 0;
			sweepProgress = 0;
			waveXp = 0;
			waveDrops = [];
			rewardPacks = [];
			pixlHealth = pixlProgression.health;
			pixlShieldPool = 0;
			pixlShieldSources = {};
			pendingNextWeaponDamageMultiplier = 1;
			weaponDamageMultiplierByInstanceId = Object.fromEntries(
				equippedWeapons.map((weapon) => [weapon.instanceId, 1])
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
			fanKnifeBursts = [];
			iceSpikes = [];
			blizzardStorms = [];
			voidRifts = [];
			voidTendrils = [];
			pixlSwallowPulses = [];
			voidTunnels = [];
			phaseshifts = [];
			oathbreakerSigils = [];
			mirrorArrays = [];
			burningGrounds = [];
			delayedBombs = [];
			hemorrhageBursts = [];
			sniperLocks = [];
			sniperChainBursts = [];
			spawnQueue = shuffleInPlace(buildSpawnQueue(currentLevel), p);

			if (spawnQueue.length > 0) {
				spawnEnemy(spawnQueue.shift() as GlitchKind);
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
			const familyDamageMultiplier = weapon.family === 'mine' ? sharedMineDamageMultiplier : 1;
			const elementalDamageMultiplier = weapon.attack.requiredInfusion
				? elementalCycleDamageMultipliers[weapon.attack.requiredInfusion]
				: 1;

			return Math.max(
				1,
				Math.round(
					weapon.baseDamage *
						cycleDamageMultiplier *
						elementalDamageMultiplier *
						familyDamageMultiplier *
						multiplier *
						sourceDamageMultiplier
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
			if (!rewardsEnabled) {
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
				Math.round(BOSS_HEALTH_ANCHOR_BASE * (1 + Math.max(0, stage - 1) * BOSS_HEALTH_PER_STAGE))
			);
		};

		const getBossTargetHealth = (kind: GlitchKind, stage: number) => {
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

			return currentLevel.enemyDamageBonus ?? 0;
		};

		const getXpForEnemyKind = (kind: GlitchKind) => {
			if (kind === 'boss-melee') {
				return currentLevel.xpPerEnemy.bossMelee ?? 0;
			}

			if (kind === 'boss-ranged') {
				return currentLevel.xpPerEnemy.bossRanged ?? 0;
			}

			if (kind === 'boss-hybrid') {
				return currentLevel.xpPerEnemy.bossHybrid ?? 0;
			}

			return currentLevel.xpPerEnemy[kind] ?? 0;
		};

		const getBossEnemyOverrides = (
			kind: GlitchKind
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
			kind: GlitchKind,
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
			const stats = combatProfile.glitches[kind];
			const attackInterval = 1 / stats.attackSpeed;
			const preferredRange = stats.preferredRange ?? getEnemyContactRange(kind);
			const holdRadius =
				stats.attackPattern === 'siege' ? FIXED_SPAWN_RADIUS : preferredRange + p.random(-12, 16);
			const healthMultiplier = getEnemyHealthMultiplier();
			const scaledHealth = Math.max(1, Math.round(stats.health * healthMultiplier));
			const initialAttackTimer =
				stats.attackPattern === 'siege' ? attackInterval * 2.5 : attackInterval;

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
				voidTouchedTimer: 0,
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

		const getKnifeBleedSpec = () => {
			const knifeSpecial = getWeaponDefinition('the-knife').attack.special;

			if (knifeSpecial?.type === 'bleed-hit') {
				return knifeSpecial;
			}

			return {
				type: 'bleed-hit' as const,
				damageRatio: 2.5,
				duration: 10
			};
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

			if (
				sourceWeapon.id === 'fan-of-knives' &&
				fanOfKnivesBleedEnabledInstanceIds.has(sourceWeaponInstanceId)
			) {
				return getKnifeBleedSpec();
			}

			return null;
		};

		const applyBleedToEnemy = (
			enemyIndex: number,
			baseStoredDamage: number,
			duration: number,
			sourceWeaponInstanceId: string,
			lifeStealRatio: number
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

			const existingSourceHasSiphon = enemy.bleedSourceWeaponInstanceId
				? knifeSiphonUtilityByFanInstanceId.has(enemy.bleedSourceWeaponInstanceId)
				: false;
			const nextSourceHasSiphon = knifeSiphonUtilityByFanInstanceId.has(sourceWeaponInstanceId);

			enemy.bleedStoredDamage += effectiveStoredDamage;
			enemy.bleedDurationRemaining = Math.max(enemy.bleedDurationRemaining, duration);
			enemy.bleedLifeStealRatio = Math.max(enemy.bleedLifeStealRatio, lifeStealRatio);

			if (!enemy.bleedSourceWeaponInstanceId || nextSourceHasSiphon || !existingSourceHasSiphon) {
				enemy.bleedSourceWeaponInstanceId = sourceWeaponInstanceId;
			}

			triggerHemorrhageBurst(enemyIndex);

			return effectiveStoredDamage / duration;
		};

		const spawnEnemy = (kind: GlitchKind) => {
			const angle = p.random(p.TWO_PI);
			const x = centerX + Math.cos(angle) * FIXED_SPAWN_RADIUS;
			const y = centerY + Math.sin(angle) * FIXED_SPAWN_RADIUS;

			enemies.push(createEnemyState(kind, x, y, getBossEnemyOverrides(kind)));
			enemyId += 1;
		};

		const spawnEnemyAtPosition = (
			kind: GlitchKind,
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
			return combatProfile.glitches[enemy.kind].attackPattern === 'siege';
		};

		const isBossEnemy = (enemy: EnemyState) => {
			return (
				enemy.kind === 'boss-melee' || enemy.kind === 'boss-ranged' || enemy.kind === 'boss-hybrid'
			);
		};

		const isEnemyCapturedByVoidTendril = (enemyId: number) => {
			return voidTendrils.some((tendril) => tendril.enemyId === enemyId);
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
			const threshold = enemy.maxHealth * hemorrhageBurstEffect.thresholdRatio;

			if (effectiveStoredBleed < threshold) {
				return false;
			}

			const burstDamage = effectiveStoredBleed;
			const burstCenterX = enemy.x;
			const burstCenterY = enemy.y;
			const burstRadius = Math.min(p.width, p.height) * hemorrhageBurstEffect.radiusFactor * 0.33;

			enemy.bleedStoredDamage = 0;
			enemy.bleedDurationRemaining = 0;
			enemy.bleedSourceWeaponInstanceId = null;
			enemy.bleedLifeStealRatio = 0;
			hemorrhageBursts.push({
				centerX: burstCenterX,
				centerY: burstCenterY,
				radius: burstRadius,
				age: 0,
				duration: 0.42,
				color: '#dc2626'
			});

			for (let targetIndex = enemies.length - 1; targetIndex >= 0; targetIndex -= 1) {
				const targetEnemy = enemies[targetIndex];
				const distance = Math.hypot(targetEnemy.x - burstCenterX, targetEnemy.y - burstCenterY);

				if (distance > burstRadius + ENEMY_VISUALS[targetEnemy.kind].radius) {
					continue;
				}

				applyDamageToEnemy(targetIndex, burstDamage, 0.14, undefined, {
					applyWeaponHitEffects: false,
					allowContextHealing: false
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

			if (triggerHemorrhageBurst(enemyIndex)) {
				return !enemies[enemyIndex] || enemies[enemyIndex].id !== enemy.id;
			}

			if (enemy.bleedStoredDamage <= 0 || enemy.bleedDurationRemaining <= 0) {
				enemy.bleedStoredDamage = 0;
				enemy.bleedDurationRemaining = 0;
				enemy.bleedSourceWeaponInstanceId = null;
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
				const bleedTickResult = applyDamageToEnemy(
					enemyIndex,
					baseDamageConsumed * bleedCatalystMultiplier,
					0.03,
					enemy.bleedSourceWeaponInstanceId ?? undefined,
					{
						applyWeaponHitEffects: false,
						allowContextHealing: false
					}
				);

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
								enemy.bleedLifeStealRatio
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

		const applyDamageToPixl = (damage: number) => {
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

			const stats = combatProfile.glitches[enemy.kind];
			let remainingDamage = damage;
			let actualDamage = 0;
			const applyWeaponHitEffects = options.applyWeaponHitEffects ?? true;
			const allowContextHealing = options.allowContextHealing ?? true;
			const allowOathbreakerShare = options.allowOathbreakerShare ?? false;
			const sourceWeapon = sourceWeaponInstanceId
				? (equippedWeaponByInstanceId.get(sourceWeaponInstanceId)?.definition ?? null)
				: null;

			if (
				targetPainterEffect &&
				markedEnemyId === enemy.id &&
				applyWeaponHitEffects &&
				sourceWeaponInstanceId
			) {
				remainingDamage *= targetPainterEffect.damageMultiplier;
			}

			if (sourceWeapon?.family !== 'pylon') {
				remainingDamage *= getMarkBeaconDamageMultiplierAtPoint(enemy.x, enemy.y);
			}

			if (sourceWeapon?.attack.requiredInfusion && enemy.voidTouchedTimer > 0) {
				remainingDamage *= 1.3;
			}

			if (enemy.vulnerableTimer > 0) {
				remainingDamage *= 1.33;
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
				if (
					applyWeaponHitEffects &&
					sourceWeapon?.attack.special?.type === 'shield-steal' &&
					sourceWeaponInstanceId
				) {
					addPixlShieldFromSource(
						`${sourceWeaponInstanceId}-shield-steal`,
						actualDamage * sourceWeapon.attack.special.shieldRatio,
						sourceWeapon.projectileVisual.color
					);
				}
				if (allowContextHealing) {
					applyBlackHoleLifeSteal(enemy, actualDamage);
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
			if (
				applyWeaponHitEffects &&
				sourceWeapon?.attack.special?.type === 'shield-steal' &&
				sourceWeaponInstanceId
			) {
				addPixlShieldFromSource(
					`${sourceWeaponInstanceId}-shield-steal`,
					actualDamage * sourceWeapon.attack.special.shieldRatio,
					sourceWeapon.projectileVisual.color
				);
			}
			if (allowContextHealing) {
				applyBlackHoleLifeSteal(enemy, actualDamage);
			}
			if (enemy.lifeStealMarkTimer > 0 && actualDamage > 0) {
				healPixl(actualDamage * enemy.lifeStealMarkRatio);
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
				const knifeSiphon =
					sourceWeapon?.id === 'fan-of-knives'
						? knifeSiphonUtilityByFanInstanceId.get(sourceWeaponInstanceId)
						: null;

				applyBleedToEnemy(
					enemyIndex,
					Math.max(0, actualDamage * bleedSpec.damageRatio),
					bleedSpec.duration,
					sourceWeaponInstanceId,
					knifeSiphon?.lifeStealRatio ?? 0
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
				if (triggerHemorrhageBurst(enemyIndex)) {
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

		const updateFanKnifeBursts = (dt: number) => {
			for (let index = fanKnifeBursts.length - 1; index >= 0; index -= 1) {
				const burst = fanKnifeBursts[index];
				burst.age += dt;
				burst.emissionTimer -= dt;

				while (burst.emissionTimer <= 0 && burst.projectilesReleased < burst.projectileCount) {
					burst.emissionTimer += burst.emissionInterval;

					const volleyCount = Math.min(
						burst.projectilesPerEmission,
						burst.projectileCount - burst.projectilesReleased
					);
					const spinAngle = burst.baseAngle + burst.age * burst.spinRate;

					for (let volleyIndex = 0; volleyIndex < volleyCount; volleyIndex += 1) {
						const angleRadians = spinAngle + volleyIndex * burst.angleStep;

						spawnProjectile({
							sourceWeaponInstanceId: burst.sourceWeaponInstanceId,
							originX: centerX,
							originY: centerY,
							angleRadians,
							weapon: getWeaponDefinition('fan-of-knives'),
							damage: burst.damage,
							shape: 'knife',
							trail: 'streak',
							glow: burst.glow,
							color: burst.color,
							motion: 'straight'
						});
					}

					burst.projectilesReleased += volleyCount;
				}

				if (burst.projectilesReleased >= burst.projectileCount) {
					fanKnifeBursts.splice(index, 1);
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
				shieldRatioFromMineDamage: effect.shieldRatioFromMineDamage
			};

			setMineShieldTurretShield(utility.instanceId, shieldAmount);
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
				damagePerSecond: special.damagePerSecond ?? 0,
				chillPerSecond: special.chillPerSecond ?? 0,
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
				speed:
					Math.max(220, payloadWeapon.projectileSpeed || turretWeapon.projectileSpeed) *
					(turretWeapon.attack.special.projectileSpeedMultiplier ?? 1),
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
			speed = weapon.projectileSpeed,
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
					speed: weapon.projectileSpeed * special.fragmentSpeedMultiplier,
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
					speed: weapon.projectileSpeed * special.fragmentSpeedMultiplier,
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
					speed: weapon.projectileSpeed * shrapnel.fragmentSpeedMultiplier,
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
					speed: weapon.projectileSpeed * shrapnel.fragmentSpeedMultiplier,
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
			if (weapon.cyclesUntilTrigger > 1) {
				weapon.cyclesUntilTrigger -= 1;
				return;
			}

			weapon.cyclesUntilTrigger = weapon.cycleInterval;
			weaponDamageMultiplierByInstanceId[weapon.instanceId] = pendingNextWeaponDamageMultiplier;
			pendingNextWeaponDamageMultiplier = 1;

			const weaponModule = getWeaponModule(weapon.definition.id);
			const result = weaponModule.activate(weapon, target, {
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
				spawnFanKnifeBurst: (definition, instanceId, burstTarget) => {
					const knifeSiphon = knifeSiphonUtilityByFanInstanceId.get(instanceId);
					const damageMultiplier = knifeSiphon?.damageMultiplier ?? 1;
					const burstSpecial = definition.attack.special;

					if (burstSpecial?.type !== 'fan-knives') {
						return;
					}

					const projectileCount = Math.max(1, burstSpecial.projectileCount);
					const projectilesPerEmission = 3;
					const angleStep =
						((burstSpecial.burstArcDegrees / 180) * Math.PI) / projectilesPerEmission;
					const baseAngle = Math.atan2(burstTarget.y - centerY, burstTarget.x - centerX);

					fanKnifeBursts.push({
						sourceWeaponInstanceId: instanceId,
						baseAngle,
						angleStep,
						spinRate: Math.PI * 5.5,
						projectileCount,
						projectilesReleased: 0,
						projectilesPerEmission,
						emissionInterval: 0.026,
						emissionTimer: 0,
						damage: getAdjustedWeaponDamage(definition, damageMultiplier, instanceId),
						color: definition.projectileVisual.color,
						glow: true,
						age: 0
					});
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
						speed: Math.max(280, definition.projectileSpeed),
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
				getShieldPoolForSource: (sourceId) => pixlShieldSources[sourceId] ?? 0,
				setShieldPoolForSource: (sourceId, shieldPercent) => {
					pixlShieldSources[sourceId] = Math.ceil(pixlProgression.health * shieldPercent);
				},
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

			highestClearedLevel = Math.max(highestClearedLevel, currentLevel.campaignLevel);

			if (endlessMode) {
				highestUnlockedLevel = Math.max(highestUnlockedLevel, currentLevel.campaignLevel + 1);
				persistProgress(
					currentLevel.campaignLevel + 1,
					rewardPacks,
					currentLevel.campaignLevel,
					false
				);
			} else if (status === 'complete') {
				completed = true;
				highestUnlockedLevel = campaign.totalLevels;
				persistProgress(campaign.totalLevels, rewardPacks, currentLevel.campaignLevel, false);
			} else {
				highestUnlockedLevel = Math.max(highestUnlockedLevel, currentLevel.campaignLevel + 1);
				persistProgress(
					currentLevel.campaignLevel + 1,
					rewardPacks,
					currentLevel.campaignLevel,
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
				spawnEnemy(spawnQueue.shift() as GlitchKind);
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
					const pushDistance = field.lineWidth + enemyRadius + 12;
					enemy.x += directionX * pushDistance;
					enemy.y += directionY * pushDistance;
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
						damagePerSecond: special.damagePerSecond ?? 0,
						chillPerSecond: special.chillPerSecond ?? 0,
						freezeDuration: special.freezeDuration ?? 0,
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
					const damagePerSecond = Math.max(leftRod.damagePerSecond, rightRod.damagePerSecond);
					const chillPerSecond = Math.max(leftRod.chillPerSecond, rightRod.chillPerSecond);
					const freezeDuration = Math.max(leftRod.freezeDuration, rightRod.freezeDuration);
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

						if (damagePerSecond > 0) {
							applyDamageToEnemy(
								enemyIndex,
								damagePerSecond * dt,
								0.06,
								leftRod.sourceWeaponInstanceId,
								{
									applyWeaponHitEffects: false,
									allowContextHealing: false
								}
							);
						}

						const updatedEnemy = enemies[enemyIndex];

						if (!updatedEnemy) {
							continue;
						}

						if (chillPerSecond > 0) {
							applyChillToEnemy(updatedEnemy, chillPerSecond * dt, freezeDuration);
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
				burst.age += dt;

				if (burst.age >= burst.duration) {
					hemorrhageBursts.splice(index, 1);
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

		const fireEnemyProjectile = (
			enemy: EnemyState,
			stats: (typeof combatProfile.glitches)[GlitchKind]
		) => {
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

		const updateEnemies = (dt: number) => {
			ensureMarkedEnemy();
			const mineGravityAugmentEffect = getActiveMineGravityAugmentEffect();

			for (let index = enemies.length - 1; index >= 0; index -= 1) {
				if (updateBleedOnEnemy(index, dt)) {
					continue;
				}

				const enemy = enemies[index];
				const stats = combatProfile.glitches[enemy.kind];
				const contactRange = getEnemyContactRange(enemy.kind);
				const isSiege = stats.attackPattern === 'siege';
				const isHybrid = stats.attackPattern === 'hybrid';
				enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
				enemy.confusionTimer = Math.max(0, enemy.confusionTimer - dt);
				enemy.voidTouchedTimer = Math.max(0, enemy.voidTouchedTimer - dt);
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
				const moveSpeedMultiplier =
					confusionMultiplier * chillMultiplier * oathbreakerSlowMultiplier;
				const effectiveMoveSpeed =
					stats.moveSpeed * moveSpeedMultiplier * enemy.moveSpeedMultiplier;

				if (immobilized) {
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
							mineGravityAugmentEffect.pullStrength * (0.45 + pullFalloff * 0.55) * dt
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

				if (isSiege) {
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

					if (!isHybrid) {
						continue;
					}
				}

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

					if (isSiege || isHybrid) {
						fireEnemyProjectile(enemy, stats);

						if (isSiege) {
							continue;
						}
					}

					applyDamageToPixl(
						Math.max(
							1,
							Math.round(stats.contactDamage * enemy.damageMultiplier + enemy.damageBonus)
						)
					);

					if (pixlHealth === 0) {
						return;
					}
				}
			}
		};

		const updateEnemyProjectiles = (dt: number) => {
			for (let index = enemyProjectiles.length - 1; index >= 0; index -= 1) {
				const projectile = enemyProjectiles[index];
				projectile.age += dt;
				projectile.x += projectile.vx * dt;
				projectile.y += projectile.vy * dt;

				const hitDistance = Math.hypot(projectile.x - centerX, projectile.y - centerY);
				if (hitDistance <= combatProfile.collision.pixlRadius + projectile.size * 0.5) {
					applyDamageToPixl(projectile.damage);
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
				const alphaHex = Math.round((1 - progress) * 180)
					.toString(16)
					.padStart(2, '0');
				const splashRadius = burst.radius * (0.18 + progress * 0.92);
				const coreRadius = burst.radius * (0.62 + (1 - progress) * 0.18);

				p.noStroke();
				p.fill(`#2f0808${alphaHex}`);
				p.circle(burst.centerX, burst.centerY, coreRadius * 1.7);
				p.fill(`${burst.color}${alphaHex}`);
				p.circle(burst.centerX, burst.centerY, coreRadius * 1.2);
				p.fill(`#7f1d1d${alphaHex}`);
				p.circle(burst.centerX, burst.centerY, coreRadius * 0.7);

				for (let dropletIndex = 0; dropletIndex < 11; dropletIndex += 1) {
					const angle = (dropletIndex / 11) * p.TWO_PI + dropletIndex * 0.37;
					const travel = splashRadius * (0.52 + (dropletIndex % 4) * 0.18);
					const dropletX = burst.centerX + Math.cos(angle) * travel;
					const dropletY = burst.centerY + Math.sin(angle) * travel * 0.82;
					const dropletSize = Math.max(4, burst.radius * (0.16 - dropletIndex * 0.007));

					p.fill(dropletIndex % 3 === 0 ? `#fecaca${alphaHex}` : `${burst.color}${alphaHex}`);
					p.circle(dropletX, dropletY, dropletSize * (1.1 - progress * 0.18));
					p.fill(`#7f1d1d${alphaHex}`);
					p.circle(
						dropletX + Math.cos(angle) * dropletSize * 0.08,
						dropletY + Math.sin(angle) * dropletSize * 0.08,
						dropletSize * 0.52
					);
				}

				for (let streakIndex = 0; streakIndex < 5; streakIndex += 1) {
					const angle = (streakIndex / 5) * p.TWO_PI + 0.24;
					const innerX = burst.centerX + Math.cos(angle) * coreRadius * 0.4;
					const innerY = burst.centerY + Math.sin(angle) * coreRadius * 0.4;
					const outerX = burst.centerX + Math.cos(angle) * splashRadius * 0.92;
					const outerY = burst.centerY + Math.sin(angle) * splashRadius * 0.92;

					p.stroke(`#7f1d1d${alphaHex}`);
					p.strokeWeight(Math.max(1.2, burst.radius * 0.08));
					p.line(innerX, innerY, outerX, outerY);
				}

				p.noStroke();
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
					const stats = combatProfile.glitches[enemy.kind];
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
				updateWaveFlow(dt);
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
				updateNeedleBursts(dt);
				updateExecutionLatticeStrikes(dt);
				updateForkLightningBursts(dt);
				updateFlamethrowerCones(dt);
				updateFanKnifeBursts(dt);
				updateIceSpikes(dt);
				updateBlizzardStorms(dt);
				updatePixlSwallowPulses(dt);
				updateVoidTendrils(dt);
				updateHemorrhageBursts(dt);
				updateEnemies(dt);
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
							emitProgressState(currentLevel.campaignLevel + 1);
							startLevel(currentLevelIndex + 1);
						} else if (status === 'complete') {
							emitProgressState(campaign.totalLevels);
							startLevel(0);
						} else {
							emitProgressState(currentLevel.campaignLevel + 1);
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
