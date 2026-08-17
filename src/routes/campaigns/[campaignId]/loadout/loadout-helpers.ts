import { isUtilityDefinition, isWeaponDefinition } from '$lib/data';
import {
	getLoadoutRotationLabel,
	getPlacementRotation,
	rotateWeaponShape
} from '$lib/game/loadout-rotation';

import type {
	LoadoutItemDefinition,
	LoadoutPlacement,
	LoadoutRotation,
	OwnedWeaponInstance,
	WeaponTargetingKind,
	UtilityDefinition,
	WeaponDefinition,
	WeaponShape
} from '$lib/data/types';

export interface LoadoutWeapon {
	weaponInstanceId: string;
	definitionId: string;
	category: 'weapon' | 'utility';
	name: string;
	rarity: WeaponDefinition['rarity'];
	shape: WeaponShape;
	baseDamage?: number;
	attack?: WeaponDefinition['attack'];
	activationKind?: UtilityDefinition['activationKind'];
	effectSummary: string;
	role: string;
	x: number;
	y: number;
	rotation: LoadoutRotation;
	targeting?: WeaponTargetingKind;
}

export interface InventoryWeapon {
	weaponInstanceId: string;
	definitionId: string;
	definition: LoadoutItemDefinition;
	category: 'weapon' | 'utility';
	name: string;
	rarity: WeaponDefinition['rarity'];
	shape: WeaponShape;
	baseDamage?: number;
	projectileSpeed?: number;
	attack?: WeaponDefinition['attack'];
	projectileVisual?: WeaponDefinition['projectileVisual'];
	activationKind?: UtilityDefinition['activationKind'];
	effectSummary: string;
	role: string;
	x: number | null;
	y: number | null;
	isEquipped: boolean;
}

export interface InventoryWeaponGroup {
	definitionId: string;
	definition: LoadoutItemDefinition;
	category: 'weapon' | 'utility';
	name: string;
	rarity: WeaponDefinition['rarity'];
	shape: WeaponShape;
	baseDamage?: number;
	projectileSpeed?: number;
	attack?: WeaponDefinition['attack'];
	projectileVisual?: WeaponDefinition['projectileVisual'];
	activationKind?: UtilityDefinition['activationKind'];
	effectSummary: string;
	role: string;
	totalCount: number;
	availableCount: number;
	equippedCount: number;
	representativeWeaponInstanceId: string | null;
}

export interface GridCell {
	x: number;
	y: number;
	key: string;
}

export interface LiveCombatProgress {
	stage: number;
	stageLevel: number;
	campaignLevel: number;
	status: 'running' | 'cleared' | 'defeated' | 'complete';
}

export const rarityOrder = {
	legendary: 0,
	exotic: 1,
	rare: 2,
	magic: 3,
	normal: 4
} as const satisfies Record<WeaponDefinition['rarity'], number>;

export function getGridCellKey(x: number, y: number) {
	return `${x}:${y}`;
}

export function cloneLoadoutPlacements(placements: LoadoutPlacement[]) {
	return placements.map((placement) => ({
		...placement,
		rotation: getPlacementRotation(placement)
	}));
}

export function buildLoadoutWeapons(
	placements: LoadoutPlacement[],
	ownedWeaponByInstanceId: Record<string, OwnedWeaponInstance>,
	weaponDefinitionById: Record<string, LoadoutItemDefinition>
) {
	const rows: LoadoutWeapon[] = [];

	for (const placement of placements) {
		const ownedWeapon = ownedWeaponByInstanceId[placement.weaponInstanceId];
		const definition = ownedWeapon ? weaponDefinitionById[ownedWeapon.definitionId] : null;

		if (!ownedWeapon || !definition) {
			continue;
		}

		rows.push({
			weaponInstanceId: placement.weaponInstanceId,
			definitionId: ownedWeapon.definitionId,
			category: isWeaponDefinition(definition) ? 'weapon' : 'utility',
			name: definition.name,
			rarity: definition.rarity,
			shape: rotateWeaponShape(definition.shape, getPlacementRotation(placement)),
			baseDamage: isWeaponDefinition(definition) ? definition.baseDamage : undefined,
			attack: isWeaponDefinition(definition) ? definition.attack : undefined,
			activationKind: isUtilityDefinition(definition) ? definition.activationKind : undefined,
			effectSummary: getLoadoutItemEffectSummary(definition),
			role: definition.role,
			x: placement.x,
			y: placement.y,
			rotation: getPlacementRotation(placement),
			targeting: placement.targeting
		});
	}

	return rows.sort(
		(left, right) => left.y - right.y || left.x - right.x || left.name.localeCompare(right.name)
	);
}

