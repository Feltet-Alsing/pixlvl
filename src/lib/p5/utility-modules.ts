import type P5 from 'p5';

import {
	drawMineShieldTurretEffect,
	drawOathbreakerSigilEffect,
	drawStoneWardEffect,
	drawVanishRuneEffect,
	type UtilityArenaEffectProps
} from '$lib/p5/utility-component';
import {
	activateCycleDamageBoostUtility,
	activateElementalCycleBoostUtility,
	activateElementalInfuserUtility,
	activateElementalMasteryUtility,
	activateMineShieldTurretUtility,
	activateMirrorArrayUtility,
	activateOathbreakerSigilUtility,
	activatePassiveUtilityBehavior,
	activateShieldPoolUtility,
	activateUtilityBehavior,
	activateVanishRuneUtility,
	type UtilityActivationContext
} from '$lib/p5/utility-behaviors';
import type { EquippedUtilityState } from '$lib/p5/campaign-runtime';

export interface UtilityModule {
	activate: (utility: EquippedUtilityState, context: UtilityActivationContext) => void;
	renderArenaEffect: (p: P5, effect: UtilityArenaEffectProps) => boolean;
}

const defaultUtilityModule: UtilityModule = {
	activate: activateUtilityBehavior,
	renderArenaEffect: () => {
		return false;
	}
};

const passiveUtilityModule: Partial<UtilityModule> = {
	activate: activatePassiveUtilityBehavior
};

const shieldPoolUtilityModule: Partial<UtilityModule> = {
	activate: (utility, context) => {
		const effect = utility.definition.effect;

		if (effect.type !== 'shield-pool') {
			return;
		}

		activateShieldPoolUtility(
			utility,
			context,
			effect.shieldPercent * context.getUtilityShieldOutputMultiplier(utility.instanceId)
		);
	}
};

const stoneWardUtilityModule: Partial<UtilityModule> = {
	activate: shieldPoolUtilityModule.activate,
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'stone-ward') {
			return false;
		}

		drawStoneWardEffect(p, effect);
		return true;
	}
};

const damageSpireUtilityModule: Partial<UtilityModule> = {
	activate: (utility, context) => {
		const effect = utility.definition.effect;

		if (effect.type !== 'cycle-damage-boost') {
			return;
		}

		activateCycleDamageBoostUtility(utility, context, effect.damageMultiplier);
	}
};

const elementalInfuserUtilityModule: Partial<UtilityModule> = {
	activate: (utility, context) => {
		const effect = utility.definition.effect;

		if (effect.type !== 'elemental-infuser') {
			return;
		}

		activateElementalInfuserUtility(utility, context, effect.element);
	}
};

const elementalCycleBoostUtilityModule: Partial<UtilityModule> = {
	activate: (utility, context) => {
		const effect = utility.definition.effect;

		if (effect.type !== 'elemental-cycle-boost') {
			return;
		}

		activateElementalCycleBoostUtility(utility, context, effect.element, effect.damageMultiplier);
	}
};

const elementalMasteryUtilityModule: Partial<UtilityModule> = {
	activate: (utility, context) => {
		const effect = utility.definition.effect;

		if (effect.type !== 'elemental-mastery') {
			return;
		}

		activateElementalMasteryUtility(utility, context, effect.damageMultiplier);
	}
};

const oathbreakerUtilityModule: Partial<UtilityModule> = {
	activate: (utility, context) => {
		activateOathbreakerSigilUtility(utility, context);
	},
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'oathbreaker-sigil') {
			return false;
		}

		drawOathbreakerSigilEffect(p, effect);
		return true;
	}
};

const mirrorArrayUtilityModule: Partial<UtilityModule> = {
	activate: (utility, context) => {
		activateMirrorArrayUtility(utility, context);
	}
};

const mineShieldTurretUtilityModule: Partial<UtilityModule> = {
	activate: (utility, context) => {
		const effect = utility.definition.effect;

		if (effect.type !== 'mine-shield-turret') {
			return;
		}

		activateMineShieldTurretUtility(
			utility,
			context,
			effect.shieldRatioFromMineDamage *
				context.getUtilityShieldOutputMultiplier(utility.instanceId)
		);
	},
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'mine-shield-turret') {
			return false;
		}

		drawMineShieldTurretEffect(p, effect);
		return true;
	}
};

const vanishRuneUtilityModule: Partial<UtilityModule> = {
	activate: (utility, context) => {
		const effect = utility.definition.effect;

		if (effect.type !== 'vanish-rune') {
			return;
		}

		activateVanishRuneUtility(
			utility,
			context,
			effect.requiredUniqueRuneCount,
			effect.durationCycles,
			effect.successCooldownCycles
		);
	},
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'vanish-rune') {
			return false;
		}

		drawVanishRuneEffect(p, effect);
		return true;
	}
};

const defaultUtilityIds = [
	'cycle-booster',
	'shield-booster',
	'projectile-speed-booster',
	'lifesteal-booster',
	'shieldsteal-booster',
	'damage-booster',
	'hemorrhage-burst',
	'mine-echo',
	'gravity-mine-augment',
	'blood-catalyst',
	'siphoning-knife'
] as const;

const explicitUtilityModulesById = Object.fromEntries(
	defaultUtilityIds.map((utilityId) => [utilityId, passiveUtilityModule])
) as Record<string, Partial<UtilityModule>>;

const utilityModulesById: Record<string, Partial<UtilityModule>> = {
	...explicitUtilityModulesById,
	'shield-matrix': shieldPoolUtilityModule,
	'shield-array': shieldPoolUtilityModule,
	'shield-bastion': shieldPoolUtilityModule,
	'stone-ward': stoneWardUtilityModule,
	'shield-turret': mineShieldTurretUtilityModule,
	'damage-spire': damageSpireUtilityModule,
	'fire-infuser': elementalInfuserUtilityModule,
	'lightning-infuser': elementalInfuserUtilityModule,
	'cold-infuser': elementalInfuserUtilityModule,
	'void-infuser': elementalInfuserUtilityModule,
	'fire-boost': elementalCycleBoostUtilityModule,
	'lightning-boost': elementalCycleBoostUtilityModule,
	'cold-boost': elementalCycleBoostUtilityModule,
	'void-boost': elementalCycleBoostUtilityModule,
	'elemental-mastery': elementalMasteryUtilityModule,
	'oathbreaker-sigil': oathbreakerUtilityModule,
	'mirror-array': mirrorArrayUtilityModule,
	'vanish-rune': vanishRuneUtilityModule
};

export function getUtilityModule(utilityId: string): UtilityModule {
	const module = utilityModulesById[utilityId];

	if (!module) {
		return defaultUtilityModule;
	}

	return {
		activate: module.activate ?? defaultUtilityModule.activate,
		renderArenaEffect: module.renderArenaEffect ?? defaultUtilityModule.renderArenaEffect
	};
}
