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

export function activatePassiveUtilityBehavior() {
	return;
}

function shouldTriggerUtility(utility: EquippedUtilityState) {
	if (utility.definition.activationKind !== 'triggered') {
		return false;
	}

	if (utility.cyclesUntilTrigger > 1) {
		utility.cyclesUntilTrigger -= 1;
		return false;
	}

	utility.cyclesUntilTrigger = utility.cycleInterval;
	return true;
}

export function activateShieldPoolUtility(
	utility: EquippedUtilityState,
	context: UtilityActivationContext,
	shieldPercent: number
) {
	if (utility.definition.activationKind !== 'triggered') {
		return;
	}

	if (context.getShieldPoolForSource(utility.instanceId) > 0) {
		return;
	}

	if (!shouldTriggerUtility(utility)) {
		return;
	}

	context.setShieldPoolForSource(utility.instanceId, shieldPercent);
	context.recalculateShieldPool();
	context.setActiveShieldColor(utility.definition.utilityVisual?.color ?? '#60a5fa');
}

export function activateElementalInfuserUtility(
	utility: EquippedUtilityState,
	context: UtilityActivationContext,
	element: ElementalInfusionType
) {
	if (!shouldTriggerUtility(utility)) {
		return;
	}

	context.addElementalInfusion(element);
}

export function activateOathbreakerSigilUtility(
	utility: EquippedUtilityState,
	context: UtilityActivationContext
) {
	if (!shouldTriggerUtility(utility)) {
		return;
	}

	context.spawnOathbreakerSigil(utility);
}

export function activateCycleDamageBoostUtility(
	utility: EquippedUtilityState,
	context: UtilityActivationContext,
	damageMultiplier: number
) {
	if (!shouldTriggerUtility(utility)) {
		return;
	}

	context.applyCycleDamageBoost(damageMultiplier, context.currentSweepIndex + 1);
}

export function activateUtilityBehavior(
	utility: EquippedUtilityState,
	context: UtilityActivationContext
) {
	activatePassiveUtilityBehavior();
	void utility;
	void context;
}
