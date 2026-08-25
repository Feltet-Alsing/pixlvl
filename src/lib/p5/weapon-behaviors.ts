import type { WeaponDefinition } from '$lib/data/types';

export interface WeaponBehaviorState {
	instanceId: string;
	definition: WeaponDefinition;
	cycleInterval: number;
	cyclesUntilTrigger: number;
}

export interface WeaponTargetState {
	x: number;
	y: number;
}

export interface WeaponActivationContext {
	spawnForceField: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnKillSwitchPulse: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnVulnerablePulse: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnLaserSweep: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnNeedleFan: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	ensureMarkedEnemy: () => WeaponTargetState | null;
	assignMarkedEnemy: (target: WeaponTargetState) => void;
	fireProjectile: (
		target: WeaponTargetState,
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		angleOffsetRadians?: number
	) => void;
	spawnFanKnifeBurst: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnSniperLock: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnExecutionLattice: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnForkLightning: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnStasisField: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnVoidTunnel: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnPhaseshift: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnBurningGroundProjectile: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnDelayedBomb: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnFlamethrowerCone: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnIceShower: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnVoidTendrils: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	getClosestEnemies: (count: number) => WeaponTargetState[];
	fireLineBurst: (
		target: WeaponTargetState,
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string
	) => void;
	firePulseArrayBurst: (
		target: WeaponTargetState,
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string
	) => void;
}

export interface WeaponActivationResult {
	pendingNextWeaponDamageMultiplier: number | null;
}

export function activateWeaponBehavior(
	weapon: WeaponBehaviorState,
	target: WeaponTargetState,
	context: WeaponActivationContext
): WeaponActivationResult {
	const special = weapon.definition.attack.special;

	if (special?.type === 'force-field') {
		context.spawnForceField(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'kill-switch') {
		context.spawnKillSwitchPulse(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'vulnerable-pulse') {
		context.spawnVulnerablePulse(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'laser-sweep') {
		context.spawnLaserSweep(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'needle-fan') {
		context.spawnNeedleFan(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'target-painter') {
		const painterTarget = context.ensureMarkedEnemy() ?? target;
		context.assignMarkedEnemy(painterTarget);
		context.fireProjectile(painterTarget, weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'fan-knives') {
		context.spawnFanKnifeBurst(weapon.definition, weapon.instanceId, target);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'sniper-line') {
		context.spawnSniperLock(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'execution-lattice') {
		context.spawnExecutionLattice(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'fork-lightning') {
		context.spawnForkLightning(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'stasis-field') {
		context.spawnStasisField(weapon.definition, weapon.instanceId, target);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'void-tunnel') {
		context.spawnVoidTunnel(weapon.definition, weapon.instanceId, target);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'phaseshift') {
		context.spawnPhaseshift(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'burning-ground') {
		context.spawnBurningGroundProjectile(weapon.definition, weapon.instanceId, target);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'delayed-bomb') {
		context.spawnDelayedBomb(weapon.definition, weapon.instanceId, target);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'flamethrower-cone') {
		context.spawnFlamethrowerCone(weapon.definition, weapon.instanceId, target);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'ice-shower') {
		context.spawnIceShower(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (special?.type === 'void-tendrils') {
		context.spawnVoidTendrils(weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (weapon.definition.id === 'splitter' || weapon.definition.id === 'the-knife') {
		const targets = context.getClosestEnemies(
			Math.max(1, weapon.definition.attack.projectileCount)
		);

		for (const splitTarget of targets) {
			context.fireProjectile(splitTarget, weapon.definition, weapon.instanceId);
		}

		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (weapon.definition.id === 'blaster') {
		context.fireLineBurst(target, weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	if (weapon.definition.id === 'pulse-array') {
		context.firePulseArrayBurst(target, weapon.definition, weapon.instanceId);
		return { pendingNextWeaponDamageMultiplier: null };
	}

	const { projectileCount, spreadDegrees } = weapon.definition.attack;

	if (projectileCount <= 1) {
		context.fireProjectile(target, weapon.definition, weapon.instanceId);
	} else {
		const totalSpreadRadians = ((spreadDegrees ?? 0) * Math.PI) / 180;
		const startOffset = -totalSpreadRadians / 2;
		const step = projectileCount > 1 ? totalSpreadRadians / (projectileCount - 1) : 0;

		for (let index = 0; index < projectileCount; index += 1) {
			context.fireProjectile(
				target,
				weapon.definition,
				weapon.instanceId,
				startOffset + step * index
			);
		}
	}

	return {
		pendingNextWeaponDamageMultiplier:
			special?.type === 'next-weapon-boost' ? special.damageMultiplier : null
	};
}
