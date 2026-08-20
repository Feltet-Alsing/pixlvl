import { isUtilityDefinition, isWeaponDefinition, starterWeaponId } from '$lib/data';
import {
	getLoadoutRotationLabel,
	getPlacementRotation,
	rotateWeaponShape
} from '$lib/game/loadout-rotation';
import {
	createUpgradedWeaponDefinition,
	getWeaponDisplayName,
	getWeaponTotalScrapInvested,
	getWeaponUpgradeCostForNextLevel,
	getWeaponUpgradeLevel,
	isUpgradeableWeaponInstance,
	MAX_WEAPON_UPGRADE_LEVEL
} from '$lib/game/weapon-upgrades';

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
	upgradeLevel: number;
	rarity: WeaponDefinition['rarity'];
	shape: WeaponShape;
	baseDamage?: number;
	attack?: WeaponDefinition['attack'];
	projectileSpeed?: number;
	activationKind?: UtilityDefinition['activationKind'];
	effectSummary: string;
	role: string;
	totalScrapInvested: number;
	isUpgradeable: boolean;
	nextUpgradeCost: number | null;
	isMaxUpgradeLevel: boolean;
	x: number;
	y: number;
	rotation: LoadoutRotation;
	targeting?: WeaponTargetingKind;
}

export interface InventoryWeapon {
	groupId: string;
	weaponInstanceId: string;
	definitionId: string;
	definition: LoadoutItemDefinition;
	category: 'weapon' | 'utility';
	name: string;
	upgradeLevel: number;
	totalScrapInvested: number;
	rarity: WeaponDefinition['rarity'];
	shape: WeaponShape;
	baseDamage?: number;
	projectileSpeed?: number;
	attack?: WeaponDefinition['attack'];
	projectileVisual?: WeaponDefinition['projectileVisual'];
	activationKind?: UtilityDefinition['activationKind'];
	effectSummary: string;
	role: string;
	isUpgradeable: boolean;
	nextUpgradeCost: number | null;
	isMaxUpgradeLevel: boolean;
	acquiredAt: string;
	source: OwnedWeaponInstance['source'];
	x: number | null;
	y: number | null;
	isEquipped: boolean;
}

export interface InventoryWeaponGroup {
	groupId: string;
	definitionId: string;
	definition: LoadoutItemDefinition;
	category: 'weapon' | 'utility';
	name: string;
	upgradeLevel: number;
	totalScrapInvested: number;
	isUpgraded: boolean;
	bulkScrappable: boolean;
	isUpgradeable: boolean;
	nextUpgradeCost: number | null;
	isMaxUpgradeLevel: boolean;
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
	latestAcquiredAt: string;
	latestAcquiredAtMs: number;
	isNew: boolean;
}

export type InventoryGroupSortMode = 'recent' | 'rarity' | 'duplicates' | 'size' | 'name';

export interface InventoryGroupFilterOptions {
	query: string;
	favoriteGroupIds?: Set<string>;
	favoritesOnly?: boolean;
	duplicatesOnly?: boolean;
	upgradedOnly?: boolean;
	allowedRarities?: Set<WeaponDefinition['rarity']>;
	sortMode?: InventoryGroupSortMode;
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

function getUpgradeLevel(weapon: OwnedWeaponInstance) {
	return Math.max(0, weapon.upgradeLevel ?? 0);
}

function getTotalScrapInvested(weapon: OwnedWeaponInstance) {
	return Math.max(0, weapon.totalScrapInvested ?? 0);
}

function formatWeaponDisplayName(definitionName: string, upgradeLevel: number) {
	return upgradeLevel > 0 ? `${definitionName} +${upgradeLevel}` : definitionName;
}

function getInventoryWeaponGroupId(weapon: OwnedWeaponInstance) {
	const upgradeLevel = getUpgradeLevel(weapon);
	return upgradeLevel > 0 ? `${weapon.definitionId}::${weapon.instanceId}` : weapon.definitionId;
}

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

		const displayDefinition =
			isWeaponDefinition(definition) && isUpgradeableWeaponInstance(ownedWeapon, definition)
				? createUpgradedWeaponDefinition(ownedWeapon, definition)
				: definition;

