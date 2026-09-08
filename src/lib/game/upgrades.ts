import { baselineCombatProfile } from '$lib/data';

export type UpgradeKey = 'power' | 'armour' | 'shieldCapacity' | 'defence' | 'agility';

export const upgradePurchaseAmounts = [1, 5, 10] as const;

const POWER_MAX_RANK = 10;
const ARMOUR_MAX_RANK = 10;
const SHIELD_CAPACITY_MAX_RANK = 20;
const AGILITY_MAX_RANK = 15;
const MAX_HEALTH_PER_DEFENCE_POINT = 12;
const DAMAGE_BONUS_PER_POWER_POINT = 0.05;
const ARMOUR_DAMAGE_REDUCTION_PER_POINT = 0.05;
const SHIELD_CAPACITY_BONUS_PER_POINT = 0.05;
const AGILITY_ATTACK_SPEED_PER_POINT = 0.02;

export interface UpgradeablePixlState {
	xp: number;
	level: number;
	perkPoints: number;
	power: number;
	armour: number;
	defence: number;
	shieldCapacity: number;
	agility: number;
	health: number;
	attackSpeed: number;
	loadoutRows: number;
	loadoutColumns: number;
	damageMultiplier: number;
	armourDamageReduction: number;
	shieldCapacityMultiplier: number;
}

interface UpgradeablePixlStateInput {
	xp?: number;
	power?: number;
	armour?: number;
	defence?: number;
	shieldCapacity?: number;
	agility?: number;
}

interface UpgradeRule {
	label: string;
	upgradeField: UpgradeKey;
	maxRank: number | null;
	describe: (state: UpgradeablePixlState) => string;
}

const UPGRADE_RULES: Record<UpgradeKey, UpgradeRule> = {
	power: {
		label: 'Power',
		upgradeField: 'power',
		maxRank: POWER_MAX_RANK,
		describe: (state) =>
			`Current +${Math.round((state.damageMultiplier - 1) * 100)}% damage. Cap +50%.`
	},
	armour: {
		label: 'Armour',
		upgradeField: 'armour',
		maxRank: ARMOUR_MAX_RANK,
		describe: (state) =>
			`Current ${Math.round(state.armourDamageReduction * 100)}% post-shield damage reduction. Cap 50%.`
	},
	shieldCapacity: {
		label: 'Shield Capacity',
		upgradeField: 'shieldCapacity',
		maxRank: SHIELD_CAPACITY_MAX_RANK,
		describe: (state) =>
			`Current +${Math.round((state.shieldCapacityMultiplier - 1) * 100)}% max shield pool. Cap +100%.`
	},
	defence: {
		label: 'Max Health',
		upgradeField: 'defence',
		maxRank: null,
		describe: (state) =>
			`Current ${state.health} max health. +${MAX_HEALTH_PER_DEFENCE_POINT} per point.`
	},
	agility: {
		label: 'Agility',
		upgradeField: 'agility',
		maxRank: AGILITY_MAX_RANK,
		describe: (state) =>
			`Current +${Math.round((state.attackSpeed / baselineCombatProfile.pixl.attackSpeed - 1) * 100)}% sweep speed. Cap +35%.`
	}
};

export interface UpgradeOption {
	key: UpgradeKey;
	label: string;
	canSpend: boolean;
	level: number;
	description: string;
	purchaseAmounts: number[];
}

function xpToNext(level: number) {
	return Math.max(1, Math.floor(8 * Math.pow(1.16, level - 1)));
}

function getLevelFromXp(xp: number) {
	let level = 1;
	let remainingXp = Math.max(0, Math.floor(xp));

	while (remainingXp >= xpToNext(level)) {
		remainingXp -= xpToNext(level);
		level += 1;
	}

	return level;
}

function getPerkPointsForLevel(level: number) {
	return Math.max(0, (level - 1) * 2);
}

export function getLoadoutDimensions(level: number) {
	const milestoneCount = Math.max(0, Math.floor((level - 1) / 10));

	return {
		rows: 3 + milestoneCount,
		columns: 6 + milestoneCount
	};
}

export function createUpgradeablePixlState(input?: UpgradeablePixlStateInput) {
	const xp = Math.max(0, Math.floor(input?.xp ?? 0));
	const level = getLevelFromXp(xp);
	const totalPerkPoints = getPerkPointsForLevel(level);
	let remainingPerkPoints = totalPerkPoints;
	const defence = Math.max(0, Math.min(Math.floor(input?.defence ?? 0), remainingPerkPoints));
	remainingPerkPoints -= defence;
	const agility = Math.max(
		0,
		Math.min(Math.floor(input?.agility ?? 0), Math.min(AGILITY_MAX_RANK, remainingPerkPoints))
	);
	remainingPerkPoints -= agility;
	const power = Math.max(
		0,
		Math.min(Math.floor(input?.power ?? 0), Math.min(POWER_MAX_RANK, remainingPerkPoints))
	);
	remainingPerkPoints -= power;
	const armour = Math.max(
		0,
		Math.min(Math.floor(input?.armour ?? 0), Math.min(ARMOUR_MAX_RANK, remainingPerkPoints))
	);
	remainingPerkPoints -= armour;
	const shieldCapacity = Math.max(
		0,
		Math.min(
			Math.floor(input?.shieldCapacity ?? 0),
			Math.min(SHIELD_CAPACITY_MAX_RANK, remainingPerkPoints)
		)
	);
	remainingPerkPoints -= shieldCapacity;
	const perkPoints = remainingPerkPoints;
	const baseHealth = baselineCombatProfile.pixl.health + Math.max(0, level - 1) * 2;
	const health = Math.ceil(baseHealth + defence * MAX_HEALTH_PER_DEFENCE_POINT);
	const attackSpeed = Number(
		(
			baselineCombatProfile.pixl.attackSpeed * Math.pow(1 + AGILITY_ATTACK_SPEED_PER_POINT, agility)
		).toFixed(3)
	);
	const loadoutDimensions = getLoadoutDimensions(level);
	const damageMultiplier = Number((1 + power * DAMAGE_BONUS_PER_POWER_POINT).toFixed(3));
	const armourDamageReduction = Number(
		Math.min(0.5, armour * ARMOUR_DAMAGE_REDUCTION_PER_POINT).toFixed(3)
	);
	const shieldCapacityMultiplier = Number(
		(1 + Math.min(1, shieldCapacity * SHIELD_CAPACITY_BONUS_PER_POINT)).toFixed(3)
	);

	return {
		xp,
		level,
		perkPoints,
		power,
		armour,
		defence,
		shieldCapacity,
		agility,
		health,
		attackSpeed,
		loadoutRows: loadoutDimensions.rows,
		loadoutColumns: loadoutDimensions.columns,
		damageMultiplier,
		armourDamageReduction,
		shieldCapacityMultiplier
	} satisfies UpgradeablePixlState;
}

