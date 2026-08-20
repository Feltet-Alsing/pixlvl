import type P5 from 'p5';

import { campaign1 } from '$lib/data/campaigns/campaign-1';
import {
	getCampaignCombatProfile,
	getCampaignWeaponPool,
	getLoadoutItemDefinition,
	getWeaponDefinition,
	isUtilityDefinition,
	isWeaponDefinition
} from '$lib/data';
import { getActiveLoadoutPlacements } from '$lib/game/loadout-slots';
import { getPlacementRotation, rotateWeaponShape } from '$lib/game/loadout-rotation';
import { createUpgradedWeaponDefinition } from '$lib/game/weapon-upgrades';
import { applyXpGain, createUpgradeablePixlState } from '$lib/game/upgrades';
import type {
	CampaignDefinition,
	CampaignLevel,
	CombatProfile,
	GlitchKind,
	LoadoutItemDefinition,
	OwnedWeaponInstance,
	PersistedRewardPack,
	PersistedRewardPackCard,
	UtilityDefinition,
	WeaponAttackBehavior,
	ElementalInfusionType,
	WeaponDefinition,
	WeaponProjectileShape,
	WeaponRarity,
	WeaponProjectileSize,
	WeaponTargetingKind,
	WeaponProjectileMotion,
	WeaponTrailStyle,
	WeaponShape
} from '$lib/data/types';
import type { PersistedCampaignProgress, PersistedPixlState } from '$lib/server/game-state';

const MAX_WIDTH = 760;
const BASE_HEIGHT = 520;
const FIXED_ARENA_RADIUS = BASE_HEIGHT * 0.42;
const FIXED_SPAWN_RADIUS = FIXED_ARENA_RADIUS;
const ARENA_VERTICAL_OFFSET_RATIO = 0.1;
const LOADOUT_COLUMN_COUNT = 8;
const LEVEL_CLEAR_DELAY = 3;
const LEVEL_RESET_DELAY = 1.2;
const CAMPAIGN_LOOP_DELAY = 3;
const LOADOUT_PREVIEW_MAX_WIDTH = 320;
const LOADOUT_PREVIEW_BASE_HEIGHT = 240;
const PACK_CARD_COUNT = 5;
const GUARANTEED_PACK_SLOT_INDEX = 4;
const NO_GUARANTEED_PACK_SLOT_INDEX = -1;

const NORMAL_SLOT_RARITY_WEIGHTS: Record<WeaponRarity, number> = {
	normal: 5,
	magic: 4,
	rare: 3,
	exotic: 2,
	legendary: 1
};

const PROJECTILE_SIZE_BY_VISUAL: Record<WeaponProjectileSize, number> = {
	small: 5,
	medium: 8,
	large: 12
};

const WEAPON_FILL_BY_RARITY: Record<WeaponRarity, [number, number, number]> = {
	normal: [236, 236, 236],
	magic: [84, 150, 255],
	rare: [255, 210, 74],
	exotic: [224, 74, 74],
	legendary: [160, 94, 36]
};

const ENEMY_VISUALS: Record<
	GlitchKind,
	{
		radius: number;
		fill: [number, number, number];
		stroke?: [number, number, number];
		shape?: 'circle' | 'square' | 'diamond' | 'triangle';
	}
> = {
	biter: {
		radius: 8,
		fill: [196, 196, 196],
		shape: 'circle'
	},
	swarmer: {
		radius: 6,
		fill: [232, 232, 232],
		shape: 'square'
	},
	tanker: {
		radius: 13,
		fill: [96, 96, 96],
		stroke: [255, 255, 255],
		shape: 'circle'
	},
	shard: {
		radius: 9,
		fill: [68, 214, 255],
		stroke: [216, 247, 255],
		shape: 'triangle'
	},
	bulwark: {
		radius: 15,
		fill: [128, 95, 245],
		stroke: [244, 239, 255],
		shape: 'diamond'
	},
	shielder: {
		radius: 14,
		fill: [92, 156, 255],
		stroke: [220, 236, 255],
		shape: 'circle'
	},
	zerglitch: {
		radius: 22,
		fill: [188, 72, 72],
		stroke: [255, 205, 205],
		shape: 'circle'
	}
};

const glitchOrder: GlitchKind[] = [
	'biter',
	'swarmer',
	'tanker',
	'shard',
	'bulwark',
	'shielder',
	'zerglitch'
];
const compositionKeyByKind = {
	biter: 'biters',
	swarmer: 'swarmers',
	tanker: 'tankers',
	shard: 'shard',
	bulwark: 'bulwark',
	shielder: 'shielder',
	zerglitch: 'zerglitch'
} as const;

type WaveStatus = 'running' | 'cleared' | 'defeated' | 'complete';
type RunMode = 'management' | 'combat';

interface EnemyState {
	id: number;
	kind: GlitchKind;
	x: number;
	y: number;
	health: number;
	maxHealth: number;
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
	vulnerableTimer: number;
	chillAmount: number;
	frozenTimer: number;
	moveSpeedMultiplier: number;
	damageMultiplier: number;
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
	targetX: number;
	targetY: number;
	age: number;
	duration: number;
	damage: number;
	healPerHit: number;
	color: string;
	glow: boolean;
	hasHit: boolean;
}

interface EquippedWeaponState {
	instanceId: string;
	definition: WeaponDefinition;
	shape: WeaponShape;
	targeting: WeaponTargetingKind;
	triggerColumn: number;
	placementX: number;
	placementY: number;
	cycleInterval: number;
	cyclesUntilTrigger: number;
}

interface EquippedUtilityState {
	instanceId: string;
	definition: UtilityDefinition;
	shape: WeaponShape;
	triggerColumn: number;
	placementX: number;
	placementY: number;
	cycleInterval: number;
	cyclesUntilTrigger: number;
}

