import type { WeaponRarity } from '$lib/data/types';

export type DungeonCombatStatus = 'running' | 'cleared' | 'defeated' | 'complete';

export interface DungeonFloorMenuItem {
	floor: number;
	label: string;
	caption: string;
	meta: string;
	cleared: boolean;
	unlocked: boolean;
	actionable: boolean;
	locked: boolean;
	selected: boolean;
}

export interface DungeonArenaSummary {
	remainingEnemies: number;
	waveXp: number;
	status: DungeonCombatStatus;
	pixlHealth: number;
	maxPixlHealth: number;
	pixlShieldPool: number;
	shieldColor: string;
}

export interface DungeonWeaponDamageRow {
	weaponInstanceId: string;
	definitionId: string;
	name: string;
	rarity: WeaponRarity;
	placement: string;
	averageDamagePerCycle: number;
}
