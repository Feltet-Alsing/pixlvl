import type P5 from 'p5';

import {
	drawOathbreakerSigilEffect,
	type UtilityArenaEffectProps
} from '$lib/p5/utility-component';
import {
	activateCycleDamageBoostUtility,
	activateElementalInfuserUtility,
	activateOathbreakerSigilUtility,
	activatePassiveUtilityBehavior,
	activateShieldPoolUtility,
	activateUtilityBehavior,
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

		activateShieldPoolUtility(utility, context, effect.shieldPercent);
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

const defaultUtilityIds = [
	'cycle-booster',
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
	'damage-spire': damageSpireUtilityModule,
	'fire-infuser': elementalInfuserUtilityModule,
	'lightning-infuser': elementalInfuserUtilityModule,
	'cold-infuser': elementalInfuserUtilityModule,
	'void-infuser': elementalInfuserUtilityModule,
	'oathbreaker-sigil': oathbreakerUtilityModule
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
