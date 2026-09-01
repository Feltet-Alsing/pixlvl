import type P5 from 'p5';

export interface UtilityLinkedEnemyProps {
	x: number;
	y: number;
	radius: number;
}

export interface OathbreakerSigilEffectProps {
	kind: 'oathbreaker-sigil';
	arenaCenterX: number;
	arenaCenterY: number;
	currentRadius: number;
	radius: number;
	age: number;
	sweepDuration: number;
	duration: number;
	angle: number;
	halfArcRadians: number;
	lineWidth: number;
	color: string;
	glow: boolean;
	chainedEnemies: UtilityLinkedEnemyProps[];
}

export interface MineShieldTurretEffectProps {
	kind: 'mine-shield-turret';
	arenaCenterX: number;
	arenaCenterY: number;
	centerX: number;
	centerY: number;
	markerSize: number;
	color: string;
	glow: boolean;
	age: number;
	beamPulse: number;
	shieldRatioFromMineDamage: number;
}

export interface StoneWardEffectProps {
	kind: 'stone-ward';
	arenaCenterX: number;
	arenaCenterY: number;
	radius: number;
	lineWidth: number;
	color: string;
	glow: boolean;
	pulse: number;
	shieldRatio: number;
}

export interface VanishRuneEffectProps {
	kind: 'vanish-rune';
	arenaCenterX: number;
	arenaCenterY: number;
	radius: number;
	age: number;
	duration: number;
	pulse: number;
	color: string;
	glow: boolean;
}

export type UtilityArenaEffectProps =
	| OathbreakerSigilEffectProps
	| MineShieldTurretEffectProps
	| StoneWardEffectProps
	| VanishRuneEffectProps;

export function drawOathbreakerSigilEffect(p: P5, sigil: OathbreakerSigilEffectProps) {
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
			sigil.arenaCenterX,
			sigil.arenaCenterY,
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
		sigil.arenaCenterX,
		sigil.arenaCenterY,
		sigil.currentRadius * 2,
		sigil.currentRadius * 2,
		startAngle,
		endAngle
	);

	for (let pointIndex = 0; pointIndex < chainPointCount; pointIndex += 1) {
		const t = pointIndex / (chainPointCount - 1);
		const pointAngle = p.lerp(startAngle, endAngle, t);
		const pointX = sigil.arenaCenterX + Math.cos(pointAngle) * sigil.currentRadius;
		const pointY = sigil.arenaCenterY + Math.sin(pointAngle) * sigil.currentRadius;

		if (pointIndex > 0) {
			p.stroke(`${sigil.color}${alphaHex}`);
			p.strokeWeight(2.2);
			p.line(previousChainX, previousChainY, pointX, pointY);
		}

		p.noStroke();
		p.fill(pointIndex % 2 === 0 ? `#fef3c7${alphaHex}` : `${sigil.color}${alphaHex}`);
		p.circle(pointX, pointY, pointIndex === 0 || pointIndex === chainPointCount - 1 ? 7 : 5.6);

		previousChainX = pointX;
		previousChainY = pointY;
	}

	for (const enemy of sigil.chainedEnemies) {
		const enemyAngle = Math.atan2(enemy.y - sigil.arenaCenterY, enemy.x - sigil.arenaCenterX);
		const anchorX =
			sigil.arenaCenterX + Math.cos(enemyAngle) * Math.min(sigil.currentRadius, sigil.radius);
		const anchorY =
			sigil.arenaCenterY + Math.sin(enemyAngle) * Math.min(sigil.currentRadius, sigil.radius);
		p.noFill();
		p.stroke(`${sigil.color}${alphaHex}`);
		p.strokeWeight(1.8);
		p.line(anchorX, anchorY, enemy.x, enemy.y);
		p.noStroke();
		p.fill(`#fef3c7${alphaHex}`);
		p.circle(anchorX, anchorY, 5);
		p.circle(enemy.x, enemy.y, enemy.radius * 2.4);
	}

	if (sigil.chainedEnemies.length > 1) {
		for (let enemyIndex = 0; enemyIndex < sigil.chainedEnemies.length; enemyIndex += 1) {
			const enemy = sigil.chainedEnemies[enemyIndex];
			const nextEnemy = sigil.chainedEnemies[(enemyIndex + 1) % sigil.chainedEnemies.length];
			p.stroke(`${sigil.color}88`);
			p.strokeWeight(1.2);
			p.line(enemy.x, enemy.y, nextEnemy.x, nextEnemy.y);
		}
	}
}

