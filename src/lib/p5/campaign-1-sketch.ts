import type P5 from 'p5';

import { campaign1 } from '$lib/data/campaigns/campaign-1';
import { getCampaignCombatProfile, getCampaignWeaponPool, getWeaponDefinition } from '$lib/data';
import { applyXpGain, createUpgradeablePixlState } from '$lib/game/upgrades';
import type {
	CampaignDefinition,
	CampaignLevel,
	CombatProfile,
	GlitchKind,
	OwnedWeaponInstance,
	WeaponAttackBehavior,
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
const LOADOUT_ROW_COUNT = 5;
const LOADOUT_COLUMN_COUNT = 8;
const LEVEL_CLEAR_DELAY = 15;
const LEVEL_RESET_DELAY = 1.2;
const CAMPAIGN_LOOP_DELAY = 15;

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
	{ radius: number; fill: [number, number, number]; stroke?: [number, number, number] }
> = {
	biter: {
		radius: 8,
		fill: [196, 196, 196]
	},
	swarmer: {
		radius: 6,
		fill: [232, 232, 232]
	},
	tanker: {
		radius: 13,
		fill: [96, 96, 96],
		stroke: [255, 255, 255]
	}
};

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
}

interface ProjectileState {
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
	motion: WeaponProjectileMotion;
	pierceRemaining: number;
	impactRadius: number;
	ricochetRemaining: number;
	hitEnemyIds: number[];
}

