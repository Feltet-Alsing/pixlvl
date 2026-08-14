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
import { applyXpGain, createUpgradeablePixlState } from '$lib/game/upgrades';
import type {
	CampaignDefinition,
	CampaignLevel,
	CombatProfile,
	GlitchKind,
	LoadoutItemDefinition,
	OwnedWeaponInstance,
	UtilityDefinition,
	WeaponAttackBehavior,
	ElementalInfusionType,
	WeaponDefinition,
	WeaponProjectileMotion,
	WeaponProjectileShape,
	WeaponRarity,
	WeaponProjectileSize,
	WeaponTrailStyle
} from '$lib/data/types';
import type { PersistedCampaignProgress, PersistedPixlState } from '$lib/server/game-state';

const MAX_WIDTH = 760;
const BASE_HEIGHT = 520;
const FIXED_ARENA_RADIUS = BASE_HEIGHT * 0.42;
const ARENA_VERTICAL_OFFSET_RATIO = 0.1;
const LOADOUT_COLUMN_COUNT = 8;
const LEVEL_CLEAR_DELAY = 3;
const LEVEL_RESET_DELAY = 1.2;
const CAMPAIGN_LOOP_DELAY = 3;
const LOADOUT_PREVIEW_MAX_WIDTH = 320;
const LOADOUT_PREVIEW_BASE_HEIGHT = 240;

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
	}
};

const glitchOrder: GlitchKind[] = ['biter', 'swarmer', 'tanker', 'shard', 'bulwark', 'shielder'];
const compositionKeyByKind = {
	biter: 'biters',
	swarmer: 'swarmers',
	tanker: 'tankers',
	shard: 'shard',
	bulwark: 'bulwark',
	shielder: 'shielder'
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
	damageMultiplier: number;
}

interface ProjectileState {
	weaponId: string;
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
	pierceRemaining: number;
	impactRadius: number;
	impactRadiusGrowth: number;
	maxImpactRadius: number;
	ricochetRemaining: number;
	sizeGrowth: number;
	maxSize: number;
	hitEnemyIds: number[];
	homingTargetEnemyId: number | null;
	homingTurnRate: number;
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

interface LaserSweepState {
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
	angle: number;
	reach: number;
	halfAngleRadians: number;
	damagePerTick: number;
	tickInterval: number;
	tickTimer: number;
	color: string;
	glow: boolean;
	expiresAfterSweepIndex: number;
	hitEnemyIdsThisTick: number[];
}

interface IceSpikeState {
	enemyId: number | null;
	targetX: number;
	targetY: number;
	startY: number;
	age: number;
	startDelay: number;
	fallDuration: number;
	damage: number;
	impactRadius: number;
	color: string;
	glow: boolean;
	hasHit: boolean;
}

interface VoidTendrilState {
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
	triggerColumn: number;
	placementX: number;
	placementY: number;
	cycleInterval: number;
	cyclesUntilTrigger: number;
}

interface EquippedUtilityState {
	instanceId: string;
	definition: UtilityDefinition;
	triggerColumn: number;
	placementX: number;
	placementY: number;
	cycleInterval: number;
	cyclesUntilTrigger: number;
}

interface EquippedLoadoutEntry {
	instanceId: string;
	definition: LoadoutItemDefinition;
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
		bankedXp: number;
		waveXp: number;
		waveDrops: OwnedWeaponInstance[];
		statusTimerRemaining: number;
		remainingEnemies: number;
		composition: {
			biters: number;
			swarmers: number;
			tankers: number;
		};
		status: WaveStatus;
	}) => void;
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

