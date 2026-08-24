import type P5 from 'p5';

import { getLoadoutItemDefinition, isUtilityDefinition, isWeaponDefinition } from '$lib/data';
import { getActiveLoadoutPlacements } from '$lib/game/loadout-slots';
import {
	getPlacementMirrored,
	getPlacementRotation,
	transformWeaponShape
} from '$lib/game/loadout-rotation';
import { createUpgradedWeaponDefinition } from '$lib/game/weapon-upgrades';

import type {
	CampaignLevel,
	GlitchKind,
	LoadoutItemDefinition,
	OwnedWeaponInstance,
	UtilityDefinition,
	WeaponDefinition,
	WeaponProjectileSize,
	WeaponRarity,
	WeaponShape,
	WeaponTargetingKind
} from '$lib/data/types';
import type { PersistedPixlState } from '$lib/server/game-state';

export const PROJECTILE_SIZE_BY_VISUAL: Record<WeaponProjectileSize, number> = {
	small: 5,
	medium: 8,
	large: 12
};

export const WEAPON_FILL_BY_RARITY: Record<WeaponRarity, [number, number, number]> = {
	normal: [236, 236, 236],
	magic: [84, 150, 255],
	rare: [255, 210, 74],
	exotic: [224, 74, 74],
	legendary: [160, 94, 36]
};

export const ENEMY_VISUALS: Record<
	GlitchKind,
	{
		radius: number;
		fill: [number, number, number];
		stroke?: [number, number, number];
		shape?: 'circle' | 'square' | 'diamond' | 'triangle';
	}
> = {
	biter: {
		radius: 8,
		fill: [196, 196, 196],
		shape: 'circle'
	},
	swarmer: {
		radius: 6,
		fill: [232, 232, 232],
		shape: 'square'
	},
	tanker: {
		radius: 13,
		fill: [96, 96, 96],
		stroke: [255, 255, 255],
		shape: 'circle'
	},
	shard: {
		radius: 9,
		fill: [68, 214, 255],
		stroke: [216, 247, 255],
		shape: 'triangle'
	},
	bulwark: {
		radius: 15,
		fill: [128, 95, 245],
		stroke: [244, 239, 255],
		shape: 'diamond'
	},
	shielder: {
		radius: 14,
		fill: [92, 156, 255],
		stroke: [220, 236, 255],
		shape: 'circle'
	},
	zerglitch: {
		radius: 22,
		fill: [188, 72, 72],
		stroke: [255, 205, 205],
		shape: 'circle'
	},
	'boss-melee': {
		radius: 32,
		fill: [142, 36, 36],
		stroke: [255, 214, 214],
		shape: 'circle'
	},
	'boss-ranged': {
		radius: 28,
		fill: [55, 148, 196],
		stroke: [219, 244, 255],
		shape: 'diamond'
	},
	'boss-hybrid': {
		radius: 36,
		fill: [122, 78, 188],
		stroke: [255, 228, 185],
		shape: 'diamond'
	}
};

export const glitchOrder: GlitchKind[] = [
	'biter',
	'swarmer',
	'tanker',
	'shard',
	'bulwark',
	'shielder',
	'zerglitch',
	'boss-melee',
	'boss-ranged',
	'boss-hybrid'
];

export const compositionKeyByKind = {
	biter: 'biters',
	swarmer: 'swarmers',
	tanker: 'tankers',
	shard: 'shard',
	bulwark: 'bulwark',
	shielder: 'shielder',
	zerglitch: 'zerglitch',
	'boss-melee': 'bossMelee',
	'boss-ranged': 'bossRanged',
	'boss-hybrid': 'bossHybrid'
} as const;

export interface EquippedWeaponState {
	instanceId: string;
	definition: WeaponDefinition;
	shape: WeaponShape;
	targeting: WeaponTargetingKind;
	triggerColumn: number;
	placementX: number;
	placementY: number;
	cycleInterval: number;
	cyclesUntilTrigger: number;
}

export interface EquippedUtilityState {
	instanceId: string;
	definition: UtilityDefinition;
	shape: WeaponShape;
	triggerColumn: number;
	placementX: number;
	placementY: number;
	cycleInterval: number;
	cyclesUntilTrigger: number;
}

export interface EquippedLoadoutEntry {
	instanceId: string;
	ownedWeapon: OwnedWeaponInstance;
	definition: LoadoutItemDefinition;
	shape: WeaponShape;
	targeting: WeaponTargetingKind | undefined;
	triggerColumn: number;
	placementX: number;
	placementY: number;
}

export function buildSpawnQueue(level: CampaignLevel): GlitchKind[] {
	const queue: GlitchKind[] = [];

	for (const kind of glitchOrder) {
		for (let index = 0; index < (level.composition[compositionKeyByKind[kind]] ?? 0); index += 1) {
			queue.push(kind);
		}
	}

	return queue;
}

export function createRewardPackId(randomInt: number) {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return `pack-${Date.now()}-${randomInt}`;
}

export function getCanvasSize(
	canvas: HTMLCanvasElement | null,
	maxWidth: number,
	baseHeight: number
) {
	const parentWidth = canvas?.parentElement?.clientWidth ?? maxWidth;
	const parentHeight = canvas?.parentElement?.clientHeight ?? baseHeight;
	const width = Math.max(1, Math.round(parentWidth));
	const height = Math.max(1, Math.round(parentHeight));

	return {
		width,
		height
	};
}