export function drawMineShieldTurretEffect(p: P5, turret: MineShieldTurretEffectProps) {
	const pulse = 0.95 + Math.sin(turret.age * 4.6) * 0.05;
	const beamPulse = 0.7 + Math.sin(turret.beamPulse * 8.2) * 0.18;
	const barrelAngle = Math.atan2(
		turret.arenaCenterY - turret.centerY,
		turret.arenaCenterX - turret.centerX
	);
	const beamAnchorX = turret.centerX + Math.cos(barrelAngle) * turret.markerSize * 0.9;
	const beamAnchorY = turret.centerY + Math.sin(barrelAngle) * turret.markerSize * 0.9;
	const beamMidX = p.lerp(beamAnchorX, turret.arenaCenterX, 0.5);
	const beamMidY = p.lerp(beamAnchorY, turret.arenaCenterY, 0.5);

	if (turret.glow) {
		p.noStroke();
		p.fill(`${turret.color}1f`);
		p.circle(turret.centerX, turret.centerY, turret.markerSize * 4.3 * pulse);

		p.stroke(`${turret.color}24`);
		p.strokeWeight(turret.markerSize * 0.58 * beamPulse);
		p.noFill();
		p.bezier(
			beamAnchorX,
			beamAnchorY,
			beamMidX,
			beamMidY - turret.markerSize * 1.1,
			beamMidX,
			beamMidY + turret.markerSize * 1.1,
			turret.arenaCenterX,
			turret.arenaCenterY
		);
	}

	p.push();
	p.translate(turret.centerX, turret.centerY);
	p.rotate(barrelAngle);
	p.rectMode(p.CENTER);
	p.noStroke();
	p.fill('#0f172acc');
	p.circle(0, 0, turret.markerSize * 1.9);
	p.fill(turret.color);
	p.circle(0, 0, turret.markerSize * 1.15);
	p.fill('#e0f2fecc');
	p.circle(0, -turret.markerSize * 0.08, turret.markerSize * 0.34);
	p.fill('#dbeafecc');
	p.rect(
		turret.markerSize * 0.44,
		-turret.markerSize * 0.08,
		turret.markerSize * 1.08,
		turret.markerSize * 0.28,
		2
	);
	p.fill('#082f49cc');
	p.rect(
		-turret.markerSize * 0.1,
		turret.markerSize * 0.86,
		turret.markerSize * 0.34,
		turret.markerSize * 0.76,
		2
	);
	p.pop();

	p.noFill();
	p.stroke(`${turret.color}aa`);
	p.strokeWeight(Math.max(1.5, turret.markerSize * 0.18 * beamPulse));
	p.bezier(
		beamAnchorX,
		beamAnchorY,
		beamMidX,
		beamMidY - turret.markerSize * 0.9,
		beamMidX,
		beamMidY + turret.markerSize * 0.9,
		turret.arenaCenterX,
		turret.arenaCenterY
	);

	p.noStroke();
	p.fill('#f0f9ffbb');
	p.circle(turret.arenaCenterX, turret.arenaCenterY, turret.markerSize * 0.78);
	p.fill(`${turret.color}66`);
	p.circle(turret.arenaCenterX, turret.arenaCenterY, turret.markerSize * (1.2 + beamPulse * 0.28));
}