function createWeaponInstanceId(randomInt: number) {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return `drop-${Date.now()}-${randomInt}`;
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

function getLoadoutItemTriggerColumn(item: LoadoutItemDefinition, placementX: number) {
	const leftmostShapeColumn = Math.min(...item.shape.cells.map(([cellX]) => cellX));

	return placementX + leftmostShapeColumn;
}

function buildEquippedLoadoutEntries(
	ownedWeapons: OwnedWeaponInstance[] | null | undefined,
	loadoutPlacements: PersistedPixlState['loadoutPlacements'] | null | undefined,
	loadoutColumnCount = LOADOUT_COLUMN_COUNT
) {
	if (!Array.isArray(ownedWeapons) || !Array.isArray(loadoutPlacements)) {
		return [];
	}

	const ownedWeaponMap = new Map(ownedWeapons.map((weapon) => [weapon.instanceId, weapon]));

	return loadoutPlacements
		.map((placement) => {
			const ownedWeapon = ownedWeaponMap.get(placement.weaponInstanceId);

			if (!ownedWeapon) {
				return null;
			}

			const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);
			const triggerColumn = getLoadoutItemTriggerColumn(definition, placement.x);

			if (triggerColumn < 0 || triggerColumn >= loadoutColumnCount) {
				return null;
			}

			return {
				instanceId: ownedWeapon.instanceId,
				definition,
				triggerColumn,
				placementX: placement.x,
				placementY: placement.y
			} satisfies EquippedLoadoutEntry;
		})
		.filter((entry): entry is EquippedLoadoutEntry => entry !== null)
		.sort(
			(left, right) =>
				left.triggerColumn - right.triggerColumn || left.instanceId.localeCompare(right.instanceId)
		);
}

function buildEquippedWeapons(entries: EquippedLoadoutEntry[]) {
	return entries
		.filter((entry): entry is EquippedLoadoutEntry & { definition: WeaponDefinition } =>
			isWeaponDefinition(entry.definition)
		)
		.map((entry) => ({
			instanceId: entry.instanceId,
			definition: entry.definition,
			triggerColumn: entry.triggerColumn,
			placementX: entry.placementX,
			placementY: entry.placementY,
			cycleInterval: Math.max(1, entry.definition.attack.cycleInterval ?? 1),
			cyclesUntilTrigger: Math.max(1, entry.definition.attack.cycleInterval ?? 1)
		})) satisfies EquippedWeaponState[];
}

