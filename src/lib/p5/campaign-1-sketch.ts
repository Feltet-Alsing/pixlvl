import type P5 from 'p5';

import {
	campaign1,
	getCampaignCombatProfile,
	getCampaignWeaponPool,
	getWeaponDefinition
} from '$lib/data';
import { applyXpGain, createUpgradeablePixlState } from '$lib/game/upgrades';
import type {
	CampaignDefinition,
	CampaignLevel,
	CombatProfile,
	GlitchKind,
	OwnedWeaponInstance,
	WeaponDefinition,
	WeaponRarity,
	WeaponProjectileSize
} from '$lib/data/types';
import type { PersistedCampaignProgress, PersistedPixlState } from '$lib/server/game-state';

const MAX_WIDTH = 760;
const BASE_HEIGHT = 520;
const FIXED_ARENA_RADIUS = BASE_HEIGHT * 0.42;
const LOADOUT_ROW_COUNT = 5;
const LOADOUT_COLUMN_COUNT = 8;
const LEVEL_CLEAR_DELAY = 1.1;
const LEVEL_RESET_DELAY = 1.2;
const CAMPAIGN_LOOP_DELAY = 2.2;

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
	legendary: [179, 132, 62]
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
	x: number;
	y: number;
	vx: number;
	vy: number;
	damage: number;
	color: string;
	size: number;
}

interface EquippedWeaponState {
	instanceId: string;
	definition: WeaponDefinition;
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
		waveDrops: number;
		remainingEnemies: number;
		composition: {
			biters: number;
			swarmers: number;
			tankers: number;
		};
		status: WaveStatus;
	}) => void;
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
				placementY: placement.y
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
		let centerX = 0;
		let centerY = 0;
		let arenaRadius = 0;
		let highestClearedLevel = options.campaignState?.highestClearedLevel ?? 0;
		let highestUnlockedLevel = options.campaignState?.highestUnlockedLevel ?? currentLevelIndex + 1;
		let completed = options.campaignState?.completed ?? false;
		let lastCombatStateKey = '';

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
				waveDrops: waveDrops.length,
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
			spawnQueue = shuffleInPlace(buildSpawnQueue(currentLevel), p);

			if (spawnQueue.length > 0) {
				spawnEnemy(spawnQueue.shift() as GlitchKind);
			}
		};

		const rollWeaponDrop = () => {
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

				if (weapon.drop.perEnemyDropChance === undefined || weapon.drop.perEnemyDropChance <= 0) {
					return false;
				}

				return true;
			});

			const successfulDrops = eligibleDrops.filter(
				(weapon) => p.random() < (weapon.drop.perEnemyDropChance ?? 0)
			);

			if (successfulDrops.length === 0) {
				return null;
			}

			const droppedWeapon = successfulDrops[Math.floor(p.random(successfulDrops.length))];

			return {
				instanceId: createWeaponInstanceId(Math.floor(p.random(1_000_000_000))),
				definitionId: droppedWeapon.id,
				source: 'drop',
				acquiredAt: new Date().toISOString(),
				campaignId: campaign.campaign,
				stage: currentLevel.stage,
				level: currentLevel.campaignLevel
			} satisfies OwnedWeaponInstance;
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

		const fireProjectile = (
			target: EnemyState,
			weapon: WeaponDefinition,
			angleOffsetRadians = 0
		) => {
			const dx = target.x - centerX;
			const dy = target.y - centerY;
			const baseAngle = Math.atan2(dy, dx) + angleOffsetRadians;

			projectiles.push({
				x: centerX,
				y: centerY,
				vx: Math.cos(baseAngle) * weapon.projectileSpeed,
				vy: Math.sin(baseAngle) * weapon.projectileSpeed,
				damage: Math.max(1, Math.round(weapon.baseDamage)),
				color: weapon.projectileVisual.color,
				size: PROJECTILE_SIZE_BY_VISUAL[weapon.projectileVisual.size]
			});
		};

		const activateWeapon = (weapon: EquippedWeaponState, target: EnemyState) => {
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
			status = currentLevelIndex === levels.length - 1 ? 'complete' : 'cleared';
			statusTimer = status === 'complete' ? CAMPAIGN_LOOP_DELAY : LEVEL_CLEAR_DELAY;
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
				projectile.x += projectile.vx * dt;
				projectile.y += projectile.vy * dt;

				let hitEnemyIndex = -1;

				for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex += 1) {
					const enemy = enemies[enemyIndex];
					const hitRadius = ENEMY_VISUALS[enemy.kind].radius + projectile.size;
					const distance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

					if (distance <= hitRadius) {
						hitEnemyIndex = enemyIndex;
						break;
					}
				}

				if (hitEnemyIndex >= 0) {
					const enemy = enemies[hitEnemyIndex];
					enemy.health -= projectile.damage;
					enemy.hitFlash = 0.08;
					projectiles.splice(index, 1);

					if (enemy.health <= 0) {
						waveXp += currentLevel.xpPerEnemy[enemy.kind];
						const droppedWeapon = rollWeaponDrop();

						if (droppedWeapon) {
							waveDrops = [...waveDrops, droppedWeapon];
						}

						enemies.splice(hitEnemyIndex, 1);
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
			p.noStroke();
			p.rectMode(p.CENTER);

			for (const projectile of projectiles) {
				p.fill(projectile.color);
				p.square(projectile.x, projectile.y, projectile.size);
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

			syncCanvasSize();
			if (runMode === 'combat' && status === 'running') {
				updateWaveFlow(dt);
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