		rows.push({
			weaponInstanceId: placement.weaponInstanceId,
			definitionId: ownedWeapon.definitionId,
			category: isWeaponDefinition(displayDefinition) ? 'weapon' : 'utility',
			name: displayDefinition.name,
			upgradeLevel: getUpgradeLevel(ownedWeapon),
			rarity: displayDefinition.rarity,
			shape: rotateWeaponShape(displayDefinition.shape, getPlacementRotation(placement)),
			baseDamage: isWeaponDefinition(displayDefinition) ? displayDefinition.baseDamage : undefined,
			attack: isWeaponDefinition(displayDefinition) ? displayDefinition.attack : undefined,
			projectileSpeed: isWeaponDefinition(displayDefinition)
				? displayDefinition.projectileSpeed
				: undefined,
			activationKind: isUtilityDefinition(displayDefinition)
				? displayDefinition.activationKind
				: undefined,
			effectSummary: getLoadoutItemEffectSummary(displayDefinition),
			role: displayDefinition.role,
			totalScrapInvested: getTotalScrapInvested(ownedWeapon),
			isUpgradeable: isUpgradeableWeaponInstance(ownedWeapon, definition),
			nextUpgradeCost: isWeaponDefinition(definition)
				? getWeaponUpgradeCostForNextLevel(ownedWeapon, definition.rarity)
				: null,
			isMaxUpgradeLevel: getUpgradeLevel(ownedWeapon) >= MAX_WEAPON_UPGRADE_LEVEL,
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

		const displayDefinition =
			isWeaponDefinition(definition) && isUpgradeableWeaponInstance(weapon, definition)
				? createUpgradedWeaponDefinition(weapon, definition)
				: definition;

		rows.push({
			groupId: getInventoryWeaponGroupId(weapon),
			weaponInstanceId: weapon.instanceId,
			definitionId: weapon.definitionId,
			definition: displayDefinition,
			category: isWeaponDefinition(displayDefinition) ? 'weapon' : 'utility',
			name: displayDefinition.name,
			upgradeLevel: getUpgradeLevel(weapon),
			totalScrapInvested: getTotalScrapInvested(weapon),
			rarity: displayDefinition.rarity,
			shape: displayDefinition.shape,
			baseDamage: isWeaponDefinition(displayDefinition) ? displayDefinition.baseDamage : undefined,
			projectileSpeed: isWeaponDefinition(displayDefinition)
				? displayDefinition.projectileSpeed
				: undefined,
			attack: isWeaponDefinition(displayDefinition) ? displayDefinition.attack : undefined,
			projectileVisual: isWeaponDefinition(displayDefinition)
				? displayDefinition.projectileVisual
				: undefined,
			activationKind: isUtilityDefinition(displayDefinition)
				? displayDefinition.activationKind
				: undefined,
			effectSummary: getLoadoutItemEffectSummary(displayDefinition),
			role: displayDefinition.role,
			isUpgradeable: isUpgradeableWeaponInstance(weapon, definition),
			nextUpgradeCost: isWeaponDefinition(definition)
				? getWeaponUpgradeCostForNextLevel(weapon, definition.rarity)
				: null,
			isMaxUpgradeLevel: getUpgradeLevel(weapon) >= MAX_WEAPON_UPGRADE_LEVEL,
			acquiredAt: weapon.acquiredAt,
			source: weapon.source,
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
		const existing = groups[weapon.groupId];

		if (!existing) {
			groups[weapon.groupId] = {
				groupId: weapon.groupId,
				definitionId: weapon.definitionId,
				definition: weapon.definition,
				category: weapon.category,
				name: weapon.name,
				upgradeLevel: weapon.upgradeLevel,
				totalScrapInvested: weapon.totalScrapInvested,
				isUpgraded: weapon.upgradeLevel > 0,
				bulkScrappable: weapon.definitionId !== starterWeaponId,
				isUpgradeable: weapon.isUpgradeable,
				nextUpgradeCost: weapon.nextUpgradeCost,
				isMaxUpgradeLevel: weapon.isMaxUpgradeLevel,
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
				representativeWeaponInstanceId: weapon.isEquipped ? null : weapon.weaponInstanceId,
				latestAcquiredAt: weapon.acquiredAt,
				latestAcquiredAtMs: Date.parse(weapon.acquiredAt) || 0,
				isNew: false
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

		const acquiredAtMs = Date.parse(weapon.acquiredAt) || 0;
		if (acquiredAtMs >= existing.latestAcquiredAtMs && weapon.source !== 'starter') {
			existing.latestAcquiredAt = weapon.acquiredAt;
			existing.latestAcquiredAtMs = acquiredAtMs;
		}
	}

	const groupRows = Object.values(groups).sort(
		(left, right) =>
			right.latestAcquiredAtMs - left.latestAcquiredAtMs ||
			rarityOrder[left.rarity] - rarityOrder[right.rarity] ||
			Number(left.category === 'utility') - Number(right.category === 'utility') ||
			right.availableCount - left.availableCount ||
			right.totalCount - left.totalCount ||
			left.name.localeCompare(right.name)
	);

	for (const [index, group] of groupRows.entries()) {
		group.isNew = index < 3 && group.latestAcquiredAtMs > 0;
	}

	return groupRows;
}

function compareInventoryGroups(
	left: InventoryWeaponGroup,
	right: InventoryWeaponGroup,
	sortMode: InventoryGroupSortMode,
	favoriteGroupIds: Set<string>
) {
	const leftFavorite = favoriteGroupIds.has(left.groupId);
	const rightFavorite = favoriteGroupIds.has(right.groupId);

	if (leftFavorite !== rightFavorite) {
		return Number(rightFavorite) - Number(leftFavorite);
	}

	switch (sortMode) {
		case 'rarity':
			return (
				rarityOrder[left.rarity] - rarityOrder[right.rarity] ||
				right.availableCount - left.availableCount ||
				right.totalCount - left.totalCount ||
				left.name.localeCompare(right.name)
			);
		case 'duplicates':
			return (
				right.totalCount - 1 - (left.totalCount - 1) ||
				right.availableCount - left.availableCount ||
				rarityOrder[left.rarity] - rarityOrder[right.rarity] ||
				left.name.localeCompare(right.name)
			);
		case 'size':
			return (
				left.shape.cells.length - right.shape.cells.length ||
				left.shape.width - right.shape.width ||
				left.shape.height - right.shape.height ||
				rarityOrder[left.rarity] - rarityOrder[right.rarity] ||
				left.name.localeCompare(right.name)
			);
		case 'name':
			return (
				left.name.localeCompare(right.name) ||
				rarityOrder[left.rarity] - rarityOrder[right.rarity] ||
				right.availableCount - left.availableCount
			);
		case 'recent':
		default:
			return (
				right.latestAcquiredAtMs - left.latestAcquiredAtMs ||
				rarityOrder[left.rarity] - rarityOrder[right.rarity] ||
				Number(left.category === 'utility') - Number(right.category === 'utility') ||
				right.availableCount - left.availableCount ||
				right.totalCount - left.totalCount ||
				left.name.localeCompare(right.name)
			);
	}
}

export function filterInventoryWeaponGroups(
	groups: InventoryWeaponGroup[],
	{
		query,
		favoriteGroupIds = new Set<string>(),
		favoritesOnly = false,
		duplicatesOnly = false,
		upgradedOnly = false,
		allowedRarities = new Set(Object.keys(rarityOrder) as WeaponDefinition['rarity'][]),
		sortMode = 'recent'
	}: InventoryGroupFilterOptions
) {
	const normalizedQuery = query.trim().toLowerCase();

	return groups
		.filter((group) => {
			if (!allowedRarities.has(group.rarity)) {
				return false;
			}

			if (favoritesOnly && !favoriteGroupIds.has(group.groupId)) {
				return false;
			}

			if (duplicatesOnly && group.totalCount < 2) {
				return false;
			}

			if (upgradedOnly && !group.isUpgraded) {
				return false;
			}

			if (!normalizedQuery) {
				return true;
			}

			const haystack = [
				group.name,
				group.role,
				group.effectSummary,
				group.category,
				group.rarity,
				group.totalCount > 1 ? 'duplicate duplicates' : '',
				group.isUpgraded ? 'upgraded upgrade' : '',
				favoriteGroupIds.has(group.groupId) ? 'favorite favourites' : ''
			]
				.join(' ')
				.toLowerCase();

			return haystack.includes(normalizedQuery);
		})
		.sort((left, right) => compareInventoryGroups(left, right, sortMode, favoriteGroupIds));
}

export function formatUpgradeLevel(value: number) {
	return `+${value}`;
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
			return `Adds shield equal to ${Math.round(definition.effect.shieldPercent * 100)}% of max health until broken`;
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