export function drawStoneWardEffect(p: P5, ward: StoneWardEffectProps) {
	const alphaHex = Math.round((0.35 + ward.shieldRatio * 0.45) * 255)
		.toString(16)
		.padStart(2, '0');
	const glowAlphaHex = Math.round((0.12 + ward.shieldRatio * 0.18) * 255)
		.toString(16)
		.padStart(2, '0');
	const stoneCount = 10;
	const orbitRadius = ward.radius + ward.lineWidth * 0.15;

	if (ward.glow) {
		p.noFill();
		p.stroke(`${ward.color}${glowAlphaHex}`);
		p.strokeWeight(ward.lineWidth * 1.8);
		p.circle(ward.arenaCenterX, ward.arenaCenterY, ward.radius * 2.06);
	}

	p.noFill();
	p.stroke(`#e2e8f0${alphaHex}`);
	p.strokeWeight(Math.max(1.5, ward.lineWidth * 0.34));
	p.circle(ward.arenaCenterX, ward.arenaCenterY, ward.radius * 2.02);

	p.stroke(`${ward.color}${alphaHex}`);
	p.strokeWeight(ward.lineWidth);
	p.circle(ward.arenaCenterX, ward.arenaCenterY, ward.radius * 2);

	for (let stoneIndex = 0; stoneIndex < stoneCount; stoneIndex += 1) {
		const angle = (p.TWO_PI * stoneIndex) / stoneCount + ward.pulse * 0.22;
		const stoneX = ward.arenaCenterX + Math.cos(angle) * orbitRadius;
		const stoneY = ward.arenaCenterY + Math.sin(angle) * orbitRadius;
		const stoneSize = ward.lineWidth * (0.62 + (stoneIndex % 3) * 0.12);

		p.noStroke();
		p.fill(`#02061766`);
		p.circle(stoneX + 1.2, stoneY + 1.2, stoneSize * 1.05);
		p.fill(stoneIndex % 2 === 0 ? `#e2e8f0${alphaHex}` : `${ward.color}${alphaHex}`);
		p.circle(stoneX, stoneY, stoneSize);
	}
}

export function drawVanishRuneEffect(p: P5, effect: VanishRuneEffectProps) {
	const life = Math.max(0, 1 - effect.age / Math.max(0.0001, effect.duration));
	const pulse = 0.92 + Math.sin(effect.pulse * 5.4) * 0.08;
	const ringRadius = effect.radius * (1 + (1 - life) * 0.08);
	const alphaHex = Math.round((0.24 + life * 0.42) * 255)
		.toString(16)
		.padStart(2, '0');

	if (effect.glow) {
		p.noStroke();
		p.fill(`${effect.color}18`);
		p.circle(effect.arenaCenterX, effect.arenaCenterY, ringRadius * 2.9 * pulse);
		p.fill(`#dcfce722`);
		p.circle(effect.arenaCenterX, effect.arenaCenterY, ringRadius * 2.15 * pulse);
	}

	p.noFill();
	p.stroke(`#f0fdf4${alphaHex}`);
	p.strokeWeight(2.2);
	p.circle(effect.arenaCenterX, effect.arenaCenterY, ringRadius * 1.96);
	p.stroke(`${effect.color}${alphaHex}`);
	p.strokeWeight(3.2);
	p.circle(effect.arenaCenterX, effect.arenaCenterY, ringRadius * 2.2);

	for (let shardIndex = 0; shardIndex < 6; shardIndex += 1) {
		const angle = (p.TWO_PI * shardIndex) / 6 + effect.pulse * 0.6;
		const shardX = effect.arenaCenterX + Math.cos(angle) * ringRadius * 1.18;
		const shardY = effect.arenaCenterY + Math.sin(angle) * ringRadius * 1.18;
		p.noStroke();
		p.fill(shardIndex % 2 === 0 ? `${effect.color}${alphaHex}` : `#f0fdf4${alphaHex}`);
		p.circle(shardX, shardY, 5.5 * pulse);
	}
}