interface ForceFieldState {
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

interface EquippedWeaponState {
	instanceId: string;
	definition: WeaponDefinition;
	triggerColumn: number;
	placementX: number;
	placementY: number;
	cycleInterval: number;
	cyclesUntilTrigger: number;
}

interface LoadoutLayout {
	cellSize: number;
	gridWidth: number;
	gridHeight: number;
	left: number;
	top: number;
}

interface CampaignSketchOptions {
	persistPath?: string;
	runMode?: RunMode;
	showLoadoutSketch?: boolean;
	pixlState?: Pick<
		PersistedPixlState,
		'xp' | 'defence' | 'agility' | 'ownedWeapons' | 'loadoutPlacements'
	> | null;
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

function buildSpawnQueue(level: CampaignLevel): GlitchKind[] {
	const queue: GlitchKind[] = [];

	for (let index = 0; index < level.composition.biters; index += 1) {
		queue.push('biter');
	}

	for (let index = 0; index < level.composition.swarmers; index += 1) {
		queue.push('swarmer');
	}

	for (let index = 0; index < level.composition.tankers; index += 1) {
		queue.push('tanker');
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

function getWeaponTriggerColumn(weapon: WeaponDefinition, placementX: number) {
	const leftmostShapeColumn = Math.min(...weapon.shape.cells.map(([cellX]) => cellX));

	return placementX + leftmostShapeColumn;
}

function buildEquippedWeapons(
	ownedWeapons: OwnedWeaponInstance[] | null | undefined,
	loadoutPlacements: PersistedPixlState['loadoutPlacements'] | null | undefined
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

			const definition = getWeaponDefinition(ownedWeapon.definitionId);
			const triggerColumn = getWeaponTriggerColumn(definition, placement.x);

			if (triggerColumn < 0 || triggerColumn >= LOADOUT_COLUMN_COUNT) {
				return null;
			}

			return {
				instanceId: ownedWeapon.instanceId,
				definition,
				triggerColumn,
				placementX: placement.x,
				placementY: placement.y,
				cycleInterval: Math.max(1, definition.attack.cycleInterval ?? 1),
				cyclesUntilTrigger: Math.max(1, definition.attack.cycleInterval ?? 1)
			} satisfies EquippedWeaponState;
		})
		.filter((weapon): weapon is EquippedWeaponState => weapon !== null)
		.sort(
			(left, right) =>
				left.triggerColumn - right.triggerColumn || left.instanceId.localeCompare(right.instanceId)
		);
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
		const equippedWeapons = buildEquippedWeapons(
			options.pixlState?.ownedWeapons,
			options.pixlState?.loadoutPlacements
		);
		const equippedWeaponColumns = [
			...new Set(equippedWeapons.map((weapon) => weapon.triggerColumn))
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
		let spawnAccumulator = 0;
		let sweepProgress = 0;
		let bankedXp = pixlProgression.xp;
		let ownedWeapons = [...(options.pixlState?.ownedWeapons ?? [])];
		let waveXp = 0;
		let waveDrops: OwnedWeaponInstance[] = [];
		let pixlHealth = pixlProgression.health;
		let pixlFlash = 0;
		let enemyId = 0;
		let spawnQueue: GlitchKind[] = [];
		let enemies: EnemyState[] = [];
		let projectiles: ProjectileState[] = [];
		let forceFields: ForceFieldState[] = [];
		let laserSweeps: LaserSweepState[] = [];
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
			centerY = p.height / 2;
			arenaRadius = Math.min(Math.min(p.width, p.height) * 0.42, FIXED_ARENA_RADIUS);
		};

		const getEnemyContactRange = (kind: GlitchKind) =>
			Math.max(
				combatProfile.collision.contactRange,
				combatProfile.collision.pixlRadius + ENEMY_VISUALS[kind].radius
			);

		const getLoadoutLayout = (): LoadoutLayout => {
			const maxGridWidth = Math.min(arenaRadius * 1.2, p.width * 0.28);
			const maxGridHeight = Math.min(arenaRadius * 0.9, p.height * 0.22);
			const rightInset = 28;
			const cellSize = Math.max(
				16,
				Math.floor(Math.min(maxGridWidth / LOADOUT_COLUMN_COUNT, maxGridHeight / LOADOUT_ROW_COUNT))
			);
			const gridWidth = cellSize * LOADOUT_COLUMN_COUNT;
			const gridHeight = cellSize * LOADOUT_ROW_COUNT;

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
					biters: currentLevel.composition.biters,
					swarmers: currentLevel.composition.swarmers,
					tankers: currentLevel.composition.tankers
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

		const getWeaponDropChance = (weapon: WeaponDefinition) => {
			return Math.max(0, weapon.drop.perLevelDropChance ?? weapon.drop.perEnemyDropChance ?? 0);
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
			spawnAccumulator = 0;
			sweepProgress = 0;
			waveXp = 0;
			waveDrops = [];
			pixlHealth = pixlProgression.health;
			pixlFlash = 0;
			enemyId = 0;
			enemies = [];
			projectiles = [];
			forceFields = [];
			laserSweeps = [];
			spawnQueue = shuffleInPlace(buildSpawnQueue(currentLevel), p);

			if (spawnQueue.length > 0) {
				spawnEnemy(spawnQueue.shift() as GlitchKind);
			}
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

			enemies.push({
				id: enemyId,
				kind,
				x,
				y,
				health: stats.health,
				maxHealth: stats.health,
				attackTimer: 1 / stats.attackSpeed,
				hitFlash: 0
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

		const awardEnemyDefeat = (enemyIndex: number) => {
			const defeatedEnemy = enemies[enemyIndex];

			if (!defeatedEnemy) {
				return;
			}

			waveXp += currentLevel.xpPerEnemy[defeatedEnemy.kind];

			enemies.splice(enemyIndex, 1);
		};

		const applyDamageToEnemy = (enemyIndex: number, damage: number, hitFlash = 0.08) => {
			const enemy = enemies[enemyIndex];

			if (!enemy) {
				return false;
			}

			enemy.health -= damage;
			enemy.hitFlash = Math.max(enemy.hitFlash, hitFlash);

			if (enemy.health <= 0) {
				awardEnemyDefeat(enemyIndex);
				return true;
			}

			return false;
		};

		const spawnForceField = (weapon: WeaponDefinition) => {
			const special = weapon.attack.special;

			if (!special || special.type !== 'force-field') {
				return;
			}

			forceFields.push({
				radius: combatProfile.collision.pixlRadius,
				maxRadius: special.maxRadius,
				expansionSpeed: special.expansionSpeed,
				lineWidth: special.lineWidth,
				damage: Math.max(1, Math.round(weapon.baseDamage)),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				hitEnemyIds: []
			});
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
				damage: Math.max(1, Math.round(weapon.baseDamage)),
				color: weapon.projectileVisual.color,
				glow: weapon.projectileVisual.glow ?? false,
				age: 0,
				duration: special.duration,
				hitEnemyIds: []
			});
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

		const fireProjectile = (
			target: EnemyState,
			weapon: WeaponDefinition,
			angleOffsetRadians = 0
		) => {
			const dx = target.x - centerX;
			const dy = target.y - centerY;
			const baseAngle = Math.atan2(dy, dx) + angleOffsetRadians;
			const directionX = Math.cos(baseAngle);
			const directionY = Math.sin(baseAngle);

			projectiles.push({
				originX: centerX,
				originY: centerY,
				x: centerX,
				y: centerY,
				lastX: centerX,
				lastY: centerY,
				directionX,
				directionY,
				perpendicularX: -directionY,
				perpendicularY: directionX,
				speed: weapon.projectileSpeed,
				distanceTravelled: 0,
				age: 0,
				damage: Math.max(1, Math.round(weapon.baseDamage)),
				color: weapon.projectileVisual.color,
				size: PROJECTILE_SIZE_BY_VISUAL[weapon.projectileVisual.size],
				shape: weapon.projectileVisual.shape ?? 'square',
				trail: weapon.projectileVisual.trail ?? 'none',
				glow: weapon.projectileVisual.glow ?? false,
				motion: weapon.attack.motion ?? 'straight',
				pierceRemaining: Math.max(0, weapon.attack.pierceCount ?? 0),
				impactRadius: Math.max(0, weapon.attack.impactRadius ?? 0),
				ricochetRemaining:
					weapon.attack.special?.type === 'ricochet' ? weapon.attack.special.bounceCount : 0,
				hitEnemyIds: []
			});
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

		const activateWeaponsAtColumn = (column: number) => {
			const target = getClosestEnemy();

			if (!target) {
				return;
			}

			for (const weapon of equippedWeapons) {
				if (weapon.triggerColumn !== column) {
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
			if (equippedWeapons.length === 0) {
				return;
			}

			let remainingColumns = dt * pixlProgression.attackSpeed * LOADOUT_COLUMN_COUNT;

			while (remainingColumns > 0) {
				const distanceToEnd = LOADOUT_COLUMN_COUNT - sweepProgress;
				const step = Math.min(distanceToEnd, remainingColumns);
				const nextSweepProgress = sweepProgress + step;

				triggerSweepColumns(sweepProgress, nextSweepProgress);
				sweepProgress = nextSweepProgress;
				remainingColumns -= step;

				if (sweepProgress >= LOADOUT_COLUMN_COUNT) {
					sweepProgress = 0;
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
				field.radius += field.expansionSpeed * dt;

				for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
					const enemy = enemies[enemyIndex];

					if (field.hitEnemyIds.includes(enemy.id)) {
						continue;
					}

					const enemyRadius = ENEMY_VISUALS[enemy.kind].radius;
					const distance = Math.hypot(enemy.x - centerX, enemy.y - centerY);
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

		const updateEnemies = (dt: number) => {
			for (let index = enemies.length - 1; index >= 0; index -= 1) {
				const enemy = enemies[index];
				const stats = combatProfile.glitches[enemy.kind];
				const contactRange = getEnemyContactRange(enemy.kind);
				enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

				const dx = centerX - enemy.x;
				const dy = centerY - enemy.y;
				const distance = Math.hypot(dx, dy) || 1;

				if (distance > contactRange) {
					const step = Math.min(distance - contactRange, stats.moveSpeed * dt);
					enemy.x += (dx / distance) * step;
					enemy.y += (dy / distance) * step;
					continue;
				}

				enemy.attackTimer -= dt;

				while (enemy.attackTimer <= 0) {
					enemy.attackTimer += 1 / stats.attackSpeed;
					pixlHealth = Math.max(0, pixlHealth - stats.contactDamage);
					pixlFlash = 0.16;

					if (pixlHealth === 0) {
						return;
					}
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

				projectile.distanceTravelled += projectile.speed * dt;

				const waveOffset = projectile.motion === 'wave' ? Math.sin(projectile.age * 18) * 10 : 0;

				projectile.x =
					projectile.originX +
					projectile.directionX * projectile.distanceTravelled +
					projectile.perpendicularX * waveOffset;
				projectile.y =
					projectile.originY +
					projectile.directionY * projectile.distanceTravelled +
					projectile.perpendicularY * waveOffset;

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
			const sweepX = layout.left + (sweepProgress / LOADOUT_COLUMN_COUNT) * layout.gridWidth;

			p.push();
			p.rectMode(p.CORNER);
			p.strokeWeight(1);

			p.noStroke();
			p.fill(0, 0, 0, 188);
			p.rect(layout.left - 8, layout.top - 8, layout.gridWidth + 16, layout.gridHeight + 16, 14);

			for (let row = 0; row < LOADOUT_ROW_COUNT; row += 1) {
				for (let column = 0; column < LOADOUT_COLUMN_COUNT; column += 1) {
					const x = layout.left + column * layout.cellSize;
					const y = layout.top + row * layout.cellSize;

					p.stroke(48, 48, 48, 200);
					p.fill(14, 14, 14, 220);
					p.rect(x, y, layout.cellSize, layout.cellSize, 4);
				}
			}

			for (const weapon of equippedWeapons) {
				const fill = WEAPON_FILL_BY_RARITY[weapon.definition.rarity];

				for (const [cellX, cellY] of weapon.definition.shape.cells) {
					const gridX = weapon.placementX + cellX;
					const gridY = weapon.placementY + cellY;

					if (
						gridX < 0 ||
						gridX >= LOADOUT_COLUMN_COUNT ||
						gridY < 0 ||
						gridY >= LOADOUT_ROW_COUNT
					) {
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
			p.pop();
		};

		const drawProjectiles = () => {
			p.push();

			for (const field of forceFields) {
				if (field.glow) {
					p.noFill();
					p.stroke(`${field.color}44`);
					p.strokeWeight(field.lineWidth * 1.6);
					p.circle(centerX, centerY, field.radius * 2.15);
				}

				p.noFill();
				p.stroke(field.color);
				p.strokeWeight(field.lineWidth);
				p.circle(centerX, centerY, field.radius * 2);
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

				if (enemy.kind === 'swarmer') {
					p.rectMode(p.CENTER);
					p.square(enemy.x, enemy.y, visual.radius * 1.8);
				} else {
					p.circle(enemy.x, enemy.y, visual.radius * 2);
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
				updateEnemies(dt);

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
						startLevel(currentLevelIndex);
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

export const campaign1Sketch = createCampaignSketch(campaign1, getCampaignCombatProfile(1));
