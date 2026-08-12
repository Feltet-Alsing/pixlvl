import { baselineCombatProfile } from '$lib/data';

export type UpgradeKey = 'health' | 'attackSpeed';

export interface UpgradeablePixlState {
	gold: number;
	health: number;
	// damage: number; // Commenting out damage for future reference
	attackSpeed: number;
	healthUpgrades: number;
	// damageUpgrades: number; // Commenting out damageUpgrades for future reference
	attackSpeedUpgrades: number;
}

interface UpgradeRule {
	label: string;
	baseCost: number;
	costGrowth: number;
	upgradeField: keyof Pick<UpgradeablePixlState, 'healthUpgrades' | 'attackSpeedUpgrades'>;
	apply: (
	apply: (state: UpgradeablePixlState) => Pick<UpgradeablePixlState, 'health' | 'attackSpeed'>; // Removing damage from apply
	describe: (state: UpgradeablePixlState) => string;
}

const UPGRADE_RULES: Record<UpgradeKey, UpgradeRule> = {
	health: {
		label: 'Health',
		baseCost: 20,
		costGrowth: 1.2,
		upgradeField: 'healthUpgrades',
		apply: (state) => ({
			health: Math.ceil(state.health * 1.15),
			// damage: state.damage, // Commenting out damage for future reference
			attackSpeed: state.attackSpeed
		}),
		describe: (state) => `+15% health -> ${Math.ceil(state.health * 1.15)}`
	},
	attackSpeed: {
		label: 'Attack speed',
		baseCost: 35,
		costGrowth: 1.2,
		upgradeField: 'attackSpeedUpgrades',
		apply: (state) => ({
			health: state.health,
			// damage: state.damage, // Commenting out damage for future reference
			attackSpeed: Number((state.attackSpeed * 1.05).toFixed(3))
		}),
		describe: (state) => `+5% attack speed -> ${(state.attackSpeed * 1.05).toFixed(2)}/s`
	}
};

export interface UpgradeOption {
	key: UpgradeKey;
	label: string;
	cost: number;
	canAfford: boolean;
	level: number;
	description: string;
}

export function createBaselineUpgradeablePixlState(): UpgradeablePixlState {
	return {
		gold: 0,
		health: baselineCombatProfile.pixl.health,
		// damage: baselineCombatProfile.pixl.damage, // Commenting out damage for future reference
		attackSpeed: baselineCombatProfile.pixl.attackSpeed,
		healthUpgrades: 0,
		// damageUpgrades: 0, // Commenting out damageUpgrades for future reference
		attackSpeedUpgrades: 0
	};
}

export function isUpgradeKey(value: string): value is UpgradeKey {
	return value === 'health' || value === 'attackSpeed';
}

export function getUpgradeCost(key: UpgradeKey, state: UpgradeablePixlState): number {
	const rule = UPGRADE_RULES[key];
	const purchaseCount = state[rule.upgradeField];

	return Math.ceil(rule.baseCost * Math.pow(rule.costGrowth, purchaseCount));
}

export function applyUpgradePurchase(
	key: UpgradeKey,
	state: UpgradeablePixlState
): UpgradeablePixlState {
	const rule = UPGRADE_RULES[key];
	const cost = getUpgradeCost(key, state);

	if (state.gold < cost) {
		throw new Error(`Not enough gold for ${rule.label.toLowerCase()} upgrade`);
	}

	const nextStats = rule.apply(state);

	return {
		...state,
		...nextStats,
		gold: state.gold - cost,
		[rule.upgradeField]: state[rule.upgradeField] + 1
	};
}

export function getUpgradeOptions(state: UpgradeablePixlState): UpgradeOption[] {
	return (Object.keys(UPGRADE_RULES) as UpgradeKey[]).map((key) => {
		const rule = UPGRADE_RULES[key];
		const cost = getUpgradeCost(key, state);

		return {
			key,
			label: rule.label,
			cost,
			canAfford: state.gold >= cost,
			level: state[rule.upgradeField],
			description: rule.describe(state)
		};
	});
}