export function buildInventoryWeapons(
	ownedWeapons: OwnedWeaponInstance[],
	weaponDefinitionById: Record<string, LoadoutItemDefinition>,
	placementByWeaponInstanceId: Record<string, LoadoutPlacement>
) {
	const rows: InventoryWeapon[] = [];

	for (const weapon of ownedWeapons) {
		const definition = weaponDefinitionById[weapon.definitionId];
		const placement = placementByWeaponInstanceId[weapon.instanceId] ?? null;

		if (!definition) {
			continue;
		}

		rows.push({
			weaponInstanceId: weapon.instanceId,
			definitionId: weapon.definitionId,
			definition,
			category: isWeaponDefinition(definition) ? 'weapon' : 'utility',
			name: definition.name,
			rarity: definition.rarity,
			shape: definition.shape,
			baseDamage: isWeaponDefinition(definition) ? definition.baseDamage : undefined,
			projectileSpeed: isWeaponDefinition(definition) ? definition.projectileSpeed : undefined,
			attack: isWeaponDefinition(definition) ? definition.attack : undefined,
			projectileVisual: isWeaponDefinition(definition) ? definition.projectileVisual : undefined,
			activationKind: isUtilityDefinition(definition) ? definition.activationKind : undefined,
			effectSummary: getLoadoutItemEffectSummary(definition),
			role: definition.role,
			x: placement?.x ?? null,
			y: placement?.y ?? null,
			isEquipped: Boolean(placement)
		});
	}

	return rows.sort(
		(left, right) =>
			Number(right.isEquipped) - Number(left.isEquipped) ||
			left.name.localeCompare(right.name) ||
			left.weaponInstanceId.localeCompare(right.weaponInstanceId)
	);
}

export function buildInventoryWeaponGroups(inventoryWeapons: InventoryWeapon[]) {
	const groups: Record<string, InventoryWeaponGroup> = {};

	for (const weapon of inventoryWeapons) {
		const existing = groups[weapon.definitionId];

		if (!existing) {
			groups[weapon.definitionId] = {
				definitionId: weapon.definitionId,
				definition: weapon.definition,
				category: weapon.category,
				name: weapon.name,
				rarity: weapon.rarity,
				shape: weapon.shape,
				baseDamage: weapon.baseDamage,
				projectileSpeed: weapon.projectileSpeed,
				attack: weapon.attack,
				projectileVisual: weapon.projectileVisual,
				activationKind: weapon.activationKind,
				effectSummary: weapon.effectSummary,
				role: weapon.role,
				totalCount: 1,
				availableCount: weapon.isEquipped ? 0 : 1,
				equippedCount: weapon.isEquipped ? 1 : 0,
				representativeWeaponInstanceId: weapon.isEquipped ? null : weapon.weaponInstanceId
			};
			continue;
		}

		existing.totalCount += 1;

		if (weapon.isEquipped) {
			existing.equippedCount += 1;
		} else {
			existing.availableCount += 1;

			if (!existing.representativeWeaponInstanceId) {
				existing.representativeWeaponInstanceId = weapon.weaponInstanceId;
			}
		}
	}

	return Object.values(groups).sort(
		(left, right) =>
			rarityOrder[left.rarity] - rarityOrder[right.rarity] ||
			Number(left.category === 'utility') - Number(right.category === 'utility') ||
			right.availableCount - left.availableCount ||
			right.totalCount - left.totalCount ||
			left.name.localeCompare(right.name)
	);
}

