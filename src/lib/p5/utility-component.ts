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

export type UtilityArenaEffectProps = OathbreakerSigilEffectProps;

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
