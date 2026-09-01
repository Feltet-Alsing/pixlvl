import type P5 from 'p5';

import type {
	WeaponProjectileVisual,
	WeaponProjectileMotion,
	WeaponProjectileShape,
	WeaponTrailStyle
} from '$lib/data/types';

export interface WeaponVisualProps {
	color: string;
	size: number;
	shape: WeaponProjectileShape;
	trail: WeaponTrailStyle;
	glow: boolean;
}

export interface WeaponAnimationProps {
	age: number;
	directionX: number;
	directionY: number;
	lastX: number;
	lastY: number;
	motion: WeaponProjectileMotion;
}

export interface WeaponComponentProps {
	x: number;
	y: number;
	visual: WeaponVisualProps;
	animation: WeaponAnimationProps;
}

export interface WeaponVariantComponentProps extends WeaponComponentProps {
	weaponId: string;
	originX: number;
	originY: number;
}

export interface ForceFieldEffectProps {
	kind: 'force-field';
	centerX: number;
	centerY: number;
	startDelay: number;
	radius: number;
	lineWidth: number;
	color: string;
	glow: boolean;
	age: number;
}

export interface RuneCastEffectProps {
	kind: 'rune-cast';
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

export interface SunRuneEffectProps {
	kind: 'sun-rune';
	centerX: number;
	centerY: number;
	radius: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

export interface HealingRuneEffectProps {
	kind: 'healing-rune';
	centerX: number;
	centerY: number;
	radius: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

export interface SlowingRuneEffectProps {
	kind: 'slowing-rune';
	centerX: number;
	centerY: number;
	radius: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

export interface SunbrandRuneEffectProps {
	kind: 'sunbrand-rune';
	centerX: number;
	centerY: number;
	radius: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

export interface BindingRuneEffectProps {
	kind: 'binding-rune';
	centerX: number;
	centerY: number;
	radius: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

export interface JudgmentRuneSunEffectProps {
	kind: 'judgment-rune-sun';
	centerX: number;
	centerY: number;
	orbitRadius: number;
	orbitAngle: number;
	sunRadius: number;
	damageRadius: number;
	age: number;
	duration: number;
	color: string;
	glow: boolean;
}

export interface KillSwitchPulseEffectProps {
	kind: 'kill-switch-pulse';
	centerX: number;
	centerY: number;
	radius: number;
	lineWidth: number;
	color: string;
	glow: boolean;
}

export interface VulnerablePulseEffectProps {
	kind: 'vulnerable-pulse';
	centerX: number;
	centerY: number;
	radius: number;
	lineWidth: number;
	color: string;
	glow: boolean;
}

export interface StasisFieldEffectProps {
	kind: 'stasis-field';
	centerX: number;
	centerY: number;
	radius: number;
	color: string;
	glow: boolean;
}

export interface VoidTunnelEffectProps {
	kind: 'void-tunnel';
	variant: 'void-tunnel' | 'black-hole';
	centerX: number;
	centerY: number;
	halfWidth: number;
	halfHeight: number;
	age: number;
	duration: number;
	color: string;
	glow: boolean;
	easeInQuad: (value: number) => number;
}

export interface VoidRiftEffectProps {
	kind: 'void-rift';
	centerX: number;
	centerY: number;
	angle: number;
	halfWidth: number;
	halfHeight: number;
	age: number;
	activeDuration: number;
	collapseAge: number;
	collapseDuration: number;
	hasCollapsed: boolean;
	finalPulseRadius: number;
	pulseMaxRadius: number;
	finalPulseDamage: number;
	color: string;
	glow: boolean;
	easeInQuad: (value: number) => number;
}

export interface PhaseshiftEffectProps {
	kind: 'phaseshift';
	centerX: number;
	centerY: number;
	zoneWidth: number;
	halfHeight: number;
	color: string;
}

export interface BurningGroundEffectProps {
	kind: 'burning-ground';
	centerX: number;
	centerY: number;
	radius: number;
	impactSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

export interface DelayedBombEffectProps {
	kind: 'delayed-bomb';
	centerX: number;
	centerY: number;
	radius: number;
	markerSize: number;
	color: string;
	glow: boolean;
	age: number;
	detonationDelay: number;
	hasDetonated: boolean;
	explosionFlash: number;
}

export interface PerimeterMineEffectProps {
	kind: 'perimeter-mine';
	centerX: number;
	centerY: number;
	triggerRadius: number;
	blastRadius: number;
	markerSize: number;
	color: string;
	glow: boolean;
	age: number;
	hasDetonated: boolean;
	explosionFlash: number;
}

export interface TurretMineEffectProps {
	kind: 'turret-mine';
	centerX: number;
	centerY: number;
	markerSize: number;
	barrelAngle: number;
	color: string;
	glow: boolean;
	age: number;
	fireFlash: number;
}

export interface SupportPylonEffectProps {
	kind: 'support-pylon';
	variant: 'mark-beacon' | 'cold-lattice' | 'mine-calibrator' | 'hemorrhage-relay';
	centerX: number;
	centerY: number;
	radius: number;
	markerSize: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

export interface LaserRodNetworkEffectProps {
	kind: 'laser-rod-network';
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
	links: Array<{
		x: number;
		y: number;
	}>;
}

export interface LaserSweepEffectProps {
	kind: 'laser-sweep';
	arenaCenterX: number;
	arenaCenterY: number;
	angle: number;
	beamLength: number;
	beamWidth: number;
	color: string;
	glow: boolean;
}

export interface SniperLockEffectProps {
	kind: 'sniper-lock';
	arenaCenterX: number;
	arenaCenterY: number;
	targetX: number;
	targetY: number;
	age: number;
	chargeDuration: number;
	lineWidth: number;
	color: string;
	glow: boolean;
}

export interface SniperChainBurstEffectProps {
	kind: 'sniper-chain-burst';
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

export interface NeedleBurstEffectProps {
	kind: 'needle-burst';
	arenaCenterX: number;
	arenaCenterY: number;
	targetX: number;
	targetY: number;
	maxReach: number;
	lineWidth: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
}

export interface ExecutionLatticeStrikeEffectProps {
	kind: 'execution-lattice-strike';
	targetX: number;
	targetY: number;
	startY: number;
	markerSize: number;
	color: string;
	glow: boolean;
	age: number;
	dropDuration: number;
	startDelay: number;
}

export interface ForkLightningEffectProps {
	kind: 'fork-lightning';
	segments: Array<{
		from: { x: number; y: number };
		to: { x: number; y: number };
		startDelay: number;
	}>;
	branchWidth: number;
	color: string;
	glow: boolean;
	age: number;
	duration: number;
	easeInQuad: (value: number) => number;
}

export interface IceSpikeEffectProps {
	kind: 'ice-spike';
	targetX: number;
	targetY: number;
	startY: number;
	endY: number;
	age: number;
	startDelay: number;
	fallDuration: number;
	color: string;
	glow: boolean;
	driftAmplitude: number;
	driftSpeed: number;
	driftPhase: number;
	size: number;
}

export interface BlizzardStormEffectProps {
	kind: 'blizzard-storm';
	age: number;
	duration: number;
	color: string;
	glow: boolean;
	canvasWidth: number;
	canvasHeight: number;
}

export interface VoidTendrilEffectProps {
	kind: 'void-tendril';
	arenaCenterX: number;
	arenaCenterY: number;
	targetX: number;
	targetY: number;
	age: number;
	duration: number;
	color: string;
	glow: boolean;
	easeInQuad: (value: number) => number;
}

export interface NaturesWrathEffectProps {
	kind: 'natures-wrath';
	arenaCenterX: number;
	arenaCenterY: number;
	targetX: number;
	targetY: number;
	age: number;
	duration: number;
	pulseInterval: number;
	color: string;
	glow: boolean;
	easeInQuad: (value: number) => number;
}

export type WeaponArenaEffectProps =
	| RuneCastEffectProps
	| SunRuneEffectProps
	| HealingRuneEffectProps
	| SlowingRuneEffectProps
	| SunbrandRuneEffectProps
	| BindingRuneEffectProps
	| JudgmentRuneSunEffectProps
	| ForceFieldEffectProps
	| KillSwitchPulseEffectProps
	| VulnerablePulseEffectProps
	| StasisFieldEffectProps
	| VoidTunnelEffectProps
	| VoidRiftEffectProps
	| PhaseshiftEffectProps
	| BurningGroundEffectProps
	| DelayedBombEffectProps
	| PerimeterMineEffectProps
	| TurretMineEffectProps
	| SupportPylonEffectProps
	| LaserRodNetworkEffectProps
	| LaserSweepEffectProps
	| SniperLockEffectProps
	| SniperChainBurstEffectProps
	| NeedleBurstEffectProps
	| ExecutionLatticeStrikeEffectProps
	| ForkLightningEffectProps
	| IceSpikeEffectProps
	| BlizzardStormEffectProps
	| VoidTendrilEffectProps
	| NaturesWrathEffectProps;

export function createWeaponVisualProps(
	visual: WeaponProjectileVisual,
	{
		size,
		shape = visual.shape ?? 'square',
		trail = visual.trail ?? 'none',
		glow = visual.glow ?? false,
		color = visual.color
	}: {
		size: number;
		shape?: WeaponProjectileShape;
		trail?: WeaponTrailStyle;
		glow?: boolean;
		color?: string;
	}
): WeaponVisualProps {
	return {
		color,
		size,
		shape,
		trail,
		glow
	};
}

export function drawWeaponComponent(p: P5, { x, y, visual, animation }: WeaponComponentProps) {
	if (visual.trail === 'streak') {
		p.stroke(visual.color);
		p.strokeWeight(Math.max(1.5, visual.size * 0.45));
		p.line(animation.lastX, animation.lastY, x, y);
	}

	if (visual.glow) {
		p.noStroke();
		p.fill(`${visual.color}55`);
		p.circle(x, y, visual.size * 2.4);
	}

	if (visual.trail === 'pulse') {
		p.noFill();
		p.stroke(`${visual.color}88`);
		p.strokeWeight(1);
		p.circle(x, y, visual.size * (2.2 + Math.sin(animation.age * 12) * 0.35));
	}

	p.noStroke();
	p.fill(visual.color);

	if (visual.shape === 'orb') {
		p.circle(x, y, visual.size * 1.35);
		return;
	}

	p.push();
	p.translate(x, y);

	if (visual.shape === 'knife') {
		p.rotate(Math.atan2(animation.directionY, animation.directionX));
		p.rectMode(p.CENTER);
		p.fill('#f8fafc');
		p.beginShape();
		p.vertex(visual.size * 1.05, 0);
		p.vertex(visual.size * 0.2, -visual.size * 0.12);
		p.vertex(-visual.size * 0.16, -visual.size * 0.28);
		p.vertex(-visual.size * 0.32, 0);
		p.vertex(-visual.size * 0.16, visual.size * 0.28);
		p.vertex(visual.size * 0.2, visual.size * 0.12);
		p.endShape(p.CLOSE);
		p.fill('#e2e8f0');
		p.beginShape();
		p.vertex(visual.size * 0.72, 0);
		p.vertex(visual.size * 0.08, -visual.size * 0.05);
		p.vertex(-visual.size * 0.04, 0);
		p.vertex(visual.size * 0.08, visual.size * 0.05);
		p.endShape(p.CLOSE);
		p.fill('#d97706');
		p.rect(-visual.size * 0.28, 0, visual.size * 0.22, Math.max(2, visual.size * 0.36), 2);
		p.fill('#5b4636');
		p.rect(-visual.size * 0.54, 0, visual.size * 0.44, Math.max(2, visual.size * 0.2), 2);
		p.fill('#7f1d1d');
		p.triangle(
			-visual.size * 0.86,
			0,
			-visual.size * 0.66,
			-visual.size * 0.12,
			-visual.size * 0.66,
			visual.size * 0.12
		);
	} else if (visual.shape === 'diamond') {
		p.rotate(Math.PI / 4);
		p.rectMode(p.CENTER);
		p.square(0, 0, visual.size * 1.05);
	} else if (visual.shape === 'spark') {
		const spinMultiplier = animation.motion === 'straight' ? 10 : 14;
		p.rotate(animation.age * spinMultiplier);
		p.rectMode(p.CENTER);
		p.rect(0, 0, visual.size * 1.4, Math.max(2, visual.size * 0.4), 2);
		p.rotate(Math.PI / 2);
		p.rect(0, 0, visual.size * 1.1, Math.max(2, visual.size * 0.3), 2);
	} else {
		p.rectMode(p.CENTER);
		p.square(0, 0, visual.size);
	}

	p.pop();
}

export function drawDefaultWeaponComponent(p: P5, props: WeaponVariantComponentProps) {
	drawWeaponComponent(p, props);
}

export function drawRuneCastEffect(p: P5, effect: RuneCastEffectProps) {
	const progress = Math.min(1, effect.age / Math.max(0.0001, effect.duration));
	const fade = 1 - progress;
	const lift = effect.centerY - 14 - progress * 12;
	const alpha = 0.45 + fade * 0.4;
	const pixelSize = Math.max(4, effect.runeSize * 0.34);
	const gap = Math.max(1.5, pixelSize * 0.18);
	const filledCells: Array<[number, number]> =
		effect.variant === 'judgment-rune'
			? [
					[0, 0],
					[1, 0],
					[2, 0],
					[0, 1],
					[1, 1],
					[2, 1],
					[0, 2],
					[0, 3]
				]
			: effect.variant === 'ascendance-rune'
				? [
						[0, 0],
						[2, 0],
						[3, 0],
						[5, 0],
						[0, 1],
						[1, 1],
						[2, 1],
						[3, 1],
						[4, 1],
						[5, 1]
					]
				: effect.variant === 'healing-rune'
					? [
							[0, 0],
							[1, 1],
							[2, 1],
							[1, 2],
							[3, 2],
							[2, 3]
						]
					: effect.variant === 'slowing-rune'
						? [
								[1, 0],
								[0, 1],
								[1, 1],
								[2, 1],
								[1, 2],
								[2, 2]
							]
						: effect.variant === 'sunbrand-rune'
							? [
									[1, 0],
									[2, 0],
									[0, 1],
									[1, 1],
									[2, 1],
									[1, 2],
									[2, 2]
								]
							: effect.variant === 'binding-rune'
								? [
										[1, 0],
										[0, 1],
										[1, 1],
										[2, 1],
										[1, 2]
									]
								: effect.variant === 'rune-reiterator'
									? [
											[0, 0],
											[1, 0],
											[2, 0],
											[0, 1],
											[1, 1],
											[2, 1],
											[1, 2],
											[2, 2]
										]
									: [
											[1, 0],
											[3, 0],
											[1, 1],
											[2, 1],
											[3, 1],
											[3, 2]
										];
	const gridWidth =
		effect.variant === 'ascendance-rune'
			? 6
			: effect.variant === 'judgment-rune'
				? 3
				: effect.variant === 'healing-rune' || effect.variant === 'sunbrand-rune'
					? 4
					: 3;
	const gridHeight =
		effect.variant === 'healing-rune'
			? 4
			: effect.variant === 'ascendance-rune'
				? 2
				: effect.variant === 'judgment-rune'
					? 4
					: 3;
	const totalWidth = pixelSize * gridWidth + gap * (gridWidth - 1);
	const totalHeight = pixelSize * gridHeight + gap * (gridHeight - 1);
	const startX = -totalWidth / 2 + pixelSize / 2;
	const startY = -totalHeight / 2 + pixelSize / 2;

	p.push();
	p.translate(effect.centerX, lift);
	p.rectMode(p.CENTER);
	p.noStroke();
	p.fill(`rgba(255, 236, 179, ${alpha})`);

	for (const [cellX, cellY] of filledCells) {
		const x = startX + cellX * (pixelSize + gap);
		const y = startY + cellY * (pixelSize + gap);
		p.square(x, y, pixelSize);
	}
	p.pop();
}

export function drawSunRuneEffect(p: P5, effect: SunRuneEffectProps) {
	const pulseProgress = Math.min(1, effect.age / Math.max(0.0001, effect.duration));
	const easedPulseProgress = 1 - Math.pow(1 - pulseProgress, 2.4);
	const waveRadius = Math.max(effect.impactSize * 1.1, effect.radius * easedPulseProgress);
	const coreRadius = Math.max(7, effect.impactSize * 0.5);
	const ringFade = Math.max(0, 1 - easedPulseProgress);
	const glowAlpha = 0.55 * ringFade;
	const haloAlpha = 0.38 * ringFade;

	if (effect.glow) {
		p.noStroke();
		p.fill(`rgba(255, 234, 184, ${glowAlpha})`);
		p.circle(effect.centerX, effect.centerY, Math.max(coreRadius * 3.6, waveRadius * 1.65));
	}

	const gradientRadius = Math.max(coreRadius * 2.3, waveRadius * 1.18);
	const ctx = p.drawingContext as CanvasRenderingContext2D;
	const gradient = ctx.createRadialGradient(
		effect.centerX,
		effect.centerY,
		0,
		effect.centerX,
		effect.centerY,
		gradientRadius
	);
	gradient.addColorStop(0, `rgba(255, 252, 241, ${Math.max(0.24, 0.76 * ringFade)})`);
	gradient.addColorStop(0.22, `rgba(255, 238, 191, ${Math.max(0.2, 0.62 * ringFade)})`);
	gradient.addColorStop(0.48, `rgba(250, 214, 126, ${Math.max(0.16, 0.46 * ringFade)})`);
	gradient.addColorStop(0.76, `rgba(255, 241, 205, ${Math.max(0.1, haloAlpha)})`);
	gradient.addColorStop(1, 'rgba(255, 241, 205, 0)');

	ctx.save();
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(effect.centerX, effect.centerY, gradientRadius, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

export function drawHealingRuneEffect(p: P5, effect: HealingRuneEffectProps) {
	const progress = Math.min(1, effect.age / Math.max(0.0001, effect.duration));
	const easedProgress = 1 - Math.pow(1 - progress, 2);
	const radius = Math.max(10, effect.radius * easedProgress);
	const alpha = 1 - progress;
	const ctx = p.drawingContext as CanvasRenderingContext2D;
	const gradient = ctx.createRadialGradient(
		effect.centerX,
		effect.centerY,
		0,
		effect.centerX,
		effect.centerY,
		radius
	);
	gradient.addColorStop(0, `rgba(241, 255, 248, ${Math.max(0.18, 0.62 * (1 - progress))})`);
	gradient.addColorStop(0.5, `rgba(130, 242, 198, ${Math.max(0.12, 0.42 * (1 - progress))})`);
	gradient.addColorStop(1, 'rgba(130, 242, 198, 0)');

	ctx.save();
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(effect.centerX, effect.centerY, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	p.push();
	p.rectMode(p.CENTER);
	p.noStroke();
	const plusCells: Array<[number, number]> = [
		[1, 0],
		[0, 1],
		[1, 1],
		[2, 1],
		[1, 2]
	];

	for (let plusIndex = 0; plusIndex < 5; plusIndex += 1) {
		const orbitAngle = -Math.PI / 2 + plusIndex * ((Math.PI * 2) / 5);
		const orbitDistance = radius * (0.18 + plusIndex * 0.08);
		const drift = progress * (16 + plusIndex * 5);
		const plusX = effect.centerX + Math.cos(orbitAngle) * orbitDistance;
		const plusY = effect.centerY + Math.sin(orbitAngle) * orbitDistance - drift;
		const cellSize = 2.2 + plusIndex * 0.38;
		const cellGap = Math.max(0.6, cellSize * 0.12);
		const glyphWidth = cellSize * 3 + cellGap * 2;
		const glyphHeight = cellSize * 3 + cellGap * 2;
		const startX = plusX - glyphWidth / 2 + cellSize / 2;
		const startY = plusY - glyphHeight / 2 + cellSize / 2;
		const plusAlpha = Math.max(0, alpha * (0.72 - plusIndex * 0.08));

		if (plusAlpha <= 0) {
			continue;
		}

		p.fill(`rgba(134, 239, 172, ${plusAlpha})`);

		for (const [cellX, cellY] of plusCells) {
			p.square(
				startX + cellX * (cellSize + cellGap),
				startY + cellY * (cellSize + cellGap),
				cellSize
			);
		}
	}

	p.pop();
}

export function drawSlowingRuneEffect(p: P5, effect: SlowingRuneEffectProps) {
	const progress = Math.min(1, effect.age / Math.max(0.0001, effect.duration));
	const easedProgress = 1 - Math.pow(1 - progress, 2.2);
	const waveRadius = Math.max(effect.impactSize * 1.1, effect.radius * easedProgress);
	const waveThickness = Math.max(2, effect.impactSize * 0.16);
	const ringFade = Math.max(0, 1 - progress);

	if (effect.glow) {
		p.noStroke();
		p.fill(`rgba(173, 232, 255, ${0.2 * ringFade})`);
		p.circle(effect.centerX, effect.centerY, Math.max(effect.impactSize * 4.8, waveRadius * 2.2));
	}

	const ctx = p.drawingContext as CanvasRenderingContext2D;
	const gradient = ctx.createRadialGradient(
		effect.centerX,
		effect.centerY,
		Math.max(0, waveRadius - waveThickness * 2),
		effect.centerX,
		effect.centerY,
		waveRadius + waveThickness * 1.8
	);
	gradient.addColorStop(0, 'rgba(142, 219, 255, 0)');
	gradient.addColorStop(0.45, `rgba(191, 242, 255, ${0.14 * ringFade})`);
	gradient.addColorStop(0.7, `rgba(142, 219, 255, ${0.62 * ringFade})`);
	gradient.addColorStop(0.88, `rgba(97, 189, 255, ${0.92 * ringFade})`);
	gradient.addColorStop(1, 'rgba(142, 219, 255, 0)');

	ctx.save();
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(effect.centerX, effect.centerY, waveRadius + waveThickness * 1.8, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	p.noFill();
	p.stroke(`rgba(220, 248, 255, ${0.9 * ringFade})`);
	p.strokeWeight(Math.max(1.4, waveThickness * 0.3));
	p.circle(effect.centerX, effect.centerY, waveRadius * 2);
}

export function drawSunbrandRuneEffect(p: P5, effect: SunbrandRuneEffectProps) {
	const progress = Math.min(1, effect.age / Math.max(0.0001, effect.duration));
	const easedProgress = 1 - Math.pow(1 - progress, 2.3);
	const waveRadius = Math.max(effect.impactSize * 1.15, effect.radius * easedProgress);
	const waveThickness = Math.max(2, effect.impactSize * 0.14);
	const ringFade = Math.max(0, 1 - progress);

	if (effect.glow) {
		p.noStroke();
		p.fill(`rgba(251, 146, 60, ${0.18 * ringFade})`);
		p.circle(effect.centerX, effect.centerY, Math.max(effect.impactSize * 5.2, waveRadius * 2.25));
	}

	const ctx = p.drawingContext as CanvasRenderingContext2D;
	const gradient = ctx.createRadialGradient(
		effect.centerX,
		effect.centerY,
		Math.max(0, waveRadius - waveThickness * 2),
		effect.centerX,
		effect.centerY,
		waveRadius + waveThickness * 2
	);
	gradient.addColorStop(0, 'rgba(251, 146, 60, 0)');
	gradient.addColorStop(0.42, `rgba(255, 222, 173, ${0.14 * ringFade})`);
	gradient.addColorStop(0.72, `rgba(251, 191, 36, ${0.52 * ringFade})`);
	gradient.addColorStop(0.88, `rgba(251, 146, 60, ${0.9 * ringFade})`);
	gradient.addColorStop(1, 'rgba(251, 146, 60, 0)');

	ctx.save();
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(effect.centerX, effect.centerY, waveRadius + waveThickness * 2, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	p.noFill();
	p.stroke(`rgba(255, 232, 184, ${0.9 * ringFade})`);
	p.strokeWeight(Math.max(1.5, waveThickness * 0.3));
	p.circle(effect.centerX, effect.centerY, waveRadius * 2);
}

export function drawBindingRuneEffect(p: P5, effect: BindingRuneEffectProps) {
	const progress = Math.min(1, effect.age / Math.max(0.0001, effect.duration));
	const easedProgress = 1 - Math.pow(1 - progress, 2.15);
	const waveRadius = Math.max(effect.impactSize * 1.05, effect.radius * easedProgress);
	const waveThickness = Math.max(2, effect.impactSize * 0.15);
	const ringFade = Math.max(0, 1 - progress);
	const latticeAlpha = 0.72 * ringFade;

	if (effect.glow) {
		p.noStroke();
		p.fill(`rgba(231, 201, 137, ${0.16 * ringFade})`);
		p.circle(effect.centerX, effect.centerY, Math.max(effect.impactSize * 5, waveRadius * 2.18));
	}

	const ctx = p.drawingContext as CanvasRenderingContext2D;
	const gradient = ctx.createRadialGradient(
		effect.centerX,
		effect.centerY,
		Math.max(0, waveRadius - waveThickness * 2),
		effect.centerX,
		effect.centerY,
		waveRadius + waveThickness * 1.9
	);
	gradient.addColorStop(0, 'rgba(231, 201, 137, 0)');
	gradient.addColorStop(0.46, `rgba(250, 240, 211, ${0.12 * ringFade})`);
	gradient.addColorStop(0.74, `rgba(231, 201, 137, ${0.5 * ringFade})`);
	gradient.addColorStop(0.9, `rgba(181, 145, 87, ${0.88 * ringFade})`);
	gradient.addColorStop(1, 'rgba(231, 201, 137, 0)');

	ctx.save();
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(effect.centerX, effect.centerY, waveRadius + waveThickness * 1.9, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	p.noFill();
	p.stroke(`rgba(250, 240, 211, ${0.9 * ringFade})`);
	p.strokeWeight(Math.max(1.4, waveThickness * 0.28));
	p.circle(effect.centerX, effect.centerY, waveRadius * 2);

	p.stroke(`rgba(181, 145, 87, ${latticeAlpha})`);
	p.strokeWeight(Math.max(1.1, waveThickness * 0.18));
	for (let spokeIndex = 0; spokeIndex < 4; spokeIndex += 1) {
		const angle = (Math.PI / 2) * spokeIndex + progress * 0.35;
		const innerRadius = Math.max(6, waveRadius - effect.impactSize * 0.5);
		const outerRadius = waveRadius + effect.impactSize * 0.18;
		p.line(
			effect.centerX + Math.cos(angle) * innerRadius,
			effect.centerY + Math.sin(angle) * innerRadius,
			effect.centerX + Math.cos(angle) * outerRadius,
			effect.centerY + Math.sin(angle) * outerRadius
		);
	}
}

export function drawNapalmGrenadeComponent(
	p: P5,
	{ x, y, visual, animation }: WeaponVariantComponentProps
) {
	const heading = Math.atan2(animation.directionY, animation.directionX);
	const pulse = 1 + Math.sin(animation.age * 18) * 0.08;

	for (let trailIndex = 0; trailIndex < 3; trailIndex += 1) {
		const trailT = trailIndex / 3;
		const trailX = p.lerp(x, animation.lastX, 0.28 + trailT * 0.22);
		const trailY = p.lerp(y, animation.lastY, 0.28 + trailT * 0.22);
		p.noStroke();
		p.fill(trailIndex === 0 ? '#ffd16666' : '#ff5f1f55');
		p.circle(trailX, trailY, visual.size * (0.95 - trailT * 0.18));
	}

	p.noStroke();
	p.fill('#ff6a1f55');
	p.circle(x, y, visual.size * 3.1 * pulse);
	p.fill('#2d120acc');
	p.circle(x, y, visual.size * 1.5);

	p.push();
	p.translate(x, y);
	p.rotate(heading + Math.PI / 4);
	p.rectMode(p.CENTER);
	p.fill('#fb923c');
	p.rect(0, 0, visual.size * 1.15, visual.size * 1.15, 3);
	p.fill('#ffe29a');
	p.rect(0, -visual.size * 0.08, visual.size * 0.42, visual.size * 0.42, 2);
	p.pop();
}

export function drawDeadeyeSniperComponent(
	p: P5,
	{ x, y, originX, originY, visual, animation }: WeaponVariantComponentProps
) {
	const heading = Math.atan2(animation.directionY, animation.directionX);
	const life = 1 - Math.min(1, animation.age / Math.max(0.0001, 0.18));
	const alphaHex = Math.round((0.3 + life * 0.7) * 255)
		.toString(16)
		.padStart(2, '0');
	const glowAlphaHex = Math.round((0.12 + life * 0.32) * 255)
		.toString(16)
		.padStart(2, '0');

	p.stroke(`#e0f2fe${glowAlphaHex}`);
	p.strokeWeight(Math.max(7, visual.size * 1.45));
	p.line(originX, originY, x, y);

	p.stroke(`#7dd3fc${alphaHex}`);
	p.strokeWeight(Math.max(3.2, visual.size * 0.72));
	p.line(originX, originY, x, y);

	p.stroke(`#f8fafc${alphaHex}`);
	p.strokeWeight(Math.max(1.4, visual.size * 0.26));
	p.line(originX, originY, x, y);

	for (let echoIndex = 1; echoIndex <= 2; echoIndex += 1) {
		const echoT = echoIndex / 3;
		const echoX = p.lerp(x, animation.lastX, echoT * 0.72);
		const echoY = p.lerp(y, animation.lastY, echoT * 0.72);
		p.noStroke();
		p.fill(echoIndex === 1 ? '#e0f2fe88' : '#7dd3fc55');
		p.circle(echoX, echoY, visual.size * (1.55 - echoT * 0.42));
	}

	p.noStroke();
	p.fill('#7dd3fcaa');
	p.circle(x, y, visual.size * 2.3);
	p.fill('#f8fafc');
	p.circle(x, y, visual.size * 1.15);

	p.push();
	p.translate(x, y);
	p.rotate(heading);
	p.rectMode(p.CENTER);
	p.noStroke();
	p.fill('#f8fafc');
	p.rect(0, 0, visual.size * 1.45, Math.max(2, visual.size * 0.3), 2);
	p.fill('#7dd3fc');
	p.rect(-visual.size * 0.36, 0, visual.size * 0.55, Math.max(2, visual.size * 0.18), 2);
	p.pop();
}

export function drawForceFieldEffect(p: P5, effect: ForceFieldEffectProps) {
	if (effect.age < effect.startDelay) {
		return;
	}

	if (effect.glow) {
		p.noFill();
		p.stroke(`${effect.color}44`);
		p.strokeWeight(effect.lineWidth * 1.6);
		p.circle(effect.centerX, effect.centerY, effect.radius * 2.15);
	}

	p.noFill();
	p.stroke(effect.color);
	p.strokeWeight(effect.lineWidth);
	p.circle(effect.centerX, effect.centerY, effect.radius * 2);
}

export function drawKillSwitchPulseEffect(p: P5, effect: KillSwitchPulseEffectProps) {
	if (effect.glow) {
		p.noFill();
		p.stroke(`${effect.color}33`);
		p.strokeWeight(effect.lineWidth * 1.9);
		p.circle(effect.centerX, effect.centerY, effect.radius * 2.1);
	}

	p.noFill();
	p.stroke(effect.color);
	p.strokeWeight(effect.lineWidth);
	p.circle(effect.centerX, effect.centerY, effect.radius * 2);
}

export function drawVulnerablePulseEffect(p: P5, effect: VulnerablePulseEffectProps) {
	if (effect.glow) {
		p.noFill();
		p.stroke(`${effect.color}33`);
		p.strokeWeight(effect.lineWidth * 1.8);
		p.circle(effect.centerX, effect.centerY, effect.radius * 2.1);
	}

	p.noFill();
	p.stroke(effect.color);
	p.strokeWeight(effect.lineWidth);
	p.circle(effect.centerX, effect.centerY, effect.radius * 2);
}

export function drawStasisFieldEffect(p: P5, effect: StasisFieldEffectProps) {
	if (effect.glow) {
		p.noFill();
		p.stroke(`${effect.color}33`);
		p.strokeWeight(10);
		p.circle(effect.centerX, effect.centerY, effect.radius * 2.2);
	}

	p.noFill();
	p.stroke(effect.color);
	p.strokeWeight(2.8);
	p.circle(effect.centerX, effect.centerY, effect.radius * 2);
}

export function drawVoidTunnelEffect(p: P5, effect: VoidTunnelEffectProps) {
	if (effect.variant === 'void-tunnel') {
		const progress = Math.min(1, effect.age / Math.max(0.0001, effect.duration * 0.32));
		const easedProgress = effect.easeInQuad(progress);
		const gapHalf = 10;
		const left = effect.centerX - effect.halfWidth;
		const width = effect.halfWidth * 2;
		const halfHeight = effect.halfHeight;
		const slabHeight = Math.max(8, halfHeight - gapHalf);
		const topStartY = effect.centerY - halfHeight - slabHeight;
		const topEndY = effect.centerY - halfHeight;
		const bottomStartY = effect.centerY + halfHeight;
		const bottomEndY = effect.centerY + gapHalf;
		const topY = topStartY + (topEndY - topStartY) * easedProgress;
		const bottomY = bottomStartY + (bottomEndY - bottomStartY) * easedProgress;
		const alphaHex = Math.round((1 - effect.age / effect.duration) * 120)
			.toString(16)
			.padStart(2, '0');

		p.noStroke();
		p.fill(`${effect.color}${alphaHex}`);
		p.rect(left, topY, width, slabHeight, 6);
		p.rect(left, bottomY, width, slabHeight, 6);
		return;
	}

	const bloomProgress = Math.min(1, effect.age / Math.max(0.0001, effect.duration * 0.28));
	const easedBloomProgress = effect.easeInQuad(bloomProgress);
	const radiusX = effect.halfWidth * easedBloomProgress;
	const radiusY = effect.halfHeight * easedBloomProgress;
	const alphaHex = Math.round((1 - effect.age / effect.duration) * 120)
		.toString(16)
		.padStart(2, '0');

	if (effect.glow) {
		p.noStroke();
		p.fill(`${effect.color}22`);
		p.ellipse(effect.centerX, effect.centerY, radiusX * 2.6, radiusY * 2.6);
	}

	const gridAlphaHex = Math.round((1 - effect.age / effect.duration) * 168)
		.toString(16)
		.padStart(2, '0');
	const gridColor = `${effect.color}${gridAlphaHex}`;

	p.noFill();
	p.stroke(gridColor);
	p.strokeWeight(1.1);

	for (let ringIndex = 0; ringIndex < 8; ringIndex += 1) {
		const ringT = ringIndex / 7;
		const ringScale = 1 - ringT * 0.78;
		p.ellipse(
			effect.centerX,
			effect.centerY,
			Math.max(10, radiusX * 2 * ringScale),
			Math.max(10, radiusY * 2 * ringScale)
		);
	}

	for (let spokeIndex = 0; spokeIndex < 20; spokeIndex += 1) {
		const angle = (spokeIndex / 20) * Math.PI * 2;
		const outerX = effect.centerX + Math.cos(angle) * radiusX;
		const outerY = effect.centerY + Math.sin(angle) * radiusY;
		const innerX = effect.centerX + Math.cos(angle) * radiusX * 0.14;
		const innerY = effect.centerY + Math.sin(angle) * radiusY * 0.14;
		p.line(outerX, outerY, innerX, innerY);
	}

	p.noStroke();
	p.fill(`${effect.color}${alphaHex}`);
	p.ellipse(effect.centerX, effect.centerY, radiusX * 2, radiusY * 2);
	p.fill('#050308cc');
	p.ellipse(effect.centerX, effect.centerY, radiusX * 1.05, radiusY * 1.05);
	p.fill(
		`${effect.color}${Math.round((1 - effect.age / effect.duration) * 210)
			.toString(16)
			.padStart(2, '0')}`
	);
	p.ellipse(effect.centerX, effect.centerY, radiusX * 0.22, radiusY * 0.22);
}

export function drawVoidRiftEffect(p: P5, effect: VoidRiftEffectProps) {
	p.push();
	p.translate(effect.centerX, effect.centerY);
	p.rotate(effect.angle);

	if (!effect.hasCollapsed) {
		const openProgress = Math.min(1, effect.age / Math.max(0.0001, effect.activeDuration * 0.24));
		const easedOpen = effect.easeInQuad(openProgress);
		const shimmer = Math.sin(effect.age * 16) * 2.6;
		const width = effect.halfWidth * 2 * (0.54 + easedOpen * 0.46);
		const height = effect.halfHeight * 2 * (0.62 + easedOpen * 0.38);
		const alphaHex = Math.round((1 - effect.age / effect.activeDuration) * 180)
			.toString(16)
			.padStart(2, '0');

		if (effect.glow) {
			p.noStroke();
			p.fill(`${effect.color}18`);
			p.ellipse(0, 0, width * 1.18, height * 1.28);
			p.fill(`${effect.color}2c`);
			p.ellipse(0, 0, width * 0.94, height * 1.04);
		}

		p.noFill();
		p.stroke(`${effect.color}${alphaHex}`);
		p.strokeWeight(2.4);
		p.ellipse(0, 0, width, height + shimmer * 0.45);
		p.stroke(
			`#f5f3ff${Math.round((1 - effect.age / effect.activeDuration) * 120)
				.toString(16)
				.padStart(2, '0')}`
		);
		p.strokeWeight(1.2);
		p.ellipse(0, 0, width * 0.72, Math.max(10, height * 0.42 + shimmer * 0.2));

		for (let slashIndex = 0; slashIndex < 6; slashIndex += 1) {
			const t = slashIndex / 5;
			const slashX = p.lerp(-effect.halfWidth * 0.62, effect.halfWidth * 0.62, t);
			const slashOffset = Math.sin(effect.age * 10 + slashIndex * 0.9) * effect.halfHeight * 0.22;
			p.stroke(
				`${effect.color}${Math.round(110 + t * 90)
					.toString(16)
					.padStart(2, '0')}`
			);
			p.strokeWeight(1.4);
			p.line(
				slashX - 4,
				-effect.halfHeight * 0.6 + slashOffset,
				slashX + 4,
				effect.halfHeight * 0.6 + slashOffset
			);
		}

		p.noStroke();
		p.fill('#050308ee');
		p.ellipse(0, 0, width * 0.7, Math.max(10, height * 0.28 + shimmer * 0.22));
		p.fill(`${effect.color}88`);
		p.ellipse(0, 0, width * 0.2, Math.max(5, height * 0.1));
		p.pop();
		return;
	}

	const collapseProgress = Math.min(
		1,
		effect.collapseAge / Math.max(0.0001, effect.collapseDuration)
	);
	const easedCollapse = effect.easeInQuad(collapseProgress);
	const pulseStrength = Math.min(1, effect.finalPulseDamage / 90);
	const pulseRadius = Math.max(
		16,
		effect.finalPulseRadius + (effect.pulseMaxRadius - effect.finalPulseRadius) * easedCollapse
	);
	const ringAlphaHex = Math.round((1 - collapseProgress) * (180 + pulseStrength * 40))
		.toString(16)
		.padStart(2, '0');

	p.rotate(-effect.angle);
	if (effect.glow) {
		p.noStroke();
		p.fill(
			`${effect.color}${Math.round((1 - collapseProgress) * 56)
				.toString(16)
				.padStart(2, '0')}`
		);
		p.circle(0, 0, pulseRadius * (1.4 + pulseStrength * 0.28));
	}

	p.noFill();
	p.stroke(`${effect.color}${ringAlphaHex}`);
	p.strokeWeight(2.8 - collapseProgress * 1.3);
	p.circle(0, 0, pulseRadius);
	p.stroke(
		`#f5f3ff${Math.round((1 - collapseProgress) * 190)
			.toString(16)
			.padStart(2, '0')}`
	);
	p.strokeWeight(1.6);
	p.circle(0, 0, Math.max(12, pulseRadius - effect.finalPulseRadius * 0.34));
	p.noStroke();
	p.fill(
		`${effect.color}${Math.round((1 - collapseProgress) * (110 + pulseStrength * 60))
			.toString(16)
			.padStart(2, '0')}`
	);
	p.circle(0, 0, Math.max(6, effect.finalPulseRadius * 0.18 * (1 - collapseProgress * 0.75)));
	p.pop();
}

export function drawPhaseshiftEffect(p: P5, effect: PhaseshiftEffectProps) {
	p.noStroke();
	p.fill(`${effect.color}22`);
	p.rect(
		effect.centerX - effect.zoneWidth * 0.5,
		effect.centerY - effect.halfHeight,
		effect.zoneWidth,
		effect.halfHeight * 2,
		8
	);

	p.stroke(effect.color);
	p.strokeWeight(4);
	p.line(
		effect.centerX,
		effect.centerY - effect.halfHeight,
		effect.centerX,
		effect.centerY + effect.halfHeight
	);
}

export function drawBurningGroundEffect(p: P5, effect: BurningGroundEffectProps) {
	const lifeRatio = 1 - effect.age / Math.max(0.0001, effect.duration);
	const emberRadius = effect.radius * (0.45 + lifeRatio * 0.08);
	const flicker = 0.92 + Math.sin(effect.age * 13) * 0.06;

	if (effect.glow) {
		p.noStroke();
		p.fill(`${effect.color}18`);
		p.circle(effect.centerX, effect.centerY, effect.radius * 2.8 * flicker);
		p.fill('#ff6a0030');
		p.circle(effect.centerX, effect.centerY, effect.radius * 2.35 * flicker);
	}

	p.noStroke();
	p.fill('#1c0906d0');
	p.circle(effect.centerX, effect.centerY, effect.radius * 2.08);
	p.fill('#5a180acc');
	p.circle(effect.centerX, effect.centerY, effect.radius * 1.92);

	for (let lobeIndex = 0; lobeIndex < 6; lobeIndex += 1) {
		const angle = (lobeIndex / 6) * p.TWO_PI + effect.age * (0.4 + lobeIndex * 0.08);
		const orbit = effect.radius * (0.14 + (lobeIndex % 3) * 0.08);
		const lobeX = effect.centerX + Math.cos(angle) * orbit;
		const lobeY = effect.centerY + Math.sin(angle) * orbit * 0.78;
		p.fill(lobeIndex % 2 === 0 ? '#ff5f1f66' : '#ff9d2f55');
		p.ellipse(lobeX, lobeY, effect.radius * 1.18, effect.radius * 0.9);
	}

	p.fill('#ff6a1fcc');
	p.circle(effect.centerX, effect.centerY, emberRadius * 2.02 * flicker);
	p.fill('#ffb347b8');
	p.circle(effect.centerX, effect.centerY, effect.radius * 0.92 * flicker);
	p.fill('#fff0a0aa');
	p.circle(effect.centerX, effect.centerY, effect.radius * 0.42 * flicker);

	for (let flameIndex = 0; flameIndex < 8; flameIndex += 1) {
		const angle = (flameIndex / 8) * p.TWO_PI + effect.age * (1.8 + flameIndex * 0.07);
		const orbit = effect.radius * (0.1 + (flameIndex % 4) * 0.1);
		const flameX = effect.centerX + Math.cos(angle) * orbit;
		const flameY = effect.centerY + Math.sin(angle) * orbit * 0.7;
		p.fill(flameIndex % 2 === 0 ? '#ffd166bb' : '#ff8c42aa');
		p.ellipse(
			flameX,
			flameY,
			Math.max(6, effect.impactSize * 0.5),
			Math.max(10, effect.impactSize * 0.95)
		);
	}

	for (let smokeIndex = 0; smokeIndex < 4; smokeIndex += 1) {
		const angle = (smokeIndex / 4) * p.TWO_PI + effect.age * (0.5 + smokeIndex * 0.04);
		const orbit = effect.radius * (0.42 + smokeIndex * 0.08);
		const smokeX = effect.centerX + Math.cos(angle) * orbit * 0.75;
		const smokeY = effect.centerY + Math.sin(angle) * orbit * 0.55;
		p.fill('#3d3d3d44');
		p.circle(smokeX, smokeY, Math.max(8, effect.impactSize * 0.58));
	}

	for (let emberIndex = 0; emberIndex < 7; emberIndex += 1) {
		const angle = (emberIndex / 7) * p.TWO_PI + effect.age * (1.6 + emberIndex * 0.12);
		const orbit = Math.max(effect.impactSize, effect.radius * (0.16 + emberIndex * 0.06));
		const emberX = effect.centerX + Math.cos(angle) * orbit * 0.55;
		const emberY = effect.centerY + Math.sin(angle) * orbit * 0.38;
		p.fill(emberIndex % 2 === 0 ? '#fff3b088' : '#ff7a2a88');
		p.circle(emberX, emberY, Math.max(3, effect.impactSize * 0.22));
	}
}

export function drawDelayedBombEffect(p: P5, effect: DelayedBombEffectProps) {
	if (!effect.hasDetonated) {
		const progress = Math.min(1, effect.age / Math.max(0.0001, effect.detonationDelay));
		const pulse = 1 + Math.sin(progress * Math.PI * 6) * 0.08;

		if (effect.glow) {
			p.noStroke();
			p.fill(`${effect.color}24`);
			p.circle(effect.centerX, effect.centerY, effect.radius * 1.9 * pulse);
		}

		p.noFill();
		p.stroke(`${effect.color}88`);
		p.strokeWeight(2);
		p.circle(effect.centerX, effect.centerY, effect.radius * 2);

		p.noStroke();
		p.fill('#111111ee');
		p.circle(effect.centerX, effect.centerY, effect.markerSize * 1.2);
		p.fill(effect.color);
		p.circle(effect.centerX, effect.centerY, effect.markerSize);
		p.fill('#fff3b0cc');
		p.circle(effect.centerX, effect.centerY - effect.markerSize * 0.12, effect.markerSize * 0.28);
		return;
	}

	const flashProgress = 1 - effect.explosionFlash / 0.22;
	const flashRadius = effect.radius * (0.6 + flashProgress * 0.95);

	p.noStroke();
	p.fill('#fff3b088');
	p.circle(effect.centerX, effect.centerY, flashRadius * 2.2);
	p.fill(`${effect.color}88`);
	p.circle(effect.centerX, effect.centerY, flashRadius * 1.75);
	p.fill('#ffffffaa');
	p.circle(effect.centerX, effect.centerY, flashRadius * 0.95);
}

export function drawPerimeterMineEffect(p: P5, effect: PerimeterMineEffectProps) {
	if (!effect.hasDetonated) {
		const pulse = 0.94 + Math.sin(effect.age * 5.5) * 0.05;
		const ringRadius = effect.blastRadius * (0.92 + pulse * 0.08);

		if (effect.glow) {
			p.noStroke();
			p.fill(`${effect.color}22`);
			p.circle(effect.centerX, effect.centerY, effect.blastRadius * 3.2 * pulse);
		}

		p.noFill();
		p.stroke(`${effect.color}66`);
		p.strokeWeight(1.8);
		p.circle(effect.centerX, effect.centerY, ringRadius * 2);

		p.push();
		p.translate(effect.centerX, effect.centerY);
		p.rotate(effect.age * 0.9);
		p.noStroke();
		p.fill('#0b1110f0');
		p.circle(0, 0, effect.markerSize * 1.55);
		p.fill(effect.color);
		for (let spikeIndex = 0; spikeIndex < 4; spikeIndex += 1) {
			p.push();
			p.rotate((spikeIndex / 4) * p.TWO_PI + Math.PI / 4);
			p.rectMode(p.CENTER);
			p.rect(0, 0, effect.markerSize * 0.9, effect.markerSize * 0.9, 2);
			p.pop();
		}
		p.fill('#dcfce7');
		p.circle(0, 0, effect.markerSize * 0.42);
		p.pop();

		p.noFill();
		p.stroke(`${effect.color}aa`);
		p.strokeWeight(1.2);
		p.circle(effect.centerX, effect.centerY, effect.triggerRadius * 2);
		return;
	}

	const flashProgress = 1 - effect.explosionFlash / 0.24;
	const flashRadius = effect.blastRadius * (0.55 + flashProgress * 0.9);

	p.noStroke();
	p.fill('#ecfccb99');
	p.circle(effect.centerX, effect.centerY, flashRadius * 2.4);
	p.fill(`${effect.color}aa`);
	p.circle(effect.centerX, effect.centerY, flashRadius * 1.85);
	p.fill('#ffffffbb');
	p.circle(effect.centerX, effect.centerY, flashRadius);
}

export function drawTurretMineEffect(p: P5, effect: TurretMineEffectProps) {
	const pulse = 0.96 + Math.sin(effect.age * 4.8) * 0.04;

	if (effect.glow) {
		p.noStroke();
		p.fill(`${effect.color}1f`);
		p.circle(effect.centerX, effect.centerY, effect.markerSize * 4.2 * pulse);
	}

	p.push();
	p.translate(effect.centerX, effect.centerY);
	p.rotate(effect.barrelAngle);
	p.rectMode(p.CENTER);
	p.noStroke();
	p.fill('#171717ee');
	p.circle(0, 0, effect.markerSize * 1.8);
	p.fill(effect.color);
	p.circle(0, 0, effect.markerSize * 1.18);
	p.fill('#fff3b0cc');
	p.circle(0, -effect.markerSize * 0.1, effect.markerSize * 0.34);
	p.fill('#d4d4d8dd');
	p.rect(
		effect.markerSize * 0.42,
		-effect.markerSize * 0.08,
		effect.markerSize * 1.15,
		effect.markerSize * 0.3,
		2
	);
	p.fill('#0f172acc');
	p.rect(
		-effect.markerSize * 0.1,
		effect.markerSize * 0.85,
		effect.markerSize * 0.34,
		effect.markerSize * 0.74,
		2
	);
	p.pop();

	if (effect.fireFlash > 0) {
		const flashRadius = effect.markerSize * (0.65 + effect.fireFlash * 1.4);
		const flashX = effect.centerX + Math.cos(effect.barrelAngle) * effect.markerSize * 0.95;
		const flashY = effect.centerY + Math.sin(effect.barrelAngle) * effect.markerSize * 0.95;
		p.noStroke();
		p.fill('#fff7edaa');
		p.circle(flashX, flashY, flashRadius * 1.8);
		p.fill(`${effect.color}bb`);
		p.circle(flashX, flashY, flashRadius);
	}
}

export function drawSupportPylonEffect(p: P5, effect: SupportPylonEffectProps) {
	const lifeRatio = 1 - effect.age / Math.max(0.0001, effect.duration);
	const pulse = 0.94 + Math.sin(effect.age * 4.4) * 0.05;
	const glowScale = 1 + (1 - lifeRatio) * 0.08;

	if (effect.glow) {
		p.noStroke();
		p.fill(`${effect.color}16`);
		p.circle(effect.centerX, effect.centerY, effect.radius * 3.1 * pulse * glowScale);
	}

	p.noFill();
	p.stroke(`${effect.color}66`);
	p.strokeWeight(2);
	p.circle(effect.centerX, effect.centerY, effect.radius * 2);

	if (effect.variant === 'cold-lattice') {
		p.stroke(`${effect.color}88`);
		p.strokeWeight(1.1);
		for (let lineIndex = -2; lineIndex <= 2; lineIndex += 1) {
			const offset = (effect.radius / 2.5) * lineIndex;
			p.line(
				effect.centerX - effect.radius,
				effect.centerY + offset,
				effect.centerX + effect.radius,
				effect.centerY + offset
			);
			p.line(
				effect.centerX + offset,
				effect.centerY - effect.radius,
				effect.centerX + offset,
				effect.centerY + effect.radius
			);
		}
	} else if (effect.variant === 'mark-beacon') {
		p.stroke(`${effect.color}aa`);
		p.strokeWeight(1.4);
		for (let spokeIndex = 0; spokeIndex < 6; spokeIndex += 1) {
			const angle = (spokeIndex / 6) * p.TWO_PI + effect.age * 0.4;
			const innerRadius = effect.markerSize * 0.9;
			p.line(
				effect.centerX + Math.cos(angle) * innerRadius,
				effect.centerY + Math.sin(angle) * innerRadius,
				effect.centerX + Math.cos(angle) * effect.radius,
				effect.centerY + Math.sin(angle) * effect.radius
			);
		}
	} else if (effect.variant === 'mine-calibrator') {
		p.push();
		p.translate(effect.centerX, effect.centerY);
		p.rotate(effect.age * 0.55 + Math.PI / 4);
		p.noFill();
		p.stroke(`${effect.color}aa`);
		p.strokeWeight(1.6);
		p.square(0, 0, effect.radius * 1.1);
		p.pop();
	} else {
		p.stroke(`${effect.color}88`);
		p.strokeWeight(1.4);
		for (let arcIndex = 0; arcIndex < 3; arcIndex += 1) {
			const arcRadius = effect.radius * (0.45 + arcIndex * 0.22);
			p.arc(
				effect.centerX,
				effect.centerY,
				arcRadius * 2,
				arcRadius * 2,
				effect.age * 0.9 + arcIndex,
				effect.age * 0.9 + arcIndex + Math.PI * 0.9
			);
		}
	}

	p.push();
	p.translate(effect.centerX, effect.centerY);
	p.rotate(effect.age * 0.8 + Math.PI / 4);
	p.noStroke();
	p.fill('#0b0f14ee');
	p.square(0, 0, effect.markerSize * 1.7, 3);
	p.fill(effect.color);
	p.square(0, 0, effect.markerSize, 3);
	p.fill('#f8fafccc');
	p.circle(0, 0, effect.markerSize * 0.34);
	p.pop();
}

export function drawLaserSweepEffect(p: P5, effect: LaserSweepEffectProps) {
	const beamX = effect.arenaCenterX + Math.cos(effect.angle) * effect.beamLength;
	const beamY = effect.arenaCenterY + Math.sin(effect.angle) * effect.beamLength;

	if (effect.glow) {
		p.stroke(`${effect.color}44`);
		p.strokeWeight(effect.beamWidth * 1.85);
		p.line(effect.arenaCenterX, effect.arenaCenterY, beamX, beamY);
	}

	p.stroke(effect.color);
	p.strokeWeight(effect.beamWidth);
	p.line(effect.arenaCenterX, effect.arenaCenterY, beamX, beamY);

	p.fill(effect.color);
	p.noStroke();
	p.circle(beamX, beamY, effect.beamWidth * 0.9);
}

export function drawSniperLockEffect(p: P5, effect: SniperLockEffectProps) {
	const progress = Math.min(1, effect.age / effect.chargeDuration);
	const pulseWidth = effect.lineWidth + Math.sin(progress * Math.PI * 6) * 0.35;

	if (effect.glow) {
		p.stroke(`${effect.color}33`);
		p.strokeWeight(effect.lineWidth * 4);
		p.line(effect.arenaCenterX, effect.arenaCenterY, effect.targetX, effect.targetY);
	}

	p.stroke(effect.color);
	p.strokeWeight(Math.max(1.2, pulseWidth));
	p.line(effect.arenaCenterX, effect.arenaCenterY, effect.targetX, effect.targetY);

	p.noFill();
	p.stroke(`${effect.color}cc`);
	p.strokeWeight(1.4);
	p.circle(effect.targetX, effect.targetY, 10 + progress * 8);
	p.circle(effect.targetX, effect.targetY, 18 + Math.sin(progress * Math.PI * 4) * 3);
}

export function drawJudgmentRuneSunEffect(p: P5, effect: JudgmentRuneSunEffectProps) {
	const life = Math.max(0, 1 - effect.age / Math.max(0.0001, effect.duration));
	const pulse = 0.92 + Math.sin(effect.age * 10) * 0.08;
	const sunX = effect.centerX + Math.cos(effect.orbitAngle) * effect.orbitRadius;
	const sunY = effect.centerY + Math.sin(effect.orbitAngle) * effect.orbitRadius;
	const auraRadius = effect.damageRadius * (0.96 + Math.sin(effect.age * 6) * 0.04);

	p.noFill();
	p.stroke(`rgba(255, 220, 128, ${0.16 + life * 0.18})`);
	p.strokeWeight(1.4);
	p.circle(effect.centerX, effect.centerY, effect.orbitRadius * 2);

	if (effect.glow) {
		const ctx = p.drawingContext as CanvasRenderingContext2D;
		const gradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, auraRadius * 1.7);
		gradient.addColorStop(0, `rgba(255, 249, 220, ${0.34 + life * 0.16})`);
		gradient.addColorStop(0.16, `rgba(255, 232, 163, ${0.28 + life * 0.12})`);
		gradient.addColorStop(0.42, `rgba(255, 214, 102, ${0.16 + life * 0.12})`);
		gradient.addColorStop(0.72, `rgba(245, 158, 11, ${0.06 + life * 0.06})`);
		gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
		ctx.save();
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(sunX, sunY, auraRadius * 1.7, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	p.noFill();
	p.stroke(`rgba(255, 240, 196, ${0.18 + life * 0.12})`);
	p.strokeWeight(1.1);
	p.circle(sunX, sunY, auraRadius * 2);
	p.stroke(`rgba(255, 223, 143, ${0.08 + life * 0.08})`);
	p.strokeWeight(0.8);
	p.circle(sunX, sunY, auraRadius * 2.7);
	p.stroke(`rgba(255, 236, 184, ${0.05 + life * 0.05})`);
	p.strokeWeight(0.6);
	p.circle(sunX, sunY, auraRadius * 3.15);

	p.noStroke();
	p.fill(`rgba(255, 248, 224, ${0.85})`);
	p.circle(sunX, sunY, effect.sunRadius * 1.25 * pulse);
	p.fill(`rgba(251, 191, 36, ${0.88})`);
	p.circle(sunX, sunY, effect.sunRadius * pulse);
	p.fill(`rgba(245, 158, 11, ${0.92})`);
	p.circle(sunX, sunY, effect.sunRadius * 0.58 * pulse);
}

export function drawSniperChainBurstEffect(p: P5, effect: SniperChainBurstEffectProps) {
	const fade = 1 - effect.age / Math.max(0.0001, effect.duration);
	const alpha = Math.round(255 * fade)
		.toString(16)
		.padStart(2, '0');
	const glowAlpha = Math.round(110 * fade)
		.toString(16)
		.padStart(2, '0');

	for (const segment of effect.segments) {
		if (effect.glow) {
			p.stroke(`${effect.color}${glowAlpha}`);
			p.strokeWeight(effect.lineWidth * 3.4);
			p.line(segment.from.x, segment.from.y, segment.to.x, segment.to.y);
		}

		p.stroke(`${effect.color}${alpha}`);
		p.strokeWeight(Math.max(1.5, effect.lineWidth * 1.35));
		p.line(segment.from.x, segment.from.y, segment.to.x, segment.to.y);

		p.noStroke();
		p.fill(`#fff1bf${alpha}`);
		p.circle(segment.to.x, segment.to.y, 6 + fade * 6);
	}
}

export function drawNeedleBurstEffect(p: P5, effect: NeedleBurstEffectProps) {
	const progress = Math.min(1, effect.age / effect.duration);
	const reachFactor = Math.sin(progress * Math.PI);
	const dx = effect.targetX - effect.arenaCenterX;
	const dy = effect.targetY - effect.arenaCenterY;
	const distance = Math.hypot(dx, dy) || 1;
	const clampedReach = Math.min(distance, effect.maxReach) * reachFactor;
	const directionX = dx / distance;
	const directionY = dy / distance;
	const tipX = effect.arenaCenterX + directionX * clampedReach;
	const tipY = effect.arenaCenterY + directionY * clampedReach;

	if (effect.glow) {
		p.stroke(`${effect.color}44`);
		p.strokeWeight(effect.lineWidth * 2.8);
		p.line(effect.arenaCenterX, effect.arenaCenterY, tipX, tipY);
	}

	p.stroke(effect.color);
	p.strokeWeight(effect.lineWidth);
	p.line(effect.arenaCenterX, effect.arenaCenterY, tipX, tipY);

	p.push();
	p.translate(tipX, tipY);
	p.rotate(Math.atan2(directionY, directionX));
	p.noStroke();
	p.fill(effect.color);
	p.triangle(0, 0, -8, 2.4, -8, -2.4);
	p.pop();
}

export function drawExecutionLatticeStrikeEffect(p: P5, effect: ExecutionLatticeStrikeEffectProps) {
	const progress = Math.min(1, Math.max(0, (effect.age - effect.startDelay) / effect.dropDuration));
	const currentY = effect.startY + (effect.targetY - effect.startY) * progress;
	const size = effect.markerSize;

	if (effect.glow) {
		p.noStroke();
		p.fill(`${effect.color}33`);
		p.circle(effect.targetX, currentY, size * 3.2);
	}

	p.push();
	p.translate(effect.targetX, currentY);
	p.noStroke();
	p.fill(effect.color);
	p.triangle(0, size, -size * 0.72, -size * 0.64, size * 0.72, -size * 0.64);
	p.pop();

	if (progress >= 1) {
		p.noFill();
		p.stroke(`${effect.color}aa`);
		p.strokeWeight(2);
		p.circle(effect.targetX, effect.targetY, size * 2.2);
	}
}

export function drawForkLightningEffect(p: P5, effect: ForkLightningEffectProps) {
	for (const segment of effect.segments) {
		const progress = effect.easeInQuad((effect.age - segment.startDelay) / effect.duration);

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

		if (effect.glow) {
			p.stroke(`${effect.color}33`);
			p.strokeWeight(effect.branchWidth * 2.2);
			for (let pointIndex = 1; pointIndex < visiblePoints.length; pointIndex += 1) {
				const previous = visiblePoints[pointIndex - 1];
				const current = visiblePoints[pointIndex];
				p.line(previous.x, previous.y, current.x, current.y);
			}
		}

		p.stroke(effect.color);
		p.strokeWeight(effect.branchWidth);
		for (let pointIndex = 1; pointIndex < visiblePoints.length; pointIndex += 1) {
			const previous = visiblePoints[pointIndex - 1];
			const current = visiblePoints[pointIndex];
			p.line(previous.x, previous.y, current.x, current.y);
		}
	}
}

export function drawLaserRodNetworkEffect(p: P5, effect: LaserRodNetworkEffectProps) {
	const lifeRatio = 1 - effect.age / Math.max(0.0001, effect.duration);
	const pulse = 0.96 + Math.sin(effect.age * 5.8) * 0.04;
	const rodThickness = Math.max(3, effect.lineWidth * 0.18);
	const rodHeight = Math.max(10, Math.min(18, effect.rodLength * 0.45));
	const connectorWidth = Math.max(1.5, Math.min(3, effect.lineWidth * 0.16));

	for (const link of effect.links) {
		p.stroke(
			`${effect.color}${Math.round(150 + lifeRatio * 80)
				.toString(16)
				.padStart(2, '0')}`
		);
		p.strokeWeight(connectorWidth * pulse);
		p.line(effect.centerX, effect.centerY, link.x, link.y);
	}

	p.push();
	p.translate(effect.centerX, effect.centerY);
	p.noStroke();
	p.fill(`${effect.color}cc`);
	p.rectMode(p.CENTER);
	p.rect(0, 0, rodThickness, rodHeight, rodThickness * 0.35);

	if (effect.variant === 'coldwire-rods') {
		p.fill('#e0f2feaa');
		p.rect(0, 0, Math.max(1.5, rodThickness * 0.45), rodHeight * 0.72, rodThickness * 0.18);
	} else if (effect.variant === 'sunder-rods') {
		p.stroke('#fff7edaa');
		p.strokeWeight(1.2);
		p.line(-rodThickness, -rodHeight * 0.2, rodThickness, rodHeight * 0.2);
		p.line(-rodThickness, rodHeight * 0.2, rodThickness, -rodHeight * 0.2);
	} else {
		p.fill('#fff7edaa');
		p.circle(0, 0, rodThickness * 0.7);
	}

	p.pop();
}

export function drawIceSpikeEffect(p: P5, effect: IceSpikeEffectProps) {
	const progress = Math.max(0, (effect.age - effect.startDelay) / effect.fallDuration);
	const currentY = effect.startY + (effect.endY - effect.startY) * progress;
	const currentX =
		effect.targetX +
		Math.sin(effect.driftPhase + effect.age * effect.driftSpeed) * effect.driftAmplitude;
	const fadeOut =
		currentY >= effect.targetY ? Math.max(0, 1 - (currentY - effect.targetY) / 120) : 1;
	const alphaHex = Math.round(255 * fadeOut)
		.toString(16)
		.padStart(2, '0');

	if (effect.glow) {
		p.noStroke();
		p.fill(
			`${effect.color}${Math.round(132 * fadeOut)
				.toString(16)
				.padStart(2, '0')}`
		);
		p.circle(currentX, currentY, effect.size * 3.8);
	}

	p.push();
	p.translate(currentX, currentY);
	p.rotate(effect.driftPhase + effect.age * 1.8);
	p.stroke(`${effect.color}${alphaHex}`);
	p.strokeWeight(1.8);
	const half = effect.size * 0.5;
	p.line(-half * 0.82, 0, half * 0.82, 0);
	p.line(0, -half * 0.82, 0, half * 0.82);
	p.line(-half * 0.58, -half * 0.58, half * 0.58, half * 0.58);
	p.line(-half * 0.58, half * 0.58, half * 0.58, -half * 0.58);
	p.noStroke();
	p.fill(
		`${effect.color}${Math.round(255 * fadeOut)
			.toString(16)
			.padStart(2, '0')}`
	);
	p.circle(0, 0, effect.size * 1.1);
	p.pop();
}

export function drawBlizzardStormEffect(p: P5, effect: BlizzardStormEffectProps) {
	const progress = Math.min(1, effect.age / Math.max(0.0001, effect.duration));
	const alphaHex = Math.round((1 - progress) * 110)
		.toString(16)
		.padStart(2, '0');
	const sweepY = p.lerp(-40, effect.canvasHeight + 40, progress);

	if (effect.glow) {
		p.noStroke();
		p.fill(`${effect.color}14`);
		p.rect(0, 0, effect.canvasWidth, effect.canvasHeight);
	}

	p.stroke(`${effect.color}${alphaHex}`);
	p.strokeWeight(2);
	for (let stripeIndex = 0; stripeIndex < 10; stripeIndex += 1) {
		const stripeX =
			(stripeIndex / 10) * effect.canvasWidth + Math.sin(effect.age * 4 + stripeIndex) * 16;
		p.line(stripeX, sweepY - 120, stripeX - 24, sweepY + 24);
	}

	p.noFill();
	p.stroke(`#dff6ff${alphaHex}`);
	p.strokeWeight(1.5);
	p.rect(10, 10, effect.canvasWidth - 20, effect.canvasHeight - 20, 18);
}

export function drawVoidTendrilEffect(p: P5, effect: VoidTendrilEffectProps) {
	const normalizedAge = Math.max(0, Math.min(1, effect.age / effect.duration));
	const progress = effect.easeInQuad(normalizedAge);
	const reachX = effect.arenaCenterX + (effect.targetX - effect.arenaCenterX) * progress;
	const reachY = effect.arenaCenterY + (effect.targetY - effect.arenaCenterY) * progress;
	const angle = Math.atan2(reachY - effect.arenaCenterY, reachX - effect.arenaCenterX);
	const distance = Math.hypot(reachX - effect.arenaCenterX, reachY - effect.arenaCenterY) || 1;
	const directionX = (reachX - effect.arenaCenterX) / distance;
	const directionY = (reachY - effect.arenaCenterY) / distance;
	const perpendicularX = -directionY;
	const perpendicularY = directionX;
	const snakeSegments = Math.max(4, Math.ceil(distance / 22));
	const snakeAmplitude = Math.min(12, 2 + distance * 0.045);
	const snakePoints = Array.from({ length: snakeSegments + 1 }, (_, index) => {
		const t = index / snakeSegments;
		const baseFadeIn = Math.min(1, t * 2.4);
		const tipFadeOut = 1 - t * 0.2;
		const wave =
			Math.sin(t * Math.PI * 2.5 + effect.age * 12) * snakeAmplitude * baseFadeIn * tipFadeOut;
		return {
			x: effect.arenaCenterX + directionX * distance * t + perpendicularX * wave,
			y: effect.arenaCenterY + directionY * distance * t + perpendicularY * wave
		};
	});
	const clawLength = 15;
	const clawSpread = 0.62;
	const baseOffset = 6;
	const clawPitch = Math.sin(normalizedAge * Math.PI * 1.3) * 0.22;
	const clawBaseX = reachX - Math.cos(angle) * baseOffset;
	const clawBaseY = reachY - Math.sin(angle) * baseOffset;

	if (effect.glow) {
		p.stroke(`${effect.color}33`);
		p.strokeWeight(8);
		for (let pointIndex = 1; pointIndex < snakePoints.length; pointIndex += 1) {
			const previous = snakePoints[pointIndex - 1];
			const current = snakePoints[pointIndex];
			p.line(previous.x, previous.y, current.x, current.y);
		}
	}

	p.stroke(effect.color);
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

export function drawNaturesWrathEffect(p: P5, effect: NaturesWrathEffectProps) {
	drawVoidTendrilEffect(p, {
		kind: 'void-tendril',
		arenaCenterX: effect.arenaCenterX,
		arenaCenterY: effect.arenaCenterY,
		targetX: effect.targetX,
		targetY: effect.targetY,
		age: effect.age,
		duration: Math.max(0.001, effect.duration),
		color: effect.color,
		glow: effect.glow,
		easeInQuad: effect.easeInQuad
	});

	const pulsePhase =
		effect.pulseInterval > 0 ? (effect.age % effect.pulseInterval) / effect.pulseInterval : 0;
	const pulseRadius = p.lerp(24, Math.min(p.width, p.height) * 0.42, pulsePhase);
	const alphaHex = Math.round((1 - pulsePhase) * 130)
		.toString(16)
		.padStart(2, '0');

	p.noFill();
	p.stroke(`${effect.color}${alphaHex}`);
	p.strokeWeight(2.2 - pulsePhase * 1.2);
	p.circle(effect.arenaCenterX, effect.arenaCenterY, pulseRadius * 2);

	if (effect.glow) {
		p.noStroke();
		p.fill(
			`${effect.color}${Math.round((1 - pulsePhase) * 38)
				.toString(16)
				.padStart(2, '0')}`
		);
		p.circle(effect.arenaCenterX, effect.arenaCenterY, pulseRadius * 1.15);
	}
}
