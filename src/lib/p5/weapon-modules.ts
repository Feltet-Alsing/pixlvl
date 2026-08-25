import type P5 from 'p5';

import { activateWeaponBehavior } from '$lib/p5/weapon-behaviors';
import {
	drawBlizzardStormEffect,
	drawBurningGroundEffect,
	drawDelayedBombEffect,
	drawDeadeyeSniperComponent,
	drawDefaultWeaponComponent,
	drawExecutionLatticeStrikeEffect,
	drawForceFieldEffect,
	drawForkLightningEffect,
	drawIceSpikeEffect,
	drawKillSwitchPulseEffect,
	drawLaserSweepEffect,
	drawNapalmGrenadeComponent,
	drawNeedleBurstEffect,
	drawPhaseshiftEffect,
	drawSniperChainBurstEffect,
	drawSniperLockEffect,
	drawStasisFieldEffect,
	drawVoidTunnelEffect,
	drawVoidTendrilEffect,
	drawVulnerablePulseEffect,
	type WeaponArenaEffectProps,
	type WeaponVariantComponentProps
} from '$lib/p5/weapon-component';
import type {
	WeaponActivationContext,
	WeaponActivationResult,
	WeaponBehaviorState,
	WeaponTargetState
} from '$lib/p5/weapon-behaviors';

export interface WeaponModule {
	activate: (
		weapon: WeaponBehaviorState,
		target: WeaponTargetState,
		context: WeaponActivationContext
	) => WeaponActivationResult;
	renderProjectile: (p: P5, props: WeaponVariantComponentProps) => void;
	renderArenaEffect: (p: P5, effect: WeaponArenaEffectProps) => boolean;
}

const defaultWeaponModule: WeaponModule = {
	activate: activateWeaponBehavior,
	renderProjectile: (p, props) => {
		drawDefaultWeaponComponent(p, props);
	},
	renderArenaEffect: () => {
		return false;
	}
};

const defaultProjectileWeaponModule: Partial<WeaponModule> = {
	renderProjectile: defaultWeaponModule.renderProjectile,
	renderArenaEffect: defaultWeaponModule.renderArenaEffect
};

const deadeyeSniperWeaponModule: Partial<WeaponModule> = {
	renderProjectile: (p, props) => {
		drawDeadeyeSniperComponent(p, props);
	}
};

const redlineSniperWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind === 'sniper-lock') {
			drawSniperLockEffect(p, effect);
			return true;
		}

		if (effect.kind === 'sniper-chain-burst') {
			drawSniperChainBurstEffect(p, effect);
			return true;
		}

		return false;
	}
};

const needleWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'needle-burst') {
			return false;
		}

		drawNeedleBurstEffect(p, effect);
		return true;
	}
};

const forceFieldWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'force-field') {
			return false;
		}

		drawForceFieldEffect(p, effect);
		return true;
	}
};

const killSwitchWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'kill-switch-pulse') {
			return false;
		}

		drawKillSwitchPulseEffect(p, effect);
		return true;
	}
};

const vulnerablePulseWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'vulnerable-pulse') {
			return false;
		}

		drawVulnerablePulseEffect(p, effect);
		return true;
	}
};

const laserSweepWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'laser-sweep') {
			return false;
		}

		drawLaserSweepEffect(p, effect);
		return true;
	}
};

const forkLightningWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'fork-lightning') {
			return false;
		}

		drawForkLightningEffect(p, effect);
		return true;
	}
};

const blizzardWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind === 'ice-spike') {
			drawIceSpikeEffect(p, effect);
			return true;
		}

		if (effect.kind === 'blizzard-storm') {
			drawBlizzardStormEffect(p, effect);
			return true;
		}

		return false;
	}
};

const voidTendrilsWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'void-tendril') {
			return false;
		}

		drawVoidTendrilEffect(p, effect);
		return true;
	}
};

const voidTunnelWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'void-tunnel') {
			return false;
		}

		drawVoidTunnelEffect(p, effect);
		return true;
	}
};

const phaseshiftWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'phaseshift') {
			return false;
		}

		drawPhaseshiftEffect(p, effect);
		return true;
	}
};

const stasisFieldWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'stasis-field') {
			return false;
		}

		drawStasisFieldEffect(p, effect);
		return true;
	}
};

const napalmGrenadeWeaponModule: Partial<WeaponModule> = {
	renderProjectile: (p, props) => {
		drawNapalmGrenadeComponent(p, props);
	},
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'burning-ground') {
			return false;
		}

		drawBurningGroundEffect(p, effect);
		return true;
	}
};

const delayedBombWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'delayed-bomb') {
			return false;
		}

		drawDelayedBombEffect(p, effect);
		return true;
	}
};

const executionLatticeWeaponModule: Partial<WeaponModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'execution-lattice-strike') {
			return false;
		}

		drawExecutionLatticeStrikeEffect(p, effect);
		return true;
	}
};

const defaultProjectileWeaponIds = [
	'target-painter',
	'the-knife',
	'pea-shooter',
	'blaster',
	'splitter',
	'heavy-orb',
	'fan-of-knives',
	'tide-caster',
	'ricochet-zigzag',
	'arc-caster',
	'ember-lance',
	'shiver-fork',
	'pulse-array',
	'comet-rig',
	'nova-rack',
	'shield-matrix',
	'shield-array',
	'shield-bastion',
	'cycle-booster',
	'damage-spire',
	'aegis-leech',
	'prism-brand',
	'relay-torch',
	'flamethrower',
	'grave-threader'
] as const;

const explicitWeaponModulesById = Object.fromEntries(
	defaultProjectileWeaponIds.map((weaponId) => [weaponId, defaultProjectileWeaponModule])
) as Record<string, Partial<WeaponModule>>;

const weaponModulesById: Record<string, Partial<WeaponModule>> = {
	...explicitWeaponModulesById,
	needle: needleWeaponModule,
	'kill-switch': killSwitchWeaponModule,
	'redline-sniper': redlineSniperWeaponModule,
	'deadeye-sniper': deadeyeSniperWeaponModule,
	'force-field': forceFieldWeaponModule,
	'lazer-rail': laserSweepWeaponModule,
	'zeus-hammer': forkLightningWeaponModule,
	'ruin-choir': vulnerablePulseWeaponModule,
	'void-tunnel': voidTunnelWeaponModule,
	'black-hole': voidTunnelWeaponModule,
	phaseshift: phaseshiftWeaponModule,
	'napalm-grenade': napalmGrenadeWeaponModule,
	'force-field-trap': stasisFieldWeaponModule,
	'the-bomb': delayedBombWeaponModule,
	'void-tendrils': voidTendrilsWeaponModule,
	blizzard: blizzardWeaponModule
};

export function getWeaponModule(weaponId: string): WeaponModule {
	const module = weaponModulesById[weaponId];

	if (!module) {
		return defaultWeaponModule;
	}

	return {
		activate: module.activate ?? defaultWeaponModule.activate,
		renderProjectile: module.renderProjectile ?? defaultWeaponModule.renderProjectile,
		renderArenaEffect: module.renderArenaEffect ?? defaultWeaponModule.renderArenaEffect
	};
}