export function filterInventoryWeaponGroups(groups: InventoryWeaponGroup[], query: string) {
	const normalizedQuery = query.trim().toLowerCase();

	if (!normalizedQuery) {
		return groups;
	}

	return groups.filter((group) => {
		const haystack = [group.name, group.role, group.effectSummary, group.category, group.rarity]
			.join(' ')
			.toLowerCase();

		return haystack.includes(normalizedQuery);
	});
}

export function buildGridCells(rowCount: number, columnCount: number) {
	const cells: GridCell[] = [];

	for (let y = 0; y < rowCount; y += 1) {
		for (let x = 0; x < columnCount; x += 1) {
			cells.push({ x, y, key: getGridCellKey(x, y) });
		}
	}

	return cells;
}

export function isShapeCellFilled(shape: WeaponShape, x: number, y: number) {
	return shape.cells.some(([cellX, cellY]) => cellX === x && cellY === y);
}

export function isLabelCell(shape: WeaponShape, x: number, y: number) {
	const [labelX, labelY] = shape.cells[0] ?? [0, 0];
	return labelX === x && labelY === y;
}

export function getWeaponGridArea(weapon: { x: number; y: number; shape: WeaponShape }) {
	return `grid-column: ${weapon.x + 1} / span ${weapon.shape.width}; grid-row: ${weapon.y + 1} / span ${weapon.shape.height};`;
}

export function getShapeGridTemplate(shape: WeaponShape) {
	return `grid-template-columns: repeat(${shape.width}, minmax(0, 1fr)); grid-template-rows: repeat(${shape.height}, minmax(0, 1fr));`;
}

export function getDefaultDragAnchor(shape: WeaponShape) {
	let topLeftCell = shape.cells[0] ?? [0, 0];

	for (const cell of shape.cells) {
		if (cell[1] < topLeftCell[1] || (cell[1] === topLeftCell[1] && cell[0] < topLeftCell[0])) {
			topLeftCell = cell;
		}
	}

	return { x: topLeftCell[0], y: topLeftCell[1] };
}