interface EquippedLoadoutEntry {
	instanceId: string;
	ownedWeapon: OwnedWeaponInstance;
	definition: LoadoutItemDefinition;
	shape: WeaponShape;
	targeting: WeaponTargetingKind | undefined;
	triggerColumn: number;
	placementX: number;
	placementY: number;
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

interface CampaignSketchOptions {
	persistPath?: string;
	runMode?: RunMode;
	showLoadoutSketch?: boolean;
	resumeState?: CampaignCombatResumeState | null;
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
	onResumeStateChange?: (state: CampaignCombatResumeState) => void;
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
		currentLevel: number;
		highestUnlockedLevel: number;
		highestClearedLevel: number;
		completed: boolean;
	}) => void;
}

export interface CampaignCombatResumeState {
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
	activeShieldColor: string;
	enemyId: number;
	spawnQueue: GlitchKind[];
	enemies: EnemyState[];
	highestUnlockedLevel: number;
	highestClearedLevel: number;
	completed: boolean;
}

function createRewardPackId(randomInt: number) {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return `pack-${Date.now()}-${randomInt}`;
}

function getCanvasSize(canvas: HTMLCanvasElement | null) {
	const parentWidth = canvas?.parentElement?.clientWidth ?? MAX_WIDTH;
	const parentHeight = canvas?.parentElement?.clientHeight ?? BASE_HEIGHT;
	const width = Math.max(1, Math.round(parentWidth));
	const height = Math.max(1, Math.round(parentHeight));

	return {
		width,
		height
	};
}

function getLoadoutPreviewCanvasSize(canvas: HTMLCanvasElement | null) {
	const parentWidth = canvas?.parentElement?.clientWidth ?? LOADOUT_PREVIEW_MAX_WIDTH;
	const parentHeight = canvas?.parentElement?.clientHeight ?? LOADOUT_PREVIEW_BASE_HEIGHT;
	const width = Math.max(1, Math.min(Math.round(parentWidth), LOADOUT_PREVIEW_MAX_WIDTH));
	const height = Math.max(1, Math.round(parentHeight));

	return {
		width,
		height
	};
}

function buildSpawnQueue(level: CampaignLevel): GlitchKind[] {
	const queue: GlitchKind[] = [];

	for (const kind of glitchOrder) {
		for (let index = 0; index < (level.composition[compositionKeyByKind[kind]] ?? 0); index += 1) {
			queue.push(kind);
		}
	}

	return queue;
}

function shuffleInPlace<T>(items: T[], p: P5) {
	for (let index = items.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(p.random(index + 1));
		const current = items[index];
		items[index] = items[randomIndex];
		items[randomIndex] = current;
	}

	return items;
}

function getLoadoutItemTriggerColumn(shape: WeaponShape, placementX: number) {
	const leftmostShapeColumn = Math.min(...shape.cells.map(([cellX]) => cellX));

	return placementX + leftmostShapeColumn;
}

function buildEquippedLoadoutEntries(
	ownedWeapons: OwnedWeaponInstance[] | null | undefined,
	loadoutPlacements: PersistedPixlState['loadoutPlacements'] | null | undefined,
	loadoutColumnCount = LOADOUT_COLUMN_COUNT
): EquippedLoadoutEntry[] {
	if (!Array.isArray(ownedWeapons) || !loadoutPlacements) {
		return [];
	}

	const activeLoadoutPlacements = getActiveLoadoutPlacements(loadoutPlacements);

	const ownedWeaponMap = new Map(ownedWeapons.map((weapon) => [weapon.instanceId, weapon]));
	const entries: EquippedLoadoutEntry[] = [];

	for (const placement of activeLoadoutPlacements) {
		const ownedWeapon = ownedWeaponMap.get(placement.weaponInstanceId);

		if (!ownedWeapon) {
			continue;
		}

		const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);
		const shape = rotateWeaponShape(definition.shape, getPlacementRotation(placement));
		const triggerColumn = getLoadoutItemTriggerColumn(shape, placement.x);
		const targeting = isWeaponDefinition(definition)
			? (placement.targeting ?? definition.attack.targeting)
			: undefined;

		if (triggerColumn < 0 || triggerColumn >= loadoutColumnCount) {
			continue;
		}

		entries.push({
			instanceId: ownedWeapon.instanceId,
			ownedWeapon,
			definition,
			shape,
			targeting,
			triggerColumn,
			placementX: placement.x,
			placementY: placement.y
		});
	}

	return entries.sort(
		(left, right) =>
			left.triggerColumn - right.triggerColumn || left.instanceId.localeCompare(right.instanceId)
	);
}

function buildEquippedWeapons(entries: EquippedLoadoutEntry[]) {
	return entries
		.filter((entry): entry is EquippedLoadoutEntry & { definition: WeaponDefinition } =>
			isWeaponDefinition(entry.definition)
		)
		.map((entry) => {
			const definition = createUpgradedWeaponDefinition(entry.ownedWeapon, entry.definition);

			return {
				instanceId: entry.instanceId,
				definition,
				shape: entry.shape,
				targeting: entry.targeting ?? definition.attack.targeting,
				triggerColumn: entry.triggerColumn,
				placementX: entry.placementX,
				placementY: entry.placementY,
				cycleInterval: Math.max(1, definition.attack.cycleInterval ?? 1),
				cyclesUntilTrigger: Math.max(1, definition.attack.cycleInterval ?? 1)
			};
		}) satisfies EquippedWeaponState[];
}

function buildEquippedUtilities(entries: EquippedLoadoutEntry[]) {
	return entries
		.filter((entry): entry is EquippedLoadoutEntry & { definition: UtilityDefinition } =>
			isUtilityDefinition(entry.definition)
		)
		.map((entry) => ({
			instanceId: entry.instanceId,
			definition: entry.definition,
			shape: entry.shape,
			triggerColumn: entry.triggerColumn,
			placementX: entry.placementX,
			placementY: entry.placementY,
			cycleInterval: Math.max(1, entry.definition.cycleInterval ?? 1),
			cyclesUntilTrigger: Math.max(1, entry.definition.cycleInterval ?? 1)
		})) satisfies EquippedUtilityState[];
}