export function getXpProgress(state: UpgradeablePixlState) {
	let xpSpentOnPastLevels = 0;

	for (let level = 1; level < state.level; level += 1) {
		xpSpentOnPastLevels += xpToNext(level);
	}

	const xpIntoLevel = state.xp - xpSpentOnPastLevels;
	const xpNeeded = xpToNext(state.level);

	return {
		xpIntoLevel,
		xpNeeded,
		nextLevel: state.level + 1
	};
}

export function createBaselineUpgradeablePixlState(): UpgradeablePixlState {
	return createUpgradeablePixlState();
}

export function isUpgradeKey(value: string): value is UpgradeKey {
	return (
		value === 'power' ||
		value === 'armour' ||
		value === 'shieldCapacity' ||
		value === 'defence' ||
		value === 'agility'
	);
}

export function getUpgradeLabel(key: UpgradeKey) {
	return UPGRADE_RULES[key].label;
}

export function getNormalizedUpgradePurchaseAmount(
	value: FormDataEntryValue | string | number | null | undefined
) {
	const parsed =
		typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;

	return upgradePurchaseAmounts.includes(parsed as (typeof upgradePurchaseAmounts)[number])
		? parsed
		: 1;
}

export function applyUpgradePurchase(
	key: UpgradeKey,
	state: UpgradeablePixlStateInput,
	amount = 1
): UpgradeablePixlState {
	const normalizedState = createUpgradeablePixlState(state);
	const rule = UPGRADE_RULES[key];
	const normalizedAmount = Math.max(1, Math.floor(amount));
	const maxRank = rule.maxRank;
	const maxSpendByRank =
		maxRank === null ? normalizedAmount : Math.max(0, maxRank - normalizedState[key]);
	const spendAmount = Math.min(normalizedAmount, normalizedState.perkPoints, maxSpendByRank);

	if (spendAmount < 1) {
		throw new Error(`Not enough perk points for ${rule.label.toLowerCase()} upgrade`);
	}

	return createUpgradeablePixlState({
		xp: normalizedState.xp,
		power: normalizedState.power + (key === 'power' ? spendAmount : 0),
		armour: normalizedState.armour + (key === 'armour' ? spendAmount : 0),
		defence: normalizedState.defence + (key === 'defence' ? spendAmount : 0),
		shieldCapacity: normalizedState.shieldCapacity + (key === 'shieldCapacity' ? spendAmount : 0),
		agility: normalizedState.agility + (key === 'agility' ? spendAmount : 0)
	});
}

export function resetUpgradeAllocations(state: UpgradeablePixlStateInput): UpgradeablePixlState {
	return createUpgradeablePixlState({
		xp: state.xp,
		power: 0,
		armour: 0,
		defence: 0,
		shieldCapacity: 0,
		agility: 0
	});
}

export function applyXpGain(
	state: UpgradeablePixlStateInput,
	gainedXp: number
): UpgradeablePixlState {
	const normalizedState = createUpgradeablePixlState(state);
	const normalizedGain = Math.max(0, Math.floor(gainedXp));

	if (normalizedGain === 0) {
		return normalizedState;
	}

	return createUpgradeablePixlState({
		xp: normalizedState.xp + normalizedGain,
		power: normalizedState.power,
		armour: normalizedState.armour,
		defence: normalizedState.defence,
		shieldCapacity: normalizedState.shieldCapacity,
		agility: normalizedState.agility
	});
}

export function getUpgradeOptions(state: UpgradeablePixlState): UpgradeOption[] {
	return (Object.keys(UPGRADE_RULES) as UpgradeKey[]).map((key) => {
		const rule = UPGRADE_RULES[key];
		const purchaseAmounts = upgradePurchaseAmounts.filter((amount) => {
			if (amount > state.perkPoints) {
				return false;
			}

			return rule.maxRank === null || state[rule.upgradeField] + amount <= rule.maxRank;
		});

		return {
			key,
			label: rule.label,
			canSpend: purchaseAmounts.length > 0,
			level: state[rule.upgradeField],
			description: rule.describe(state),
			purchaseAmounts
		};
	});
}