export function getShapeLabel(
	shape: { width: number; height: number; cells: Array<[number, number]> },
	rotation?: LoadoutRotation
) {
	const baseLabel = `${shape.width}x${shape.height} · ${shape.cells.length} tiles`;
	return rotation === undefined ? baseLabel : `${baseLabel} · ${getLoadoutRotationLabel(rotation)}`;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

type DragPointerLikeEvent = {
	clientX: number;
	clientY: number;
	currentTarget: EventTarget | null;
};

export function getPlacedWeaponDragAnchor(event: DragPointerLikeEvent, shape: WeaponShape) {
	const target = event.currentTarget;

	if (!(target instanceof HTMLElement)) {
		return getDefaultDragAnchor(shape);
	}

	const rect = target.getBoundingClientRect();

	if (!rect.width || !rect.height) {
		return getDefaultDragAnchor(shape);
	}

	const localX = clamp(event.clientX - rect.left, 0, rect.width - 1);
	const localY = clamp(event.clientY - rect.top, 0, rect.height - 1);
	const anchorX = clamp(Math.floor((localX / rect.width) * shape.width), 0, shape.width - 1);
	const anchorY = clamp(Math.floor((localY / rect.height) * shape.height), 0, shape.height - 1);

	return { x: anchorX, y: anchorY };
}

export function getDragAnchorFromGrid(
	event: DragPointerLikeEvent,
	shape: WeaponShape,
	gridElement: HTMLElement,
	fallback: { x: number; y: number }
) {
	const rect = gridElement.getBoundingClientRect();

	if (!rect.width || !rect.height) {
		return fallback;
	}

	const isInsideGrid =
		event.clientX >= rect.left &&
		event.clientX <= rect.right &&
		event.clientY >= rect.top &&
		event.clientY <= rect.bottom;

	if (!isInsideGrid) {
		return fallback;
	}

	const localX = clamp(event.clientX - rect.left, 0, rect.width - 1);
	const localY = clamp(event.clientY - rect.top, 0, rect.height - 1);
	const anchorX = clamp(Math.floor((localX / rect.width) * shape.width), 0, shape.width - 1);
	const anchorY = clamp(Math.floor((localY / rect.height) * shape.height), 0, shape.height - 1);

	return { x: anchorX, y: anchorY };
}

export function setShapeGridDragImage(
	event: DragEvent,
	shape: WeaponShape,
	gridElement: HTMLElement,
	anchor: { x: number; y: number }
) {
	if (!event.dataTransfer) {
		return;
	}

	const cellIndex = anchor.y * shape.width + anchor.x;
	const anchorCell = gridElement.children.item(cellIndex);

	if (!(anchorCell instanceof HTMLElement)) {
		return;
	}

	const gridRect = gridElement.getBoundingClientRect();
	const cellRect = anchorCell.getBoundingClientRect();
	const hotspotX = cellRect.left - gridRect.left + cellRect.width / 2;
	const hotspotY = cellRect.top - gridRect.top + cellRect.height / 2;

	event.dataTransfer.setDragImage(gridElement, hotspotX, hotspotY);
}

export function isPointWithinElementBounds(element: HTMLElement, x: number, y: number) {
	const rect = element.getBoundingClientRect();

	return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function formatInventoryGroupStatus(group: InventoryWeaponGroup) {
	if (!group.availableCount) {
		return group.equippedCount ? `All ${group.totalCount} equipped` : `${group.totalCount} owned`;
	}

	if (!group.equippedCount) {
		return `${group.availableCount} ready`;
	}

	return `${group.availableCount} ready, ${group.equippedCount} equipped`;
}

export function getWeaponCycleRate(weapon: Pick<LoadoutWeapon, 'attack'>) {
	if (!weapon.attack) {
		return 0;
	}

	return 1 / Math.max(1, weapon.attack.cycleInterval ?? 1);
}

export function getLoadoutItemEffectSummary(definition: LoadoutItemDefinition) {
	if (isWeaponDefinition(definition)) {
		return formatAttackLabel(definition.attack.kind);
	}

	switch (definition.effect.type) {
		case 'shield-pool':
			return `Adds ${definition.effect.shieldAmount} shield until broken`;
		case 'elemental-infuser':
			return `Generates 1 ${definition.effect.element} infusion per cycle`;
		case 'cycle-adjacency-reduction':
			return `Adjacent weapons activate ${definition.effect.reduction} cycle faster`;
		case 'cycle-damage-boost':
			return `${definition.effect.damageMultiplier}x damage next cycle`;
	}
}

export function formatInventoryCardSummary(group: InventoryWeaponGroup) {
	if (group.category === 'utility') {
		return `${group.activationKind === 'passive' ? 'Passive' : 'Triggered'} utility: ${group.effectSummary}`;
	}

	if (!group.attack || !group.baseDamage) {
		return group.effectSummary;
	}

	return `${group.baseDamage} dmg, ${group.attack.projectileCount} proj, ${formatAttackLabel(group.attack.kind)} every ${formatCycleThreshold(group.attack)} ${formatCycleThreshold(group.attack) === '1' ? 'cycle' : 'cycles'}`;
}

export function formatCycleThreshold(attack: WeaponDefinition['attack']) {
	const cycleInterval = Math.max(1, attack.cycleInterval ?? 1);

	return cycleInterval.toString();
}

export function formatAttackLabel(kind: WeaponDefinition['attack']['kind']) {
	switch (kind) {
		case 'single':
			return 'Single shot';
		case 'dual':
			return 'Dual shot';
		case 'spread':
			return 'Spread shot';
		default:
			return kind;
	}
}

export function formatCycleAverage(value: number) {
	return Number.isInteger(value)
		? value.toString()
		: value.toLocaleString(undefined, {
				minimumFractionDigits: 0,
				maximumFractionDigits: 2
			});
}