export function getLoadoutPreviewCanvasSize(
	canvas: HTMLCanvasElement | null,
	maxWidth: number,
	baseHeight: number
) {
	const parentWidth = canvas?.parentElement?.clientWidth ?? maxWidth;
	const parentHeight = canvas?.parentElement?.clientHeight ?? baseHeight;
	const width = Math.max(1, Math.min(Math.round(parentWidth), maxWidth));
	const height = Math.max(1, Math.round(parentHeight));

	return {
		width,
		height
	};
}

export function shuffleInPlace<T>(items: T[], p: P5) {
	for (let index = items.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(p.random(index + 1));
		const current = items[index];
		items[index] = items[randomIndex];
		items[randomIndex] = current;
	}

	return items;
}

function getLoadoutItemTriggerColumn(shape: WeaponShape, placementX: number) {
	const leftmostShapeColumn = Math.min(...shape.cells.map(([cellX]) => cellX));

	return placementX + leftmostShapeColumn;
}

export function buildEquippedLoadoutEntries(
	ownedWeapons: OwnedWeaponInstance[] | null | undefined,
	loadoutPlacements: PersistedPixlState['loadoutPlacements'] | null | undefined,
	loadoutColumnCount: number
): EquippedLoadoutEntry[] {
	if (!Array.isArray(ownedWeapons) || !loadoutPlacements) {
		return [];
	}

	const activeLoadoutPlacements = getActiveLoadoutPlacements(loadoutPlacements);
	const ownedWeaponMap = new Map(ownedWeapons.map((weapon) => [weapon.instanceId, weapon]));
	const entries: EquippedLoadoutEntry[] = [];

	for (const placement of activeLoadoutPlacements) {
		const ownedWeapon = ownedWeaponMap.get(placement.weaponInstanceId);

		if (!ownedWeapon) {
			continue;
		}

		const definition = getLoadoutItemDefinition(ownedWeapon.definitionId);
		const shape = transformWeaponShape(
			definition.shape,
			getPlacementRotation(placement),
			getPlacementMirrored(placement)
		);
		const triggerColumn = getLoadoutItemTriggerColumn(shape, placement.x);
		const targeting = isWeaponDefinition(definition)
			? (placement.targeting ?? definition.attack.targeting)
			: undefined;

		if (triggerColumn < 0 || triggerColumn >= loadoutColumnCount) {
			continue;
		}

		entries.push({
			instanceId: ownedWeapon.instanceId,
			ownedWeapon,
			definition,
			shape,
			targeting,
			triggerColumn,
			placementX: placement.x,
			placementY: placement.y
		});
	}

	return entries.sort(
		(left, right) =>
			left.triggerColumn - right.triggerColumn || left.instanceId.localeCompare(right.instanceId)
	);
}

export function buildEquippedWeapons(entries: EquippedLoadoutEntry[]) {
	return entries
		.filter((entry): entry is EquippedLoadoutEntry & { definition: WeaponDefinition } =>
			isWeaponDefinition(entry.definition)
		)
		.map((entry) => {
			const definition = createUpgradedWeaponDefinition(entry.ownedWeapon, entry.definition);

			return {
				instanceId: entry.instanceId,
				definition,
				shape: entry.shape,
				targeting: entry.targeting ?? definition.attack.targeting,
				triggerColumn: entry.triggerColumn,
				placementX: entry.placementX,
				placementY: entry.placementY,
				cycleInterval: Math.max(1, definition.attack.cycleInterval ?? 1),
				cyclesUntilTrigger: Math.max(1, definition.attack.cycleInterval ?? 1)
			};
		}) satisfies EquippedWeaponState[];
}

export function buildEquippedUtilities(entries: EquippedLoadoutEntry[]) {
	return entries
		.filter((entry): entry is EquippedLoadoutEntry & { definition: UtilityDefinition } =>
			isUtilityDefinition(entry.definition)
		)
		.map((entry) => ({
			instanceId: entry.instanceId,
			definition: entry.definition,
			shape: entry.shape,
			triggerColumn: entry.triggerColumn,
			placementX: entry.placementX,
			placementY: entry.placementY,
			cycleInterval: Math.max(1, entry.definition.cycleInterval ?? 1),
			cyclesUntilTrigger: Math.max(1, entry.definition.cycleInterval ?? 1)
		})) satisfies EquippedUtilityState[];
}

export function getPlacedShapeCells(
	shape: WeaponDefinition['shape'],
	originX: number,
	originY: number
) {
	return shape.cells.map(
		([cellX, cellY]) => [originX + cellX, originY + cellY] as [number, number]
	);
}

export function doCellsTouchByEdge(
	leftCells: Array<[number, number]>,
	rightCells: Array<[number, number]>
) {
	for (const [leftX, leftY] of leftCells) {
		for (const [rightX, rightY] of rightCells) {
			if (Math.abs(leftX - rightX) + Math.abs(leftY - rightY) === 1) {
				return true;
			}
		}
	}

	return false;
}

export function doLoadoutEntriesTouch(left: EquippedLoadoutEntry, right: EquippedLoadoutEntry) {
	return doCellsTouchByEdge(
		getPlacedShapeCells(left.shape, left.placementX, left.placementY),
		getPlacedShapeCells(right.shape, right.placementX, right.placementY)
	);
}
