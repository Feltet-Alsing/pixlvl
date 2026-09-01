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
	spawnJudgmentRune: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => WeaponActivationResult;
	spawnAscendanceRune: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string
	) => WeaponActivationResult;
	spawnRuneReiterator: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnBindingRune: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnSunbrandRune: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnSlowingRune: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnHealingRune: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnSunRune: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnNaturesWrath: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => WeaponActivationResult;
	spawnForceField: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnKillSwitchPulse: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnVulnerablePulse: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnLaserSweep: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnLaserRod: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnPerimeterMine: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnTurretMine: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnSupportPylon: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnNeedleFan: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	ensureMarkedEnemy: () => WeaponTargetState | null;
	assignMarkedEnemy: (target: WeaponTargetState) => void;
	fireProjectile: (
		target: WeaponTargetState,
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		angleOffsetRadians?: number
	) => void;
	spawnSniperLock: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnExecutionLattice: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnForkLightning: (weapon: WeaponDefinition, sourceWeaponInstanceId: string) => void;
	spawnStasisField: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnPrismPrison: (
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
	spawnVoidTendrils: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
	spawnVoidRift: (
		weapon: WeaponDefinition,
		sourceWeaponInstanceId: string,
		target: WeaponTargetState
	) => void;
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
	didActivate?: boolean;
	nextCyclesUntilTrigger?: number | null;
}

export type WeaponActivator = (
	weapon: WeaponBehaviorState,
	target: WeaponTargetState,
	context: WeaponActivationContext
) => WeaponActivationResult;
