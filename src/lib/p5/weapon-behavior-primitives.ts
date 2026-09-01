import type { WeaponAttackBehavior } from '$lib/data/types';
import type {
	WeaponActivationContext,
	WeaponActivationResult,
	WeaponActivator,
	WeaponBehaviorState,
	WeaponTargetState
} from '$lib/p5/weapon-behavior-types';

type WeaponAttackSpecialType = NonNullable<WeaponAttackBehavior['special']>['type'];

function noPendingMultiplier(): WeaponActivationResult {
	return {
		pendingNextWeaponDamageMultiplier: null,
		didActivate: true,
		nextCyclesUntilTrigger: null
	};
}

export const activateNoopSpecial: WeaponActivator = () => noPendingMultiplier();

export const activateAscendanceRune: WeaponActivator = (weapon, _target, context) => {
	return context.spawnAscendanceRune(weapon.definition, weapon.instanceId);
};

export const activateJudgmentRune: WeaponActivator = (weapon, target, context) => {
	return context.spawnJudgmentRune(weapon.definition, weapon.instanceId, target);
};

export function createUntargetedSpecialActivator(
	spawnKey:
		| 'spawnRuneReiterator'
		| 'spawnForceField'
		| 'spawnKillSwitchPulse'
		| 'spawnVulnerablePulse'
		| 'spawnLaserSweep'
		| 'spawnNeedleFan'
		| 'spawnSniperLock'
		| 'spawnExecutionLattice'
		| 'spawnForkLightning'
		| 'spawnPhaseshift'
		| 'spawnIceShower'
): WeaponActivator {
	return (weapon, _target, context) => {
		context[spawnKey](weapon.definition, weapon.instanceId);
		return noPendingMultiplier();
	};
}

export function createTargetedSpecialActivator(
	spawnKey:
		| 'spawnNaturesWrath'
		| 'spawnBindingRune'
		| 'spawnSunbrandRune'
		| 'spawnSlowingRune'
		| 'spawnHealingRune'
		| 'spawnSunRune'
		| 'spawnLaserRod'
		| 'spawnPerimeterMine'
		| 'spawnTurretMine'
		| 'spawnSupportPylon'
		| 'spawnStasisField'
		| 'spawnPrismPrison'
		| 'spawnVoidTunnel'
		| 'spawnVoidTendrils'
		| 'spawnVoidRift'
		| 'spawnBurningGroundProjectile'
		| 'spawnDelayedBomb'
		| 'spawnFlamethrowerCone'
): WeaponActivator {
	return (weapon, target, context) => {
		context[spawnKey](weapon.definition, weapon.instanceId, target);
		return noPendingMultiplier();
	};
}

export const activateTargetPainter: WeaponActivator = (weapon, target, context) => {
	const painterTarget = context.ensureMarkedEnemy() ?? target;
	context.assignMarkedEnemy(painterTarget);
	context.fireProjectile(painterTarget, weapon.definition, weapon.instanceId);
	return noPendingMultiplier();
};

export const activateClosestEnemyVolley: WeaponActivator = (weapon, _target, context) => {
	const targets = context.getClosestEnemies(Math.max(1, weapon.definition.attack.projectileCount));

	for (const splitTarget of targets) {
		context.fireProjectile(splitTarget, weapon.definition, weapon.instanceId);
	}

	return noPendingMultiplier();
};

export const activateLineBurst: WeaponActivator = (weapon, target, context) => {
	context.fireLineBurst(target, weapon.definition, weapon.instanceId);
	return noPendingMultiplier();
};

export const activatePulseArrayBurst: WeaponActivator = (weapon, target, context) => {
	context.firePulseArrayBurst(target, weapon.definition, weapon.instanceId);
	return noPendingMultiplier();
};

export const activateProjectilePattern: WeaponActivator = (weapon, target, context) => {
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

	const special = weapon.definition.attack.special;

	return {
		pendingNextWeaponDamageMultiplier:
			special?.type === 'next-weapon-boost' ? special.damageMultiplier : null
	};
};

export const specialTypeActivators: Partial<Record<WeaponAttackSpecialType, WeaponActivator>> = {
	'judgment-rune': activateJudgmentRune,
	'ascendance-rune': activateAscendanceRune,
	'rune-reiterator': createUntargetedSpecialActivator('spawnRuneReiterator'),
	'binding-rune': createTargetedSpecialActivator('spawnBindingRune'),
	'sunbrand-rune': createTargetedSpecialActivator('spawnSunbrandRune'),
	'idol-of-echoes': activateNoopSpecial,
	'slowing-rune': createTargetedSpecialActivator('spawnSlowingRune'),
	'healing-rune': createTargetedSpecialActivator('spawnHealingRune'),
	'sun-rune': createTargetedSpecialActivator('spawnSunRune'),
	'natures-wrath': createTargetedSpecialActivator('spawnNaturesWrath'),
	'force-field': createUntargetedSpecialActivator('spawnForceField'),
	'kill-switch': createUntargetedSpecialActivator('spawnKillSwitchPulse'),
	'vulnerable-pulse': createUntargetedSpecialActivator('spawnVulnerablePulse'),
	'laser-sweep': createUntargetedSpecialActivator('spawnLaserSweep'),
	'pea-ascender': activateNoopSpecial,
	'knife-sheath': activateNoopSpecial,
	'laser-rod-network': createTargetedSpecialActivator('spawnLaserRod'),
	'perimeter-mine': createTargetedSpecialActivator('spawnPerimeterMine'),
	'turret-mine': createTargetedSpecialActivator('spawnTurretMine'),
	'support-pylon': createTargetedSpecialActivator('spawnSupportPylon'),
	'needle-fan': createUntargetedSpecialActivator('spawnNeedleFan'),
	'target-painter': activateTargetPainter,
	'sniper-line': createUntargetedSpecialActivator('spawnSniperLock'),
	'execution-lattice': createUntargetedSpecialActivator('spawnExecutionLattice'),
	'fork-lightning': createUntargetedSpecialActivator('spawnForkLightning'),
	'stasis-field': createTargetedSpecialActivator('spawnStasisField'),
	'prism-prison': createTargetedSpecialActivator('spawnPrismPrison'),
	'void-tunnel': createTargetedSpecialActivator('spawnVoidTunnel'),
	phaseshift: createUntargetedSpecialActivator('spawnPhaseshift'),
	'burning-ground': createTargetedSpecialActivator('spawnBurningGroundProjectile'),
	'delayed-bomb': createTargetedSpecialActivator('spawnDelayedBomb'),
	'flamethrower-cone': createTargetedSpecialActivator('spawnFlamethrowerCone'),
	'ice-shower': createUntargetedSpecialActivator('spawnIceShower'),
	'void-tendrils': createTargetedSpecialActivator('spawnVoidTendrils'),
	'void-rift': createTargetedSpecialActivator('spawnVoidRift')
};

export const weaponIdActivators: Record<string, WeaponActivator> = {
	splitter: activateClosestEnemyVolley,
	'the-knife': activateClosestEnemyVolley,
	blaster: activateLineBurst,
	'pulse-array': activatePulseArrayBurst
};
