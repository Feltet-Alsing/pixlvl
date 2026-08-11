import type P5 from 'p5';

import { campaign1, getCampaignCombatProfile } from '$lib/data';
import type { CampaignDefinition, CampaignLevel, CombatProfile, GlitchKind } from '$lib/data/types';
import type { PersistedCampaignProgress, PersistedPixlState } from '$lib/server/game-state';

const MAX_WIDTH = 760;
const BASE_HEIGHT = 520;
const ASPECT_RATIO = MAX_WIDTH / BASE_HEIGHT;
const PROJECTILE_SIZE = 5;
const LEVEL_CLEAR_DELAY = 1.1;
const LEVEL_RESET_DELAY = 1.2;
const CAMPAIGN_LOOP_DELAY = 2.2;

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
}

interface CampaignSketchOptions {
	persistPath?: string;
	pixlState?: Pick<PersistedPixlState, 'gold' | 'health' | 'damage' | 'attackSpeed'> | null;
	campaignState?: Pick<
		PersistedCampaignProgress,
		'currentLevel' | 'highestUnlockedLevel' | 'highestClearedLevel' | 'completed'
	> | null;
}

function getCanvasSize(canvas: HTMLCanvasElement | null) {
	const parentWidth = canvas?.parentElement?.clientWidth ?? MAX_WIDTH;
	const width = Math.min(parentWidth, MAX_WIDTH);

	return {
		width,
		height: Math.round(width / ASPECT_RATIO)
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

export function createCampaignSketch(
	campaign: CampaignDefinition,
	combatProfile: CombatProfile,
	options: CampaignSketchOptions = {}
) {
	return (p: P5) => {
		const levels = campaign.levels;
		const pixlStats = {
			health: options.pixlState?.health ?? combatProfile.pixl.health,
			damage: options.pixlState?.damage ?? combatProfile.pixl.damage,
			attackSpeed: options.pixlState?.attackSpeed ?? combatProfile.pixl.attackSpeed
		};
		const persistenceEnabled = Boolean(options.persistPath && options.pixlState && options.campaignState);

		let canvas: HTMLCanvasElement | null = null;
		let currentLevelIndex = Math.max(
			0,
			Math.min((options.campaignState?.currentLevel ?? 1) - 1, levels.length - 1)
		);
		let currentLevel = levels[currentLevelIndex];
		let status: WaveStatus = 'running';
		let statusTimer = 0;
		let shotAccumulator = 0;
		let spawnAccumulator = 0;
		let bankedGold = options.pixlState?.gold ?? 0;
		let waveGold = 0;
		let pixlHealth = pixlStats.health;
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

		const persistProgress = (nextCurrentLevel: number) => {
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
						gold: bankedGold,
						health: pixlStats.health,
						damage: pixlStats.damage,
						attackSpeed: pixlStats.attackSpeed
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
			arenaRadius = Math.min(p.width, p.height) * 0.42;
		};

		const startLevel = (levelIndex: number) => {
			currentLevelIndex = levelIndex;
			currentLevel = levels[currentLevelIndex];
			status = 'running';
			statusTimer = 0;
			shotAccumulator = 0;
			spawnAccumulator = 0;
			waveGold = 0;
			pixlHealth = pixlStats.health;
			pixlFlash = 0;
			enemyId = 0;
			enemies = [];
			projectiles = [];
			spawnQueue = shuffleInPlace(buildSpawnQueue(currentLevel), p);

			if (spawnQueue.length > 0) {
				spawnEnemy(spawnQueue.shift() as GlitchKind);
			}
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

		const fireProjectile = (target: EnemyState) => {
			const dx = target.x - centerX;
			const dy = target.y - centerY;
			const distance = Math.hypot(dx, dy) || 1;

			projectiles.push({
				x: centerX,
				y: centerY,
				vx: (dx / distance) * combatProfile.projectileSpeed,
				vy: (dy / distance) * combatProfile.projectileSpeed,
				damage: pixlStats.damage
			});
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

			shotAccumulator += dt * pixlStats.attackSpeed;

			while (shotAccumulator >= 1) {
				shotAccumulator -= 1;
				const target = getClosestEnemy();

				if (!target) {
					break;
				}

				fireProjectile(target);
			}
		};

		const updateEnemies = (dt: number) => {
			for (let index = enemies.length - 1; index >= 0; index -= 1) {
				const enemy = enemies[index];
				const stats = combatProfile.glitches[enemy.kind];
				enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

				const dx = centerX - enemy.x;
				const dy = centerY - enemy.y;
				const distance = Math.hypot(dx, dy) || 1;

				if (distance > combatProfile.collision.contactRange) {
					const step = Math.min(
						distance - combatProfile.collision.contactRange,
						stats.moveSpeed * dt
					);
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
					const hitRadius = ENEMY_VISUALS[enemy.kind].radius + PROJECTILE_SIZE;
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
						waveGold += currentLevel.goldPerEnemy[enemy.kind];
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
			p.fill(255, 52, 52);
			p.rectMode(p.CENTER);

			for (const projectile of projectiles) {
				p.square(projectile.x, projectile.y, PROJECTILE_SIZE);
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

		const drawHud = () => {
			const healthRatio = pixlHealth / pixlStats.health;
			const remainingEnemies = enemies.length + spawnQueue.length;

			p.push();
			p.textFont('monospace');
			p.textAlign(p.LEFT, p.TOP);
			p.noStroke();
			p.fill(255);
			p.textSize(12);
			p.text(
				`CAMPAIGN ${campaign.campaign}  STAGE ${currentLevel.stage}  LEVEL ${currentLevel.stageLevel}`,
				18,
				16
			);
			p.fill(160);
			p.text(`PIXL HP ${Math.ceil(pixlHealth)} / ${pixlStats.health}`, 18, 38);
			p.text(`BANKED GOLD ${bankedGold}`, 18, 56);
			p.text(`WAVE GOLD ${waveGold}`, 18, 74);
			p.text(`REMAINING ${remainingEnemies}`, 18, 92);
			p.text(
				`B ${currentLevel.composition.biters}  S ${currentLevel.composition.swarmers}  T ${currentLevel.composition.tankers}`,
				18,
				110
			);

			p.fill(255, 52, 52);
			p.rect(18, 138, 180 * healthRatio, 6, 999);
			p.noFill();
			p.stroke(84);
			p.rect(18, 138, 180, 6, 999);

			p.noStroke();
			p.fill(128);
			p.text(
				'white ring = pixl  |  red squares = shots  |  gray forms = placeholder glitches',
				18,
				p.height - 28
			);
			p.pop();
		};

		const drawStatusBanner = () => {
			if (status === 'running') {
				return;
			}

			let label = 'LEVEL CLEAR';
			let color: [number, number, number] = [255, 255, 255];

			if (status === 'defeated') {
				label = 'PIXL DOWN';
				color = [255, 96, 96];
			}

			if (status === 'complete') {
				label = `CAMPAIGN ${campaign.campaign} COMPLETE`;
				color = [255, 255, 255];
			}

			p.push();
			p.textAlign(p.CENTER, p.CENTER);
			p.textFont('monospace');
			p.fill(0, 190);
			p.noStroke();
			p.rectMode(p.CENTER);
			p.rect(centerX, 40, 240, 34, 999);
			p.fill(...color);
			p.textSize(13);
			p.text(label, centerX, 40);
			p.pop();
		};

		p.setup = () => {
			const { width, height } = getCanvasSize(canvas);
			canvas = p.createCanvas(width, height).elt as HTMLCanvasElement;
			updateArenaMetrics();
			startLevel(currentLevelIndex);
		};

		p.draw = () => {
			const dt = Math.min(p.deltaTime / 1000, 0.05);
			pixlFlash = Math.max(0, pixlFlash - dt);

			if (status === 'running') {
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
			} else {
				statusTimer -= dt;

				if (statusTimer <= 0) {
					if (status === 'defeated') {
						startLevel(currentLevelIndex);
					} else {
						bankedGold += waveGold;
						highestClearedLevel = Math.max(highestClearedLevel, currentLevel.campaignLevel);

						if (status === 'complete') {
							completed = true;
							highestUnlockedLevel = campaign.totalLevels;
							persistProgress(campaign.totalLevels);
							startLevel(0);
						} else {
							highestUnlockedLevel = Math.max(
								highestUnlockedLevel,
								currentLevel.campaignLevel + 1
							);
							persistProgress(currentLevel.campaignLevel + 1);
							startLevel(currentLevelIndex + 1);
						}
					}
				}
			}

			drawArena();
			drawProjectiles();
			drawEnemies();
			drawPixl();
			drawHud();
			drawStatusBanner();
		};

		p.windowResized = () => {
			const { width, height } = getCanvasSize(canvas);
			p.resizeCanvas(width, height);
			updateArenaMetrics();
			startLevel(currentLevelIndex);
		};
	};
}

export const campaign1Sketch = createCampaignSketch(campaign1, getCampaignCombatProfile(1));