function getPlacedShapeCells(shape: WeaponDefinition['shape'], originX: number, originY: number) {
	return shape.cells.map(
		([cellX, cellY]) => [originX + cellX, originY + cellY] as [number, number]
	);
}

function doCellsTouchByEdge(
	leftCells: Array<[number, number]>,
	rightCells: Array<[number, number]>
) {
	for (const [leftX, leftY] of leftCells) {
		for (const [rightX, rightY] of rightCells) {
			if (Math.abs(leftX - rightX) + Math.abs(leftY - rightY) === 1) {
				return true;
			}
		}
	}

	return false;
}

function createEmptyElementalInfusions(): Record<ElementalInfusionType, number> {
	return {
		fire: 0,
		lightning: 0,
		cold: 0,
		void: 0
	};
}

export function createCampaignSketch(
	campaign: CampaignDefinition,
	combatProfile: CombatProfile,
	options: CampaignSketchOptions = {}
) {
	return (p: P5) => {
		const levels = campaign.levels;
		const weaponPool = getCampaignWeaponPool(campaign.campaign);
		const runMode = options.runMode ?? 'combat';
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
		const passiveUtilities = equippedUtilities.filter(
			(utility) => utility.definition.activationKind === 'passive'
		);
		const triggeredUtilities = equippedUtilities.filter(
			(utility) => utility.definition.activationKind === 'triggered'
		);

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
			Math.min((options.campaignState?.currentLevel ?? 1) - 1, levels.length - 1)
		);
		let currentLevel = levels[currentLevelIndex];
		let status: WaveStatus = 'running';
		let statusTimer = 0;
		let currentSweepIndex = 0;
		let spawnAccumulator = 0;
		let sweepProgress = 0;
		let bankedXp = pixlProgression.xp;
		const ownedWeapons = [...(options.pixlState?.ownedWeapons ?? [])];
		let waveXp = 0;
		let waveDrops: OwnedWeaponInstance[] = [];
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
		let weaponDamageMultiplierByInstanceId = Object.fromEntries(
			equippedWeapons.map((weapon) => [weapon.instanceId, 1])
		) as Record<string, number>;
		let elementalInfusions = createEmptyElementalInfusions();
		let cycleDamageMultiplier = 1;
		let cycleDamageBuffExpiresAfterSweepIndex: number | null = null;
		let activeShieldColor = '#60a5fa';
		let pixlFlash = 0;
		let enemyId = 0;
		let spawnQueue: GlitchKind[] = [];
		let enemies: EnemyState[] = [];
		let projectiles: ProjectileState[] = [];
		let enemyProjectiles: EnemyProjectileState[] = [];
		let forceFields: ForceFieldState[] = [];
		let stasisFields: StasisFieldState[] = [];
		let laserSweeps: LaserSweepState[] = [];
		let needleBursts: NeedleBurstState[] = [];
		let executionLatticeStrikes: ExecutionLatticeStrikeState[] = [];
		let forkLightningBursts: ForkLightningState[] = [];
		let flamethrowerCones: FlamethrowerConeState[] = [];
		let iceSpikes: IceSpikeState[] = [];
		let blizzardStorms: BlizzardStormState[] = [];
		let voidTendrils: VoidTendrilState[] = [];
		let voidTunnels: VoidTunnelState[] = [];
		let phaseshifts: PhaseshiftState[] = [];
		let burningGrounds: BurningGroundState[] = [];
		let delayedBombs: DelayedBombState[] = [];
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
			const resumeState: CampaignCombatResumeState = {
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

		const getLevelPackDropChance = () => {
			if (currentLevel.isCampaignBoss) {
				return campaign.campaign === 1 ? 0.2 : 0.1;
			}

			return campaign.campaign === 1 ? 0.1 : 0.05;
		};

		const getNormalPackDropChance = () => Math.min(1, getLevelPackDropChance() * 3);

		const isSpecialPackStage = () => currentLevel.stage >= 4 && currentLevel.stage <= 5;

		const getEligiblePackDefinitions = () => {
			return weaponPool.filter((item) => {
				if (item.drop.mode !== 'drop') {
					return false;
				}

				if (item.drop.campaignId && item.drop.campaignId !== campaign.campaign) {
					return false;
				}

				if (item.drop.stageStart && currentLevel.stage < item.drop.stageStart) {
					return false;
				}

				if (item.drop.stageEnd && currentLevel.stage > item.drop.stageEnd) {
					return false;
				}

				return true;
			});
		};

		const getGuaranteedPackDefinitions = () => {
			return weaponPool.filter((item) => {
				if (item.drop.mode !== 'drop') {
					return false;
				}

				if (item.drop.campaignId && item.drop.campaignId !== campaign.campaign) {
					return false;
				}

				return item.rarity === 'exotic' || item.rarity === 'legendary';
			});
		};

		const chooseRandomPackDefinition = (
			candidates: LoadoutItemDefinition[],
			rarity: WeaponRarity,
			fallbacks: WeaponRarity[] = []
		) => {
			for (const nextRarity of [rarity, ...fallbacks]) {
				const matchingCandidates = candidates.filter(
					(candidate) => candidate.rarity === nextRarity
				);

				if (matchingCandidates.length === 0) {
					continue;
				}

				return matchingCandidates[Math.floor(p.random(matchingCandidates.length))] ?? null;
			}

			return null;
		};

		const chooseWeightedNormalSlotRarity = (candidates: LoadoutItemDefinition[]) => {
			const availableRarities = Object.entries(NORMAL_SLOT_RARITY_WEIGHTS).filter(([rarity]) =>
				candidates.some((candidate) => candidate.rarity === rarity)
			) as Array<[WeaponRarity, number]>;

			if (availableRarities.length === 0) {
				return null;
			}

			const totalWeight = availableRarities.reduce((sum, [, weight]) => sum + weight, 0);
			let roll = p.random(totalWeight);

			for (const [rarity, weight] of availableRarities) {
				roll -= weight;

				if (roll <= 0) {
					return rarity;
				}
			}

			return availableRarities[availableRarities.length - 1]?.[0] ?? null;
		};

		const createRewardPackCard = (
			slotIndex: number,
			definition: LoadoutItemDefinition,
			isGuaranteedSlot: boolean
		): PersistedRewardPackCard => ({
			slotIndex,
			definitionId: definition.id,
			rarity: definition.rarity,
			isGuaranteedSlot
		});

		const createRewardPack = (
			cards: PersistedRewardPackCard[],
			guaranteedSlotIndex: number
		): PersistedRewardPack => ({
			id: createRewardPackId(Math.floor(p.random(1_000_000_000))),
			ownerUserId: '',
			campaignId: campaign.campaign,
			sourceCampaignLevel: currentLevel.campaignLevel,
			droppedAt: new Date().toISOString(),
			openedAt: null,
			status: 'unopened',
			cardCount: cards.length,
			guaranteedSlotIndex,
			contentVersion: 1,
			cards
		});

		const createNormalRewardPack = (eligibleDefinitions: LoadoutItemDefinition[]) => {
			const cards: PersistedRewardPackCard[] = [];

			for (let slotIndex = 0; slotIndex < PACK_CARD_COUNT; slotIndex += 1) {
				const rarity = chooseWeightedNormalSlotRarity(eligibleDefinitions);

				if (!rarity) {
					return null;
				}

				const definition = chooseRandomPackDefinition(eligibleDefinitions, rarity, [
					'normal',
					'magic',
					'rare',
					'exotic',
					'legendary'
				]);

				if (!definition) {
					return null;
				}

				cards.push(createRewardPackCard(slotIndex, definition, false));
			}

			return createRewardPack(cards, NO_GUARANTEED_PACK_SLOT_INDEX);
		};

		const createSpecialRewardPack = (
			eligibleDefinitions: LoadoutItemDefinition[],
			guaranteedDefinitions: LoadoutItemDefinition[]
		) => {
			const guaranteedRarity = p.random() < 0.5 ? 'exotic' : 'legendary';
			const guaranteedDefinition = chooseRandomPackDefinition(
				guaranteedDefinitions,
				guaranteedRarity,
				[guaranteedRarity === 'legendary' ? 'exotic' : 'legendary']
			);

			if (!guaranteedDefinition) {
				return null;
			}

			const cards: PersistedRewardPackCard[] = [];

			for (let slotIndex = 0; slotIndex < PACK_CARD_COUNT - 1; slotIndex += 1) {
				const rarity = chooseWeightedNormalSlotRarity(eligibleDefinitions);

				if (!rarity) {
					return null;
				}

				const definition = chooseRandomPackDefinition(eligibleDefinitions, rarity, [
					'normal',
					'magic',
					'rare',
					'exotic',
					'legendary'
				]);

				if (!definition) {
					return null;
				}

				cards.push(createRewardPackCard(slotIndex, definition, false));
			}

			cards.push(createRewardPackCard(GUARANTEED_PACK_SLOT_INDEX, guaranteedDefinition, true));

			return createRewardPack(cards, GUARANTEED_PACK_SLOT_INDEX);
		};

		const syncCanvasSize = () => {
			if (!canvas) {
				return;
			}

			const { width, height } = getCanvasSize(canvas);

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
			currentLevel = levels[currentLevelIndex];
			levelRewardsCommitted = false;
			status = 'running';
			statusTimer = 0;
			currentSweepIndex = 0;
			spawnAccumulator = 0;
			sweepProgress = 0;
			waveXp = 0;
			waveDrops = [];
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
			pixlFlash = 0;
			enemyId = 0;
			enemies = [];
			projectiles = [];
			enemyProjectiles = [];
			forceFields = [];
			stasisFields = [];
			laserSweeps = [];
			needleBursts = [];
			executionLatticeStrikes = [];
			forkLightningBursts = [];
			flamethrowerCones = [];
			iceSpikes = [];
			blizzardStorms = [];
			voidTendrils = [];
			voidTunnels = [];
			phaseshifts = [];
			burningGrounds = [];
			delayedBombs = [];
			sniperLocks = [];
			sniperChainBursts = [];
			spawnQueue = shuffleInPlace(buildSpawnQueue(currentLevel), p);

			if (spawnQueue.length > 0) {
				spawnEnemy(spawnQueue.shift() as GlitchKind);
			}
		};

		const getCurrentStageStartLevelIndex = () => {
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

			return Math.max(
				1,
				Math.round(weapon.baseDamage * cycleDamageMultiplier * multiplier * sourceDamageMultiplier)
			);
		};

		const rollLevelRewardPacks = () => {
			const eligibleDefinitions = getEligiblePackDefinitions();

			if (eligibleDefinitions.length === 0) {
				return [] as PersistedRewardPack[];
			}

			const rewardPacks: PersistedRewardPack[] = [];

			if (p.random() < getNormalPackDropChance()) {
				const normalPack = createNormalRewardPack(eligibleDefinitions);

				if (normalPack) {
					rewardPacks.push(normalPack);
				}
			}

			if (!isSpecialPackStage()) {
				return rewardPacks;
			}

			const guaranteedDefinitions = getGuaranteedPackDefinitions();

			if (guaranteedDefinitions.length === 0) {
				return rewardPacks;
			}

			if (p.random() >= getLevelPackDropChance()) {
				return rewardPacks;
			}

			const specialPack = createSpecialRewardPack(eligibleDefinitions, guaranteedDefinitions);

			if (specialPack) {
				rewardPacks.push(specialPack);
			}

			return rewardPacks;
		};

		const createEnemyState = (
			kind: GlitchKind,
			x: number,
			y: number,
			overrides?: Partial<
				Pick<
					EnemyState,
					'holdRadius' | 'orbitDirection' | 'health' | 'maxHealth' | 'moveSpeedMultiplier'
				>
			>
		): EnemyState => {
			const stats = combatProfile.glitches[kind];
			const attackInterval = 1 / stats.attackSpeed;
			const preferredRange = stats.preferredRange ?? getEnemyContactRange(kind);
			const holdRadius =
				stats.attackPattern === 'siege' ? FIXED_SPAWN_RADIUS : preferredRange + p.random(-12, 16);
			const healthMultiplier = getEnemyStageMultiplier('healthPerStage');
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
				vulnerableTimer: 0,
				chillAmount: 0,
				frozenTimer: 0,
				moveSpeedMultiplier: overrides?.moveSpeedMultiplier ?? 1,
				damageMultiplier: getEnemyStageMultiplier('damagePerStage')
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

		const spawnEnemy = (kind: GlitchKind) => {
			const angle = p.random(p.TWO_PI);
			const x = centerX + Math.cos(angle) * FIXED_SPAWN_RADIUS;
			const y = centerY + Math.sin(angle) * FIXED_SPAWN_RADIUS;

			enemies.push(createEnemyState(kind, x, y));
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
				if (enemy.kind === 'bulwark') {
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
				.filter((enemy) => !excludeEnemyIds.includes(enemy.id))
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

		const getWeaponTargetFromPool = (
			targetPool: EnemyState[],
			targeting: WeaponAttackBehavior['targeting']
		) => {
			if (targetPool.length === 0) {
				return null;
			}

			if (targeting === 'strongest-target') {
				return [...targetPool].sort((left, right) => right.health - left.health)[0] ?? null;
			}

			if (targeting === 'weakest-target') {
				return [...targetPool].sort((left, right) => left.health - right.health)[0] ?? null;
			}

			if (targeting === 'furthest-target') {
				return (
					[...targetPool].sort(
						(left, right) =>
							Math.hypot(right.x - centerX, right.y - centerY) -
							Math.hypot(left.x - centerX, left.y - centerY)
					)[0] ?? null
				);
			}

			return (
				[...targetPool].sort(
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
			if (targeting === 'strongest-target') {
				return [...enemies].sort((left, right) => right.health - left.health)[0] ?? null;
			}

			if (targeting === 'weakest-target') {
				return [...enemies].sort((left, right) => left.health - right.health)[0] ?? null;
			}

			if (targeting === 'furthest-target') {
				return getFurthestEnemy();
			}

			return getClosestEnemy();
		};

		const getClosestEnemies = (count: number) => {
			return [...enemies]
				.sort(
					(left, right) =>
						Math.hypot(left.x - centerX, left.y - centerY) -
						Math.hypot(right.x - centerX, right.y - centerY)
				)
				.slice(0, count);
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

		const easeInQuad = (progress: number) => {
			const clamped = Math.max(0, Math.min(1, progress));
			return clamped * clamped;
		};

		const awardEnemyDefeat = (enemyIndex: number) => {
			const defeatedEnemy = enemies[enemyIndex];

			if (!defeatedEnemy) {
				return;
			}

			waveXp += currentLevel.xpPerEnemy[defeatedEnemy.kind] ?? 0;

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
			sourceWeaponInstanceId?: string
		) => {
			const enemy = enemies[enemyIndex];

			if (!enemy) {
				return { defeated: false, actualDamage: 0 };
			}

			const stats = combatProfile.glitches[enemy.kind];
			let remainingDamage = damage;
			let actualDamage = 0;
			const sourceWeapon = sourceWeaponInstanceId
				? (equippedWeapons.find((weapon) => weapon.instanceId === sourceWeaponInstanceId)
						?.definition ?? null)
				: null;

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
				if (sourceWeapon?.attack.special?.type === 'shield-steal' && sourceWeaponInstanceId) {
					addPixlShieldFromSource(
						`${sourceWeaponInstanceId}-shield-steal`,
						actualDamage * sourceWeapon.attack.special.shieldRatio,
						sourceWeapon.projectileVisual.color
					);
				}
				applyBlackHoleLifeSteal(enemy, actualDamage);
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
			if (sourceWeapon?.attack.special?.type === 'shield-steal' && sourceWeaponInstanceId) {
				addPixlShieldFromSource(
					`${sourceWeaponInstanceId}-shield-steal`,
					actualDamage * sourceWeapon.attack.special.shieldRatio,
					sourceWeapon.projectileVisual.color
				);
			}
			applyBlackHoleLifeSteal(enemy, actualDamage);

			if (sourceWeapon?.attack.special?.type === 'vulnerable-hit') {
				enemy.vulnerableTimer = Math.max(
					enemy.vulnerableTimer,
					sourceWeapon.attack.special.duration
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

			if (enemy.health <= 0) {
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
						applyDamageToEnemy(enemyIndex, burst.damage, 0.09, burst.sourceWeaponInstanceId);
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
					damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					age: 0,
					hitEnemyIds: []
				});
			}
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

			burningGrounds.push({
				sourceWeaponInstanceId,
				centerX,
				centerY,
				radius: special.radius,
				damagePerTick: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
				tickInterval: special.tickInterval,
				tickTimer: special.tickInterval,
				impactSize: special.impactSize,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.durationCycles / Math.max(0.001, pixlProgression.attackSpeed)
			});
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
				: getWeaponTarget(weapon.attack.targeting);

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

		const spawnVoidTendrils = (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'void-tendrils') {
				return;
			}

			const targets = getClosestEnemies(Math.max(1, special.targetCount));

			for (const target of targets) {
				voidTendrils.push({
					sourceWeaponInstanceId,
					enemyId: target.id,
					targetX: target.x,
					targetY: target.y,
					age: 0,
					duration: special.duration,
					damage: getAdjustedWeaponDamage(weapon, 1, sourceWeaponInstanceId),
					healPerHit: special.healPerHit,
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					hasHit: false
				});
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
			arrivalTriggerRadius = 0
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
				homingTargetEnemyId: weapon.id === 'heavy-orb' ? (target?.id ?? null) : null,
				homingTurnRate: weapon.id === 'heavy-orb' ? 2.4 : 0,
				collidesWithEnemies,
				impactTargetX,
				impactTargetY,
				arrivalEffect,
				arrivalTriggerRadius
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

		const activateWeapon = (weapon: EquippedWeaponState, target: EnemyState) => {
			if (weapon.cyclesUntilTrigger > 1) {
				weapon.cyclesUntilTrigger -= 1;
				return;
			}

			weapon.cyclesUntilTrigger = weapon.cycleInterval;
			weaponDamageMultiplierByInstanceId[weapon.instanceId] = pendingNextWeaponDamageMultiplier;
			pendingNextWeaponDamageMultiplier = 1;

			const special = weapon.definition.attack.special;

			if (special?.type === 'force-field') {
				spawnForceField(weapon.definition, weapon.instanceId);
				return;
			}

			if (special?.type === 'laser-sweep') {
				spawnLaserSweep(weapon.definition, weapon.instanceId);
				return;
			}

			if (special?.type === 'needle-fan') {
				spawnNeedleFan(weapon.definition, weapon.instanceId);
				return;
			}

			if (special?.type === 'sniper-line') {
				spawnSniperLock(weapon.definition, weapon.instanceId);
				return;
			}

			if (special?.type === 'execution-lattice') {
				spawnExecutionLattice(weapon.definition, weapon.instanceId);
				return;
			}

			if (special?.type === 'fork-lightning') {
				spawnForkLightning(weapon.definition, weapon.instanceId);
				return;
			}

			if (special?.type === 'stasis-field') {
				spawnStasisField(weapon.definition, weapon.instanceId, target);
				return;
			}

			if (special?.type === 'void-tunnel') {
				spawnVoidTunnel(weapon.definition, weapon.instanceId, target);
				return;
			}

			if (special?.type === 'phaseshift') {
				spawnPhaseshift(weapon.definition, weapon.instanceId);
				return;
			}

			if (special?.type === 'burning-ground') {
				spawnProjectile({
					sourceWeaponInstanceId: weapon.instanceId,
					originX: centerX,
					originY: centerY,
					target,
					weapon: weapon.definition,
					damage: 0,
					speed: Math.max(280, weapon.definition.projectileSpeed),
					size: PROJECTILE_SIZE_BY_VISUAL[weapon.definition.projectileVisual.size] * 1.15,
					motion: 'accelerate',
					waveAmplitude: 5,
					waveFrequency: 9,
					wavePhase: p.random(p.TWO_PI),
					waveDrift: p.random(-0.02, 0.02),
					collidesWithEnemies: false,
					impactTargetX: target.x,
					impactTargetY: target.y,
					arrivalEffect: 'burning-ground',
					arrivalTriggerRadius: 16
				});
				return;
			}

			if (special?.type === 'delayed-bomb') {
				spawnDelayedBomb(weapon.definition, weapon.instanceId, target);
				return;
			}

			if (special?.type === 'flamethrower-cone') {
				spawnFlamethrowerCone(weapon.definition, weapon.instanceId, target);
				return;
			}

			if (special?.type === 'ice-shower') {
				spawnIceShower(weapon.definition, weapon.instanceId);
				return;
			}

			if (special?.type === 'void-tendrils') {
				spawnVoidTendrils(weapon.definition, weapon.instanceId);
				return;
			}

			if (weapon.definition.id === 'splitter') {
				const targets = getClosestEnemies(Math.max(1, weapon.definition.attack.projectileCount));

				if (targets.length === 0) {
					return;
				}

				for (const splitTarget of targets) {
					fireProjectile(splitTarget, weapon.definition, weapon.instanceId);
				}

				return;
			}

			if (weapon.definition.id === 'blaster') {
				fireLineBurst(target, weapon.definition, weapon.instanceId);
				return;
			}

			if (weapon.definition.id === 'pulse-array') {
				firePulseArrayBurst(target, weapon.definition, weapon.instanceId);
				return;
			}

			const { projectileCount, spreadDegrees } = weapon.definition.attack;

			if (projectileCount <= 1) {
				fireProjectile(target, weapon.definition, weapon.instanceId);
				return;
			}

			const totalSpreadRadians = ((spreadDegrees ?? 0) * Math.PI) / 180;
			const startOffset = -totalSpreadRadians / 2;
			const step = projectileCount > 1 ? totalSpreadRadians / (projectileCount - 1) : 0;

			for (let index = 0; index < projectileCount; index += 1) {
				fireProjectile(target, weapon.definition, weapon.instanceId, startOffset + step * index);
			}

			if (special?.type === 'next-weapon-boost') {
				pendingNextWeaponDamageMultiplier = Math.max(
					pendingNextWeaponDamageMultiplier,
					special.damageMultiplier
				);
			}
		};

		const activateUtility = (utility: EquippedUtilityState) => {
			if (utility.definition.activationKind !== 'triggered') {
				return;
			}
			const effect = utility.definition.effect;

			if (effect.type === 'shield-pool') {
				if ((pixlShieldSources[utility.instanceId] ?? 0) > 0) {
					return;
				}

				if (utility.cyclesUntilTrigger > 1) {
					utility.cyclesUntilTrigger -= 1;
					return;
				}

				utility.cyclesUntilTrigger = utility.cycleInterval;
				pixlShieldSources[utility.instanceId] = Math.ceil(
					pixlProgression.health * effect.shieldPercent
				);
				recalculatePixlShieldPool();
				activeShieldColor = utility.definition.utilityVisual?.color ?? '#60a5fa';
				return;
			}

			if (utility.cyclesUntilTrigger > 1) {
				utility.cyclesUntilTrigger -= 1;
				return;
			}

			utility.cyclesUntilTrigger = utility.cycleInterval;

			if (effect.type === 'elemental-infuser') {
				elementalInfusions[effect.element] += 1;
				return;
			}

			if (effect.type === 'cycle-damage-boost') {
				cycleDamageMultiplier = Math.max(cycleDamageMultiplier, effect.damageMultiplier);
				cycleDamageBuffExpiresAfterSweepIndex = currentSweepIndex + 1;
			}
		};

		const activateWeaponsAtColumn = (column: number) => {
			for (const utility of triggeredUtilities) {
				if (utility.triggerColumn !== column) {
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
				const requiredInfusionCount = Math.max(
					1,
					weapon.definition.attack.requiredInfusionCount ?? 1
				);

				if (requiredInfusion) {
					if (elementalInfusions[requiredInfusion] < requiredInfusionCount) {
						continue;
					}

					elementalInfusions[requiredInfusion] -= requiredInfusionCount;
				}

				const target = getWeaponTarget(weapon.targeting);

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

					elementalInfusions = createEmptyElementalInfusions();
				}
			}
		};

		const markCleared = () => {
			const rewardPacks = rollLevelRewardPacks();
			waveDrops = [];
			status = currentLevelIndex === levels.length - 1 ? 'complete' : 'cleared';
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

			if (status === 'complete') {
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

		const updateVoidTunnels = (dt: number) => {
			for (let index = voidTunnels.length - 1; index >= 0; index -= 1) {
				const tunnel = voidTunnels[index];
				tunnel.age += dt;

				if (tunnel.age >= tunnel.duration) {
					voidTunnels.splice(index, 1);
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
					Math.round((stats.projectileDamage ?? stats.contactDamage) * enemy.damageMultiplier)
				),
				color: stats.projectileColor ?? '#a6f0ff',
				size: stats.projectileSize ?? 7,
				age: 0,
				maxAge: 3.2
			});
		};

		const updateEnemies = (dt: number) => {
			for (let index = enemies.length - 1; index >= 0; index -= 1) {
				const enemy = enemies[index];
				const stats = combatProfile.glitches[enemy.kind];
				const contactRange = getEnemyContactRange(enemy.kind);
				const isSiege = stats.attackPattern === 'siege';
				enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
				enemy.confusionTimer = Math.max(0, enemy.confusionTimer - dt);
				enemy.voidTouchedTimer = Math.max(0, enemy.voidTouchedTimer - dt);
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

				const dx = centerX - enemy.x;
				const dy = centerY - enemy.y;
				const distance = Math.hypot(dx, dy) || 1;
				const desiredRange = Math.max(contactRange + 20, enemy.holdRadius);
				const confusionMultiplier = enemy.confusionTimer > 0 ? 0.67 : 1;
				const chillMultiplier = enemy.frozenTimer > 0 ? 0 : 1 - enemy.chillAmount;
				const moveSpeedMultiplier = confusionMultiplier * chillMultiplier;
				const effectiveMoveSpeed =
					stats.moveSpeed * moveSpeedMultiplier * enemy.moveSpeedMultiplier;

				if (immobilized) {
					continue;
				}

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
					continue;
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

					if (isSiege) {
						fireEnemyProjectile(enemy, stats);
						continue;
					}

					applyDamageToPixl(Math.max(1, Math.round(stats.contactDamage * enemy.damageMultiplier)));

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
						: (trackedTarget ?? getWeaponTarget(lock.weapon.attack.targeting));

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
								lock.sourceWeaponInstanceId
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
							applyDamageToEnemy(enemyIndex, strike.damage, 0.12, strike.sourceWeaponInstanceId);
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
							applyDamageToEnemy(enemyIndex, segment.damage, 0.1, burst.sourceWeaponInstanceId);
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
					const fallbackTarget = getWeaponTarget('current-target');

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
						getWeaponTarget('current-target');

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

		const updateVoidTendrils = (dt: number) => {
			for (let index = voidTendrils.length - 1; index >= 0; index -= 1) {
				const tendril = voidTendrils[index];
				tendril.age += dt;

				const trackedTarget =
					(tendril.enemyId !== null && enemies.find((enemy) => enemy.id === tendril.enemyId)) ??
					null;

				if (trackedTarget) {
					tendril.targetX = trackedTarget.x;
					tendril.targetY = trackedTarget.y;
				}

				if (!tendril.hasHit && tendril.age >= tendril.duration * 0.92) {
					if (trackedTarget) {
						const enemyIndex = enemies.findIndex((enemy) => enemy.id === trackedTarget.id);

						if (enemyIndex >= 0) {
							applyDamageToEnemy(enemyIndex, tendril.damage, 0.1, tendril.sourceWeaponInstanceId);
							healPixl(tendril.healPerHit);
						}
					}

					tendril.hasHit = true;
				}

				if (tendril.age >= tendril.duration) {
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
									projectile.sourceWeaponInstanceId
								);
							}
						}

						if (projectile.pierceRemaining > 0) {
							projectile.pierceRemaining -= hitEnemyIdsThisStep.length;
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

					applyDamageToEnemy(
						hitEnemyIndex,
						projectile.damage,
						0.08,
						projectile.sourceWeaponInstanceId
					);

					if (projectile.ricochetRemaining > 0 && retargetRicochetProjectile(projectile)) {
						projectile.ricochetRemaining -= 1;
						continue;
					}

					if (projectile.pierceRemaining > 0) {
						projectile.pierceRemaining -= 1;
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
			p.pop();
		};

		const drawProjectiles = () => {
			p.push();

			for (const field of forceFields) {
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

			for (const field of stasisFields) {
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

			for (const tunnel of voidTunnels) {
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

			for (const bomb of delayedBombs) {
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

			for (const sweep of laserSweeps) {
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
				if (projectile.weaponId === 'napalm-grenade') {
					const heading = Math.atan2(projectile.directionY, projectile.directionX);
					const pulse = 1 + Math.sin(projectile.age * 18) * 0.08;

					for (let trailIndex = 0; trailIndex < 3; trailIndex += 1) {
						const trailT = trailIndex / 3;
						const trailX = p.lerp(projectile.x, projectile.lastX, 0.28 + trailT * 0.22);
						const trailY = p.lerp(projectile.y, projectile.lastY, 0.28 + trailT * 0.22);
						p.noStroke();
						p.fill(trailIndex === 0 ? '#ffd16666' : '#ff5f1f55');
						p.circle(trailX, trailY, projectile.size * (0.95 - trailT * 0.18));
					}

					p.noStroke();
					p.fill('#ff6a1f55');
					p.circle(projectile.x, projectile.y, projectile.size * 3.1 * pulse);
					p.fill('#2d120acc');
					p.circle(projectile.x, projectile.y, projectile.size * 1.5);

					p.push();
					p.translate(projectile.x, projectile.y);
					p.rotate(heading + Math.PI / 4);
					p.rectMode(p.CENTER);
					p.fill('#fb923c');
					p.rect(0, 0, projectile.size * 1.15, projectile.size * 1.15, 3);
					p.fill('#ffe29a');
					p.rect(0, -projectile.size * 0.08, projectile.size * 0.42, projectile.size * 0.42, 2);
					p.pop();
					continue;
				}

				if (projectile.trail === 'streak') {
					p.stroke(projectile.color);
					p.strokeWeight(Math.max(1.5, projectile.size * 0.45));
					p.line(projectile.lastX, projectile.lastY, projectile.x, projectile.y);
				}

				if (projectile.glow) {
					p.noStroke();
					p.fill(`${projectile.color}55`);
					p.circle(projectile.x, projectile.y, projectile.size * 2.4);
				}

				if (projectile.trail === 'pulse') {
					p.noFill();
					p.stroke(`${projectile.color}88`);
					p.strokeWeight(1);
					p.circle(
						projectile.x,
						projectile.y,
						projectile.size * (2.2 + Math.sin(projectile.age * 12) * 0.35)
					);
				}

				p.noStroke();
				p.fill(projectile.color);

				if (projectile.shape === 'orb') {
					p.circle(projectile.x, projectile.y, projectile.size * 1.35);
					continue;
				}

				p.push();
				p.translate(projectile.x, projectile.y);

				if (projectile.shape === 'diamond') {
					p.rotate(Math.PI / 4);
					p.rectMode(p.CENTER);
					p.square(0, 0, projectile.size * 1.05);
				} else if (projectile.shape === 'spark') {
					p.rotate(projectile.age * 10);
					p.rectMode(p.CENTER);
					p.rect(0, 0, projectile.size * 1.4, Math.max(2, projectile.size * 0.4), 2);
					p.rotate(Math.PI / 2);
					p.rect(0, 0, projectile.size * 1.1, Math.max(2, projectile.size * 0.3), 2);
				} else {
					p.rectMode(p.CENTER);
					p.square(0, 0, projectile.size);
				}

				p.pop();
			}

			for (const projectile of enemyProjectiles) {
				p.noStroke();
				p.fill(`${projectile.color}44`);
				p.circle(projectile.x, projectile.y, projectile.size * 2.2);
				p.fill(projectile.color);
				p.circle(projectile.x, projectile.y, projectile.size);
			}

			for (const lock of sniperLocks) {
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
				const normalizedAge = Math.max(0, Math.min(1, tendril.age / tendril.duration));
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
					p.fill(255);
				} else {
					p.fill(...visual.fill);
				}

				if (visual.shape === 'square') {
					p.rectMode(p.CENTER);
					p.square(enemy.x, enemy.y, visual.radius * 1.8);
				} else if (visual.shape === 'diamond') {
					p.push();
					p.translate(enemy.x, enemy.y);
					p.rotate(Math.PI / 4);
					p.rectMode(p.CENTER);
					p.square(0, 0, visual.radius * 2.1);
					p.pop();
				} else if (visual.shape === 'triangle') {
					p.triangle(
						enemy.x,
						enemy.y - visual.radius * 1.25,
						enemy.x - visual.radius,
						enemy.y + visual.radius,
						enemy.x + visual.radius,
						enemy.y + visual.radius
					);
				} else {
					p.circle(enemy.x, enemy.y, visual.radius * 2);
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
					Math.min(initialResumeState.currentLevel - 1, levels.length - 1)
				);
				currentLevel = levels[currentLevelIndex];
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
				recalculatePixlShieldPool();
				activeShieldColor = initialResumeState.activeShieldColor;
				enemyId = initialResumeState.enemyId;
				spawnQueue = [...initialResumeState.spawnQueue];
				enemies = initialResumeState.enemies.map((enemy) => ({ ...enemy }));
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
				updateStasisFields(dt);
				updateVoidTunnels(dt);
				updatePhaseshifts(dt);
				updateBurningGrounds(dt);
				updateDelayedBombs(dt);
				updateLaserSweeps(dt);
				updateNeedleBursts(dt);
				updateExecutionLatticeStrikes(dt);
				updateForkLightningBursts(dt);
				updateFlamethrowerCones(dt);
				updateIceSpikes(dt);
				updateBlizzardStorms(dt);
				updateVoidTendrils(dt);
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

						if (status === 'complete') {
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

			const { width, height } = getLoadoutPreviewCanvasSize(canvas);

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

export const campaign1Sketch = createCampaignSketch(campaign1, getCampaignCombatProfile(1));