function buildEquippedUtilities(entries: EquippedLoadoutEntry[]) {
	return entries
		.filter((entry): entry is EquippedLoadoutEntry & { definition: UtilityDefinition } =>
			isUtilityDefinition(entry.definition)
		)
		.map((entry) => ({
			instanceId: entry.instanceId,
			definition: entry.definition,
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
					getPlacedShapeCells(weapon.definition.shape, weapon.placementX, weapon.placementY),
					getPlacedShapeCells(utility.definition.shape, utility.placementX, utility.placementY)
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
		let ownedWeapons = [...(options.pixlState?.ownedWeapons ?? [])];
		let waveXp = 0;
		let waveDrops: OwnedWeaponInstance[] = [];
		let pixlHealth = pixlProgression.health;
		let pixlShieldPool = 0;
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
		let laserSweeps: LaserSweepState[] = [];
		let needleBursts: NeedleBurstState[] = [];
		let executionLatticeStrikes: ExecutionLatticeStrikeState[] = [];
		let forkLightningBursts: ForkLightningState[] = [];
		let flamethrowerCones: FlamethrowerConeState[] = [];
		let iceSpikes: IceSpikeState[] = [];
		let voidTendrils: VoidTendrilState[] = [];
		let sniperLocks: SniperLockState[] = [];
		let centerX = 0;
		let centerY = 0;
		let arenaRadius = 0;
		let highestClearedLevel = options.campaignState?.highestClearedLevel ?? 0;
		let highestUnlockedLevel = options.campaignState?.highestUnlockedLevel ?? currentLevelIndex + 1;
		let completed = options.campaignState?.completed ?? false;
		let lastCombatStateKey = '';
		let lastSkipResultsSignal = options.getSkipResultsSignal?.() ?? 0;

		const persistProgress = (nextCurrentLevel: number) => {
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

		const updateArenaMetrics = () => {
			centerX = p.width / 2;
			centerY = p.height * (0.5 - ARENA_VERTICAL_OFFSET_RATIO);
			arenaRadius = Math.min(Math.min(p.width, p.height) * 0.42, FIXED_ARENA_RADIUS);
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

		const emitCombatState = () => {
			const combatState = {
				stage: currentLevel.stage,
				stageLevel: currentLevel.stageLevel,
				campaignLevel: currentLevel.campaignLevel,
				pixlHealth: Math.ceil(pixlHealth),
				maxPixlHealth: pixlProgression.health,
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
				status
			};

			const nextKey = JSON.stringify(combatState);

			if (nextKey === lastCombatStateKey) {
				return;
			}

			lastCombatStateKey = nextKey;
			options.onCombatStateChange?.(combatState);
		};

		const getWeaponDropChance = (item: LoadoutItemDefinition) => {
			return Math.max(0, item.drop.perLevelDropChance ?? item.drop.perEnemyDropChance ?? 0);
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
			status = 'running';
			statusTimer = 0;
			currentSweepIndex = 0;
			spawnAccumulator = 0;
			sweepProgress = 0;
			waveXp = 0;
			waveDrops = [];
			pixlHealth = pixlProgression.health;
			pixlShieldPool = 0;
			cycleDamageMultiplier = 1;
			cycleDamageBuffExpiresAfterSweepIndex = null;
			pixlFlash = 0;
			enemyId = 0;
			enemies = [];
			projectiles = [];
			enemyProjectiles = [];
			forceFields = [];
			laserSweeps = [];
			needleBursts = [];
			executionLatticeStrikes = [];
			forkLightningBursts = [];
			flamethrowerCones = [];
			iceSpikes = [];
			voidTendrils = [];
			sniperLocks = [];
			spawnQueue = shuffleInPlace(buildSpawnQueue(currentLevel), p);

			if (spawnQueue.length > 0) {
				spawnEnemy(spawnQueue.shift() as GlitchKind);
			}
		};

		const getCurrentStageStartLevelIndex = () => {
			return Math.max(0, (currentLevel.stage - 1) * campaign.levelsPerStage);
		};

		const getAdjustedWeaponDamage = (weapon: WeaponDefinition, multiplier = 1) => {
			return Math.max(1, Math.round(weapon.baseDamage * cycleDamageMultiplier * multiplier));
		};

		const rollLevelDrops = () => {
			const eligibleDrops = weaponPool.filter((weapon) => {
				if (weapon.drop.mode !== 'drop') {
					return false;
				}

				if (weapon.drop.campaignId && weapon.drop.campaignId !== campaign.campaign) {
					return false;
				}

				if (weapon.drop.stageStart && currentLevel.stage < weapon.drop.stageStart) {
					return false;
				}

				if (weapon.drop.stageEnd && currentLevel.stage > weapon.drop.stageEnd) {
					return false;
				}

				if (getWeaponDropChance(weapon) <= 0) {
					return false;
				}

				return true;
			});

			return eligibleDrops.flatMap((weapon) => {
				if (p.random() >= getWeaponDropChance(weapon)) {
					return [];
				}

				return [
					{
						instanceId: createWeaponInstanceId(Math.floor(p.random(1_000_000_000))),
						definitionId: weapon.id,
						source: 'drop',
						acquiredAt: new Date().toISOString(),
						campaignId: campaign.campaign,
						stage: currentLevel.stage,
						level: currentLevel.campaignLevel
					} satisfies OwnedWeaponInstance
				];
			});
		};

		const spawnEnemy = (kind: GlitchKind) => {
			const angle = p.random(p.TWO_PI);
			const x = centerX + Math.cos(angle) * arenaRadius;
			const y = centerY + Math.sin(angle) * arenaRadius;
			const stats = combatProfile.glitches[kind];
			const preferredRange = stats.preferredRange ?? getEnemyContactRange(kind);
			const holdRadius =
				stats.attackPattern === 'siege' ? arenaRadius : preferredRange + p.random(-12, 16);
			const healthMultiplier = getEnemyStageMultiplier('healthPerStage');
			const scaledHealth = Math.max(1, Math.round(stats.health * healthMultiplier));

			enemies.push({
				id: enemyId,
				kind,
				x,
				y,
				health: scaledHealth,
				maxHealth: scaledHealth,
				attackTimer: 1 / stats.attackSpeed,
				hitFlash: 0,
				orbitDirection: p.random() < 0.5 ? -1 : 1,
				holdRadius: holdRadius,
				supportShieldPool: 0,
				supportShieldTimer: 0,
				shieldPulseTimer: 0,
				shieldPulseCooldown: p.random(0, Math.max(0.15, (stats.onHitShieldCooldown ?? 0) * 0.5)),
				damageMultiplier: getEnemyStageMultiplier('damagePerStage')
			});

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

		const getWeaponTarget = (targeting: WeaponAttackBehavior['targeting']) => {
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

			enemies.splice(enemyIndex, 1);
		};

		const applyDamageToPixl = (damage: number) => {
			let remainingDamage = Math.max(0, damage);

			if (pixlShieldPool > 0) {
				const absorbed = Math.min(pixlShieldPool, remainingDamage);
				pixlShieldPool -= absorbed;
				remainingDamage -= absorbed;

				if (pixlShieldPool <= 0) {
					pixlShieldPool = 0;
				}
			}

			if (remainingDamage > 0) {
				pixlHealth = Math.max(0, pixlHealth - remainingDamage);
			}

			pixlFlash = 0.16;
		};

		const spawnNeedleFan = (weapon: WeaponDefinition) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'needle-fan') {
				return;
			}

			const targets = getClosestEnemies(Math.max(1, weapon.attack.projectileCount));

			for (const enemy of targets) {
				needleBursts.push({
					enemyId: enemy.id,
					targetX: enemy.x,
					targetY: enemy.y,
					maxReach: special.maxReach,
					lineWidth: special.lineWidth,
					damage: getAdjustedWeaponDamage(weapon),
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					age: 0,
					duration: special.duration,
					hasHit: false
				});
			}
		};

		const applyDamageToEnemy = (enemyIndex: number, damage: number, hitFlash = 0.08) => {
			const enemy = enemies[enemyIndex];

			if (!enemy) {
				return false;
			}

			const stats = combatProfile.glitches[enemy.kind];
			let remainingDamage = damage;

			if (enemy.supportShieldPool > 0) {
				const absorbed = Math.min(enemy.supportShieldPool, remainingDamage);
				enemy.supportShieldPool -= absorbed;
				remainingDamage -= absorbed;

				if (enemy.supportShieldPool <= 0) {
					enemy.supportShieldPool = 0;
					enemy.supportShieldTimer = 0;
				}
			}

			if (remainingDamage <= 0) {
				enemy.hitFlash = Math.max(enemy.hitFlash, hitFlash);
				return false;
			}
			const shieldReduction =
				enemy.shieldPulseTimer > 0
					? Math.min(0.9, Math.max(0, stats.onHitShieldDamageReduction ?? 0))
					: 0;
			const appliedDamage = Math.max(1, remainingDamage * (1 - shieldReduction));

			enemy.health -= appliedDamage;
			enemy.hitFlash = Math.max(enemy.hitFlash, hitFlash);

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
				return true;
			}

			return false;
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
						applyDamageToEnemy(enemyIndex, burst.damage, 0.09);
					}

					burst.hasHit = true;
				}

				if (progress >= 1) {
					needleBursts.splice(index, 1);
				}
			}
		};

		const spawnForceField = (weapon: WeaponDefinition) => {
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
					centerX: centerX + offsetX,
					centerY,
					startDelay: index * burstDelay,
					radius: combatProfile.collision.pixlRadius,
					maxRadius: special.maxRadius,
					expansionSpeed: special.expansionSpeed,
					lineWidth: special.lineWidth,
					damage: getAdjustedWeaponDamage(weapon),
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					age: 0,
					hitEnemyIds: []
				});
			}
		};

		const spawnLaserSweep = (weapon: WeaponDefinition) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'laser-sweep') {
				return;
			}

			laserSweeps.push({
				startAngle: p.random(p.TWO_PI),
				angle: 0,
				beamLength: special.beamLength,
				beamWidth: special.beamWidth,
				damage: getAdjustedWeaponDamage(weapon),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.duration,
				hitEnemyIds: []
			});
		};

		const spawnSniperLock = (weapon: WeaponDefinition) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'sniper-line') {
				return;
			}

			const target = getWeaponTarget(weapon.attack.targeting);

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
				weapon
			});
		};

		const spawnExecutionLattice = (weapon: WeaponDefinition) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'execution-lattice') {
				return;
			}

			const targets = getFurthestEnemies(Math.max(1, special.targetCount));

			for (const [index, enemy] of targets.entries()) {
				executionLatticeStrikes.push({
					enemyId: enemy.id,
					targetX: enemy.x,
					targetY: enemy.y,
					startY: enemy.y - special.dropHeight,
					markerSize: special.markerSize,
					damage: getAdjustedWeaponDamage(weapon),
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					age: 0,
					dropDuration: special.dropDuration,
					hasHit: false,
					startDelay: index * 0.05
				});
			}
		};

		const spawnForkLightning = (weapon: WeaponDefinition) => {
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
							damage: getAdjustedWeaponDamage(weapon),
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
				segments,
				branchWidth: special.branchWidth,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.duration
			});
		};

		const spawnFlamethrowerCone = (weapon: WeaponDefinition, target: EnemyState) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'flamethrower-cone') {
				return;
			}

			flamethrowerCones.push({
				angle: Math.atan2(target.y - centerY, target.x - centerX),
				reach: special.reach,
				halfAngleRadians: ((special.coneAngleDegrees / 2) * Math.PI) / 180,
				damagePerTick: getAdjustedWeaponDamage(weapon),
				tickInterval: special.tickInterval,
				tickTimer: special.tickInterval,
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				expiresAfterSweepIndex: currentSweepIndex + special.durationCycles,
				hitEnemyIdsThisTick: []
			});
		};

		const spawnIceShower = (weapon: WeaponDefinition) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'ice-shower') {
				return;
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
					enemyId: target?.id ?? null,
					targetX,
					targetY,
					startY: targetY - 120,
					age: 0,
					startDelay: (cycleDuration / spikeCount) * index,
					fallDuration: special.fallDuration,
					damage: getAdjustedWeaponDamage(weapon),
					impactRadius: special.impactRadius,
					color: weapon.projectileVisual.color,
					glow: weapon.projectileVisual.glow ?? false,
					hasHit: false
				});
			}
		};

		const spawnVoidTendrils = (weapon: WeaponDefinition) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'void-tendrils') {
				return;
			}

			const targets = getClosestEnemies(Math.max(1, special.targetCount));

			for (const target of targets) {
				voidTendrils.push({
					enemyId: target.id,
					targetX: target.x,
					targetY: target.y,
					age: 0,
					duration: special.duration,
					damage: getAdjustedWeaponDamage(weapon),
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
			originX,
			originY,
			target,
			angleRadians,
			weapon,
			angleOffsetRadians = 0,
			damage = getAdjustedWeaponDamage(weapon),
			speed = weapon.projectileSpeed,
			size = PROJECTILE_SIZE_BY_VISUAL[weapon.projectileVisual.size],
			shape = weapon.projectileVisual.shape ?? 'square',
			trail = weapon.projectileVisual.trail ?? 'none',
			glow = weapon.projectileVisual.glow ?? false,
			color = weapon.projectileVisual.color,
			motion = weapon.attack.motion ?? 'straight',
			pierceRemaining = Math.max(0, weapon.attack.pierceCount ?? 0),
			impactRadius = Math.max(0, weapon.attack.impactRadius ?? 0),
			impactRadiusGrowth,
			maxImpactRadius,
			ricochetRemaining,
			sizeGrowth,
			maxSize,
			canSplitOnImpact = weapon.attack.special?.type === 'shrapnel-burst'
		}: {
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
			pierceRemaining?: number;
			impactRadius?: number;
			impactRadiusGrowth?: number;
			maxImpactRadius?: number;
			ricochetRemaining?: number;
			sizeGrowth?: number;
			maxSize?: number;
			canSplitOnImpact?: boolean;
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
				homingTargetEnemyId: weapon.id === 'heavy-orb' ? (target?.id ?? null) : null,
				homingTurnRate: weapon.id === 'heavy-orb' ? 2.4 : 0
			});
		};

		const fireProjectile = (
			target: EnemyState,
			weapon: WeaponDefinition,
			angleOffsetRadians = 0
		) => {
			spawnProjectile({
				originX: centerX,
				originY: centerY,
				target,
				weapon,
				angleOffsetRadians
			});
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
					originX: impactX,
					originY: impactY,
					target: enemy,
					weapon,
					damage: getAdjustedWeaponDamage(weapon, special.fragmentDamageMultiplier),
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
					originX: impactX,
					originY: impactY,
					angleRadians: (index / Math.max(1, remainingFragments)) * Math.PI * 2,
					weapon,
					damage: getAdjustedWeaponDamage(weapon, special.fragmentDamageMultiplier),
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

			const special = weapon.definition.attack.special;

			if (special?.type === 'force-field') {
				spawnForceField(weapon.definition);
				return;
			}

			if (special?.type === 'laser-sweep') {
				spawnLaserSweep(weapon.definition);
				return;
			}

			if (special?.type === 'needle-fan') {
				spawnNeedleFan(weapon.definition);
				return;
			}

			if (special?.type === 'sniper-line') {
				spawnSniperLock(weapon.definition);
				return;
			}

			if (special?.type === 'execution-lattice') {
				spawnExecutionLattice(weapon.definition);
				return;
			}

			if (special?.type === 'fork-lightning') {
				spawnForkLightning(weapon.definition);
				return;
			}

			if (special?.type === 'flamethrower-cone') {
				spawnFlamethrowerCone(weapon.definition, target);
				return;
			}

			if (special?.type === 'ice-shower') {
				spawnIceShower(weapon.definition);
				return;
			}

			if (special?.type === 'void-tendrils') {
				spawnVoidTendrils(weapon.definition);
				return;
			}

			if (weapon.definition.id === 'splitter') {
				const targets = getClosestEnemies(Math.max(1, weapon.definition.attack.projectileCount));

				if (targets.length === 0) {
					return;
				}

				for (const splitTarget of targets) {
					fireProjectile(splitTarget, weapon.definition);
				}

				return;
			}

			const { projectileCount, spreadDegrees } = weapon.definition.attack;

			if (projectileCount <= 1) {
				fireProjectile(target, weapon.definition);
				return;
			}

			const totalSpreadRadians = ((spreadDegrees ?? 0) * Math.PI) / 180;
			const startOffset = -totalSpreadRadians / 2;
			const step = projectileCount > 1 ? totalSpreadRadians / (projectileCount - 1) : 0;

			for (let index = 0; index < projectileCount; index += 1) {
				fireProjectile(target, weapon.definition, startOffset + step * index);
			}
		};

		const activateUtility = (utility: EquippedUtilityState) => {
			if (utility.definition.activationKind !== 'triggered') {
				return;
			}

			if (utility.cyclesUntilTrigger > 1) {
				utility.cyclesUntilTrigger -= 1;
				return;
			}

			utility.cyclesUntilTrigger = utility.cycleInterval;
			const effect = utility.definition.effect;

			if (effect.type === 'shield-pool') {
				pixlShieldPool = Math.max(pixlShieldPool, effect.shieldAmount);
				activeShieldColor = utility.definition.utilityVisual?.color ?? '#60a5fa';
				return;
			}

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

				if (requiredInfusion) {
					if (elementalInfusions[requiredInfusion] <= 0) {
						continue;
					}

					elementalInfusions[requiredInfusion] -= 1;
				}

				const target = getWeaponTarget(weapon.definition.attack.targeting);

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
			waveDrops = rollLevelDrops();
			status = currentLevelIndex === levels.length - 1 ? 'complete' : 'cleared';
			statusTimer = status === 'complete' ? CAMPAIGN_LOOP_DELAY : LEVEL_CLEAR_DELAY;
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
					applyDamageToEnemy(enemyIndex, field.damage, 0.1);
				}

				if (field.radius >= field.maxRadius) {
					forceFields.splice(index, 1);
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
					applyDamageToEnemy(enemyIndex, sweep.damage, 0.1);
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
				enemy.supportShieldTimer = Math.max(0, enemy.supportShieldTimer - dt);

				if (enemy.supportShieldTimer <= 0) {
					enemy.supportShieldPool = 0;
				}

				enemy.shieldPulseTimer = Math.max(0, enemy.shieldPulseTimer - dt);
				enemy.shieldPulseCooldown = Math.max(0, enemy.shieldPulseCooldown - dt);

				const dx = centerX - enemy.x;
				const dy = centerY - enemy.y;
				const distance = Math.hypot(dx, dy) || 1;
				const desiredRange = Math.max(contactRange + 20, enemy.holdRadius);

				if (isSiege) {
					const distanceDelta = distance - desiredRange;

					if (Math.abs(distanceDelta) > 10) {
						const step = Math.min(Math.abs(distanceDelta), stats.moveSpeed * dt);
						const direction = distanceDelta > 0 ? 1 : -1;
						enemy.x += (dx / distance) * step * direction;
						enemy.y += (dy / distance) * step * direction;
					} else {
						const tangentX = -dy / distance;
						const tangentY = dx / distance;
						const orbitStep = (stats.orbitSpeed ?? 24) * dt * enemy.orbitDirection;
						enemy.x += tangentX * orbitStep;
						enemy.y += tangentY * orbitStep;
					}
				} else if (distance > contactRange) {
					const step = Math.min(distance - contactRange, stats.moveSpeed * dt);
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

				const releaseTarget = trackedTarget ?? getWeaponTarget(lock.weapon.attack.targeting);

				if (releaseTarget) {
					fireProjectile(releaseTarget, lock.weapon);
				}

				sniperLocks.splice(index, 1);
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
							applyDamageToEnemy(enemyIndex, strike.damage, 0.12);
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
							applyDamageToEnemy(enemyIndex, segment.damage, 0.1);
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
				cone.tickTimer -= dt;

				while (cone.tickTimer <= 0) {
					cone.tickTimer += cone.tickInterval;
					cone.hitEnemyIdsThisTick = [];

					for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
						const enemy = enemies[enemyIndex];
						const dx = enemy.x - centerX;
						const dy = enemy.y - centerY;
						const distance = Math.hypot(dx, dy);

						if (distance <= 0 || distance > cone.reach) {
							continue;
						}

						const angle = Math.atan2(dy, dx);
						let delta = angle - cone.angle;
						while (delta > Math.PI) delta -= Math.PI * 2;
						while (delta < -Math.PI) delta += Math.PI * 2;

						if (Math.abs(delta) > cone.halfAngleRadians) {
							continue;
						}

						if (cone.hitEnemyIdsThisTick.includes(enemy.id)) {
							continue;
						}

						cone.hitEnemyIdsThisTick.push(enemy.id);
						applyDamageToEnemy(enemyIndex, cone.damagePerTick, 0.07);
					}
				}

				if (currentSweepIndex >= cone.expiresAfterSweepIndex) {
					flamethrowerCones.splice(index, 1);
				}
			}
		};

		const updateIceSpikes = (dt: number) => {
			for (let index = iceSpikes.length - 1; index >= 0; index -= 1) {
				const spike = iceSpikes[index];
				spike.age += dt;

				const trackedTarget =
					(spike.enemyId !== null && enemies.find((enemy) => enemy.id === spike.enemyId)) ?? null;

				if (trackedTarget) {
					spike.targetX = trackedTarget.x;
					spike.targetY = trackedTarget.y;
				}

				const progress = Math.min(
					1,
					Math.max(0, (spike.age - spike.startDelay) / spike.fallDuration)
				);

				if (!spike.hasHit && progress >= 1) {
					for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
						const enemy = enemies[enemyIndex];
						const distance = Math.hypot(enemy.x - spike.targetX, enemy.y - spike.targetY);

						if (distance > spike.impactRadius + ENEMY_VISUALS[enemy.kind].radius) {
							continue;
						}

						applyDamageToEnemy(enemyIndex, spike.damage, 0.09);
					}

					spike.hasHit = true;
				}

				if (progress >= 1.08) {
					iceSpikes.splice(index, 1);
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
							applyDamageToEnemy(enemyIndex, tendril.damage, 0.1);
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
					const waveOffset = projectile.motion === 'wave' ? Math.sin(projectile.age * 18) * 10 : 0;

					projectile.x =
						projectile.originX +
						projectile.directionX * projectile.distanceTravelled +
						projectile.perpendicularX * waveOffset;
					projectile.y =
						projectile.originY +
						projectile.directionY * projectile.distanceTravelled +
						projectile.perpendicularY * waveOffset;
				}

				let hitEnemyIndex = -1;

				for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex += 1) {
					const enemy = enemies[enemyIndex];
					if (projectile.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const hitRadius = ENEMY_VISUALS[enemy.kind].radius + projectile.size;
					const distance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

					if (distance <= hitRadius) {
						hitEnemyIndex = enemyIndex;
						break;
					}
				}

				if (hitEnemyIndex >= 0) {
					const enemy = enemies[hitEnemyIndex];
					projectile.hitEnemyIds = [...projectile.hitEnemyIds, enemy.id];

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
								applyDamageToEnemy(splashIndex, splashDamage, 0.06) &&
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

					applyDamageToEnemy(hitEnemyIndex, projectile.damage, 0.08);

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

				for (const [cellX, cellY] of item.definition.shape.cells) {
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

			for (const cone of flamethrowerCones) {
				const leftAngle = cone.angle - cone.halfAngleRadians;
				const rightAngle = cone.angle + cone.halfAngleRadians;
				const leftX = centerX + Math.cos(leftAngle) * cone.reach;
				const leftY = centerY + Math.sin(leftAngle) * cone.reach;
				const rightX = centerX + Math.cos(rightAngle) * cone.reach;
				const rightY = centerY + Math.sin(rightAngle) * cone.reach;

				p.noStroke();
				p.fill(cone.glow ? `${cone.color}44` : `${cone.color}2d`);
				p.triangle(centerX, centerY, leftX, leftY, rightX, rightY);
			}

			for (const spike of iceSpikes) {
				const progress = Math.min(
					1,
					Math.max(0, (spike.age - spike.startDelay) / spike.fallDuration)
				);
				const currentY = spike.startY + (spike.targetY - spike.startY) * progress;

				if (spike.glow) {
					p.noStroke();
					p.fill(`${spike.color}33`);
					p.circle(spike.targetX, currentY, 22);
				}

				p.noStroke();
				p.fill(spike.color);
				p.triangle(
					spike.targetX,
					currentY - 14,
					spike.targetX - 8,
					currentY + 10,
					spike.targetX + 8,
					currentY + 10
				);
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

				p.pop();
			}
		};

		p.setup = () => {
			canvas = p.createCanvas(MAX_WIDTH, BASE_HEIGHT).elt as HTMLCanvasElement;
			syncCanvasSize();
			startLevel(currentLevelIndex);
			emitCombatState();
		};

		p.draw = () => {
			const dt = Math.min(p.deltaTime / 1000, 0.05);
			pixlFlash = Math.max(0, pixlFlash - dt);
			applySkipResultsSignal();

			syncCanvasSize();
			if (runMode === 'combat' && status === 'running') {
				updateWaveFlow(dt);
				updateForceFields(dt);
				updateLaserSweeps(dt);
				updateNeedleBursts(dt);
				updateExecutionLatticeStrikes(dt);
				updateForkLightningBursts(dt);
				updateFlamethrowerCones(dt);
				updateIceSpikes(dt);
				updateVoidTendrils(dt);
				updateEnemies(dt);
				updateEnemyProjectiles(dt);
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
						pixlProgression = applyXpGain(pixlProgression, waveXp);
						bankedXp = pixlProgression.xp;
						if (waveDrops.length > 0) {
							ownedWeapons = [...ownedWeapons, ...waveDrops];
						}
						highestClearedLevel = Math.max(highestClearedLevel, currentLevel.campaignLevel);

						if (status === 'complete') {
							completed = true;
							highestUnlockedLevel = campaign.totalLevels;
							persistProgress(campaign.totalLevels);
							startLevel(0);
						} else {
							highestUnlockedLevel = Math.max(highestUnlockedLevel, currentLevel.campaignLevel + 1);
							persistProgress(currentLevel.campaignLevel + 1);
							startLevel(currentLevelIndex + 1);
						}
					}
				}
			}

			emitCombatState();

			drawArena();
			if (showLoadoutSketch) {
				drawLoadout();
			}
			drawProjectiles();
			drawEnemies();
			drawPixl();
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

				for (const [cellX, cellY] of item.definition.shape.cells) {
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
