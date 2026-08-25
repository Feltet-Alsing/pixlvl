import type { ElementalInfusionType } from '$lib/data/types';
import type { EquippedUtilityState } from '$lib/p5/campaign-runtime';

export interface UtilityActivationContext {
	currentSweepIndex: number;
	getShieldPoolForSource: (sourceId: string) => number;
	setShieldPoolForSource: (sourceId: string, amount: number) => void;
	recalculateShieldPool: () => void;
	setActiveShieldColor: (color: string) => void;
	addElementalInfusion: (element: ElementalInfusionType) => void;
	spawnOathbreakerSigil: (utility: EquippedUtilityState) => void;
	applyCycleDamageBoost: (damageMultiplier: number, expiresAfterSweepIndex: number) => void;
}

export function activateUtilityBehavior(
	utility: EquippedUtilityState,
	context: UtilityActivationContext
) {
	if (utility.definition.activationKind !== 'triggered') {
		return;
	}

	const effect = utility.definition.effect;

	if (effect.type === 'shield-pool') {
		if (context.getShieldPoolForSource(utility.instanceId) > 0) {
			return;
		}

		if (utility.cyclesUntilTrigger > 1) {
			utility.cyclesUntilTrigger -= 1;
			return;
		}

		utility.cyclesUntilTrigger = utility.cycleInterval;
		context.setShieldPoolForSource(utility.instanceId, effect.shieldPercent);
		context.recalculateShieldPool();
		context.setActiveShieldColor(utility.definition.utilityVisual?.color ?? '#60a5fa');
		return;
	}

	if (utility.cyclesUntilTrigger > 1) {
		utility.cyclesUntilTrigger -= 1;
		return;
	}

	utility.cyclesUntilTrigger = utility.cycleInterval;

	if (effect.type === 'elemental-infuser') {
		context.addElementalInfusion(effect.element);
		return;
	}

	if (effect.type === 'oathbreaker-sigil') {
		context.spawnOathbreakerSigil(utility);
		return;
	}

	if (effect.type === 'cycle-damage-boost') {
		context.applyCycleDamageBoost(effect.damageMultiplier, context.currentSweepIndex + 1);
	}
}
