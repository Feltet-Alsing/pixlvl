import type P5 from 'p5';

import {
	drawOathbreakerSigilEffect,
	type UtilityArenaEffectProps
} from '$lib/p5/utility-component';
import { activateUtilityBehavior, type UtilityActivationContext } from '$lib/p5/utility-behaviors';
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

const oathbreakerUtilityModule: Partial<UtilityModule> = {
	renderArenaEffect: (p, effect) => {
		if (effect.kind !== 'oathbreaker-sigil') {
			return false;
		}

		drawOathbreakerSigilEffect(p, effect);
		return true;
	}
};

const defaultUtilityIds = [
	'shield-matrix',
	'shield-array',
	'shield-bastion',
	'cycle-booster',
	'damage-spire',
	'fire-infuser',
	'lightning-infuser',
	'cold-infuser',
	'void-infuser',
	'hemorrhage-burst',
	'blood-catalyst',
	'siphoning-knife'
] as const;

const explicitUtilityModulesById = Object.fromEntries(
	defaultUtilityIds.map((utilityId) => [utilityId, {}])
) as Record<string, Partial<UtilityModule>>;

const utilityModulesById: Record<string, Partial<UtilityModule>> = {
	...explicitUtilityModulesById,
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
