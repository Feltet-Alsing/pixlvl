import type { ElementalInfusionType } from '$lib/data/types';
import type { EquippedUtilityState } from '$lib/p5/campaign-runtime';

export interface UtilityActivationContext {
	currentSweepIndex: number;
	getShieldPoolForSource: (sourceId: string) => number;
	setShieldPoolForSource: (sourceId: string, amount: number) => void;
	getMineWeaponDamageTotal: () => number;
	spawnMineShieldTurret: (utility: EquippedUtilityState, shieldAmount: number) => void;
	recalculateShieldPool: () => void;
	setActiveShieldColor: (color: string) => void;
	addElementalInfusion: (element: ElementalInfusionType) => void;
	getElementalInfusionCount: (element: ElementalInfusionType) => number;
	spendElementalInfusion: (element: ElementalInfusionType, amount: number) => void;
	spawnOathbreakerSigil: (utility: EquippedUtilityState) => void;
	spawnMirrorArray: (utility: EquippedUtilityState) => void;
	applyCycleDamageBoost: (damageMultiplier: number, expiresAfterSweepIndex: number) => void;
	applyElementalCycleBoost: (
		element: ElementalInfusionType,
		damageMultiplier: number,
		expiresAfterSweepIndex: number
	) => void;
	applyElementalMasteryBoost: (damageMultiplier: number, expiresAfterSweepIndex: number) => void;
}

const elementalInfusionTypes: ElementalInfusionType[] = ['fire', 'lightning', 'cold', 'void'];

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

export function activateMirrorArrayUtility(
	utility: EquippedUtilityState,
	context: UtilityActivationContext
) {
	if (!shouldTriggerUtility(utility)) {
		return;
	}

	context.spawnMirrorArray(utility);
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

export function activateElementalCycleBoostUtility(
	utility: EquippedUtilityState,
	context: UtilityActivationContext,
	element: ElementalInfusionType,
	damageMultiplier: number
) {
	if (!shouldTriggerUtility(utility)) {
		return;
	}

	context.applyElementalCycleBoost(element, damageMultiplier, context.currentSweepIndex + 2);
}

export function activateElementalMasteryUtility(
	utility: EquippedUtilityState,
	context: UtilityActivationContext,
	damageMultiplier: number
) {
	if (!shouldTriggerUtility(utility)) {
		return;
	}

	for (const element of elementalInfusionTypes) {
		if (context.getElementalInfusionCount(element) < 1) {
			return;
		}
	}

	for (const element of elementalInfusionTypes) {
		context.spendElementalInfusion(element, 1);
	}

	context.applyElementalMasteryBoost(damageMultiplier, context.currentSweepIndex + 2);
}

export function activateMineShieldTurretUtility(
	utility: EquippedUtilityState,
	context: UtilityActivationContext,
	shieldRatioFromMineDamage: number
) {
	if (utility.definition.activationKind !== 'triggered') {
		return;
	}

	if (context.getShieldPoolForSource(utility.instanceId) > 0) {
		return;
	}

	if (utility.cyclesUntilTrigger > 1) {
		utility.cyclesUntilTrigger -= 1;
		return;
	}

	const mineWeaponDamageTotal = context.getMineWeaponDamageTotal();

	if (mineWeaponDamageTotal <= 0) {
		return;
	}

	utility.cyclesUntilTrigger = utility.cycleInterval;
	context.spawnMineShieldTurret(
		utility,
		Math.max(1, Math.ceil(mineWeaponDamageTotal * shieldRatioFromMineDamage))
	);
	context.recalculateShieldPool();
	context.setActiveShieldColor(utility.definition.utilityVisual?.color ?? '#67e8f9');
}

export function activateUtilityBehavior(
	utility: EquippedUtilityState,
	context: UtilityActivationContext
) {
	activatePassiveUtilityBehavior();
	void utility;
	void context;
}
