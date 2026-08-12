import { baselineCombatProfile } from '$lib/data';

export type UpgradeKey = 'defence' | 'agility';

export interface UpgradeablePixlState {
	xp: number;
	level: number;
	perkPoints: number;
	defence: number;
	agility: number;
	health: number;
	attackSpeed: number;
	loadoutRows: number;
	loadoutColumns: number;
}

interface UpgradeRule {
	label: string;
	upgradeField: keyof Pick<UpgradeablePixlState, 'defence' | 'agility'>;
	apply: (state: UpgradeablePixlState) => Pick<UpgradeablePixlState, 'defence' | 'agility'>;
	describe: (state: UpgradeablePixlState) => string;
}

const UPGRADE_RULES: Record<UpgradeKey, UpgradeRule> = {
	defence: {
		label: 'Defence',
		upgradeField: 'defence',
		apply: (state) => ({
			defence: state.defence + 1,
			agility: state.agility
		}),
		describe: (state) => `+10% health -> ${Math.ceil(state.health * 1.1)}`
	},
	agility: {
		label: 'Agility',
		upgradeField: 'agility',
		apply: (state) => ({
			defence: state.defence,
			agility: state.agility + 1
		}),
		describe: (state) => `+10% sweep speed -> ${(state.attackSpeed * 1.1).toFixed(2)}/s`
	}
};

export interface UpgradeOption {
	key: UpgradeKey;
	label: string;
	canSpend: boolean;
	level: number;
	description: string;
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
	return Math.max(0, level - 1);
}

export function getLoadoutDimensions(level: number) {
	const milestoneCount = Math.max(0, Math.floor((level - 1) / 10));

	return {
		rows: 3 + milestoneCount,
		columns: 6 + milestoneCount
	};
}

export function createUpgradeablePixlState(
	input?: Partial<Pick<UpgradeablePixlState, 'xp' | 'defence' | 'agility'>>
) {
	const xp = Math.max(0, Math.floor(input?.xp ?? 0));
	const level = getLevelFromXp(xp);
	const totalPerkPoints = getPerkPointsForLevel(level);
	const defence = Math.max(0, Math.min(Math.floor(input?.defence ?? 0), totalPerkPoints));
	const maxAgility = Math.max(0, totalPerkPoints - defence);
	const agility = Math.max(0, Math.min(Math.floor(input?.agility ?? 0), maxAgility));
	const perkPoints = totalPerkPoints - defence - agility;
	const health = Math.ceil(baselineCombatProfile.pixl.health * Math.pow(1.1, defence));
	const attackSpeed = Number(
		(baselineCombatProfile.pixl.attackSpeed * Math.pow(1.1, agility)).toFixed(3)
	);
	const loadoutDimensions = getLoadoutDimensions(level);

	return {
		xp,
		level,
		perkPoints,
		defence,
		agility,
		health,
		attackSpeed,
		loadoutRows: loadoutDimensions.rows,
		loadoutColumns: loadoutDimensions.columns
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
	return value === 'defence' || value === 'agility';
}

export function applyUpgradePurchase(
	key: UpgradeKey,
	state: UpgradeablePixlState
): UpgradeablePixlState {
	const rule = UPGRADE_RULES[key];

	if (state.perkPoints < 1) {
		throw new Error(`Not enough perk points for ${rule.label.toLowerCase()} upgrade`);
	}

	return createUpgradeablePixlState(rule.apply(state));
}

export function applyXpGain(state: UpgradeablePixlState, gainedXp: number): UpgradeablePixlState {
	const normalizedGain = Math.max(0, Math.floor(gainedXp));

	if (normalizedGain === 0) {
		return state;
	}

	return createUpgradeablePixlState({
		xp: state.xp + normalizedGain,
		defence: state.defence,
		agility: state.agility
	});
}

export function getUpgradeOptions(state: UpgradeablePixlState): UpgradeOption[] {
	return (Object.keys(UPGRADE_RULES) as UpgradeKey[]).map((key) => {
		const rule = UPGRADE_RULES[key];

		return {
			key,
			label: rule.label,
			canSpend: state.perkPoints > 0,
			level: state[rule.upgradeField],
			description: rule.describe(state)
		};
	});
}
