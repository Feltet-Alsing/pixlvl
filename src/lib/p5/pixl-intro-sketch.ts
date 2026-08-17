import type P5 from 'p5';

import { baselineCombatProfile } from '$lib/data';
import type { GlitchKind } from '$lib/data/types';
import type { PersistedPixlState } from '$lib/server/game-state';

const MAX_WIDTH = 760;
const BASE_HEIGHT = 520;
const ASPECT_RATIO = MAX_WIDTH / BASE_HEIGHT;
const PROJECTILE_SIZE = 5;
const RESET_DELAY = 1.2;
const INTRO_PROJECTILE_DAMAGE = 1; // New constant for projectile damage

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

interface EnemyState {
	id: number;
	kind: GlitchKind;
	x: number;
	y: number;
	health: number;
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

function getCanvasSize(canvas: HTMLCanvasElement | null) {
	const parentWidth = canvas?.parentElement?.clientWidth ?? MAX_WIDTH;
	const width = Math.min(parentWidth, MAX_WIDTH);

	return {
		width,
		height: Math.round(width / ASPECT_RATIO)
	};
}

interface PixlIntroSketchOptions {
	pixlState?: Pick<PersistedPixlState, 'xp' | 'health' | 'attackSpeed'> | null;
}

export function createPixlIntroSketch(options: PixlIntroSketchOptions = {}) {
	return (p: P5) => {
		const pixlStats = {
			health: options.pixlState?.health ?? baselineCombatProfile.pixl.health,
			attackSpeed: options.pixlState?.attackSpeed ?? baselineCombatProfile.pixl.attackSpeed,
			xp: options.pixlState?.xp ?? 0
		};

		let canvas: HTMLCanvasElement | null = null;
		let centerX = 0;
		let centerY = 0;
		let arenaRadius = 0;
		let health = pixlStats.health;
		let bankedXp = pixlStats.xp;
		let flashTimer = 0;
		let shotAccumulator = 0;
		let spawnAccumulator = 0;
		let resetTimer = 0;
		let waveId = 1;
		let enemyId = 0;
		let enemies: EnemyState[] = [];
		let projectiles: ProjectileState[] = [];

		const updateArenaMetrics = () => {
			centerX = p.width / 2;
			centerY = p.height / 2;
			arenaRadius = Math.min(p.width, p.height) * 0.42;
		};

		const resetLoop = () => {
			health = pixlStats.health;
			flashTimer = 0;
			shotAccumulator = 0;
			spawnAccumulator = 0;
			resetTimer = 0;
			enemyId = 0;
			enemies = [];
			projectiles = [];
			waveId += 1;
		};

		const pickKind = (): GlitchKind => {
			const roll = p.random();

			if (roll < 0.55) return 'biter';
			if (roll < 0.85) return 'swarmer';
			return 'tanker';
		};

		const spawnEnemy = () => {
			const kind = pickKind();
			const stats = baselineCombatProfile.glitches[kind];
			const angle = p.random(p.TWO_PI);

			enemies.push({
				id: enemyId,
				kind,
				x: centerX + Math.cos(angle) * arenaRadius,
				y: centerY + Math.sin(angle) * arenaRadius,
				health: stats.health,
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
				vx: (dx / distance) * baselineCombatProfile.projectileSpeed,
				vy: (dy / distance) * baselineCombatProfile.projectileSpeed,
				damage: INTRO_PROJECTILE_DAMAGE
			});
		};

		const updateWave = (dt: number) => {
			spawnAccumulator += dt * 1.35;

			while (spawnAccumulator >= 1 && enemies.length < 12) {
				spawnAccumulator -= 1;
				spawnEnemy();
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
				const stats = baselineCombatProfile.glitches[enemy.kind];
				enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

				const dx = centerX - enemy.x;
				const dy = centerY - enemy.y;
				const distance = Math.hypot(dx, dy) || 1;

				if (distance > baselineCombatProfile.collision.contactRange) {
					const step = Math.min(
						distance - baselineCombatProfile.collision.contactRange,
						stats.moveSpeed * dt
					);
					enemy.x += (dx / distance) * step;
					enemy.y += (dy / distance) * step;
					continue;
				}

				enemy.attackTimer -= dt;

				while (enemy.attackTimer <= 0) {
					enemy.attackTimer += 1 / stats.attackSpeed;
					health = Math.max(0, health - stats.contactDamage);
					flashTimer = 0.16;

					if (health === 0) {
						resetTimer = RESET_DELAY;
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
						bankedXp += enemy.kind === 'biter' ? 2 : enemy.kind === 'swarmer' ? 3 : 6;
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
			p.circle(centerX, centerY, baselineCombatProfile.collision.contactRange * 2.8);
		};

		const drawPixl = () => {
			p.push();
			p.noFill();
			p.strokeWeight(2);
			p.stroke(flashTimer > 0 ? 255 : 255, flashTimer > 0 ? 96 : 255, flashTimer > 0 ? 96 : 255);
			p.circle(centerX, centerY, baselineCombatProfile.collision.pixlRadius * 2);
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

				p.push();

				if (visual.stroke) {
					p.stroke(...visual.stroke);
					p.strokeWeight(1.5);
				} else {
					p.noStroke();
				}

				p.fill(
					enemy.hitFlash > 0 ? 255 : visual.fill[0],
					enemy.hitFlash > 0 ? 255 : visual.fill[1],
					enemy.hitFlash > 0 ? 255 : visual.fill[2]
				);

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

				p.pop();
			}
		};

		const drawHud = () => {
			const healthRatio = health / pixlStats.health;

			p.push();
			p.textFont('monospace');
			p.textAlign(p.LEFT, p.TOP);
			p.noStroke();
			p.fill(255);
			p.textSize(12);
			p.text('PIXL INTRO', 18, 16);
			p.fill(160);
			p.text(`HP ${Math.ceil(health)} / ${pixlStats.health}`, 18, 38);
			p.text(`AS ${pixlStats.attackSpeed.toFixed(1)} /s`, 18, 56);
			p.text(`XP ${bankedXp}`, 18, 74);
			p.text(`WAVE ${waveId}`, 18, 92);

			p.fill(255, 52, 52);
			p.rect(18, 120, 180 * healthRatio, 6, 999);
			p.noFill();
			p.stroke(84);
			p.rect(18, 120, 180, 6, 999);

			p.noStroke();
			p.fill(128);
			p.text(
				'base pixl preview  |  no campaign progression  |  placeholder glitch silhouettes',
				18,
				p.height - 28
			);
			p.pop();
		};

		p.setup = () => {
			const { width, height } = getCanvasSize(canvas);
			canvas = p.createCanvas(width, height).elt as HTMLCanvasElement;
			updateArenaMetrics();
		};

		p.draw = () => {
			const dt = Math.min(p.deltaTime / 1000, 0.05);
			flashTimer = Math.max(0, flashTimer - dt);

			if (resetTimer > 0) {
				resetTimer -= dt;

				if (resetTimer <= 0) {
					resetLoop();
				}
			} else {
				updateWave(dt);
				updateEnemies(dt);

				if (health > 0) {
					updateProjectiles(dt);
				}
			}

			drawArena();
			drawProjectiles();
			drawEnemies();
			drawPixl();
			drawHud();
		};

		p.windowResized = () => {
			const { width, height } = getCanvasSize(canvas);
			p.resizeCanvas(width, height);
			updateArenaMetrics();
		};
	};
}

export const pixlIntroSketch = createPixlIntroSketch();
