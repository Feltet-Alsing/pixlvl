import type { LoadoutPlacement, LoadoutRotation, WeaponShape } from '$lib/data/types';

export function normalizeLoadoutRotation(rotation: unknown): LoadoutRotation {
	return rotation === 1 || rotation === 2 || rotation === 3 ? rotation : 0;
}

export function getPlacementRotation(
	placement: Pick<LoadoutPlacement, 'rotation'> | { rotation?: unknown } | null | undefined
): LoadoutRotation {
	return normalizeLoadoutRotation(placement?.rotation);
}

export function cycleLoadoutRotation(rotation: LoadoutRotation, step = 1): LoadoutRotation {
	const normalizedStep = ((step % 4) + 4) % 4;
	return ((rotation + normalizedStep) % 4) as LoadoutRotation;
}

export function getLoadoutRotationDegrees(rotation: LoadoutRotation) {
	return rotation * 90;
}

export function getLoadoutRotationLabel(rotation: LoadoutRotation) {
	return `${getLoadoutRotationDegrees(rotation)}°`;
}

export function rotateWeaponShape(shape: WeaponShape, rotation: LoadoutRotation): WeaponShape {
	if (rotation === 0) {
		return {
			width: shape.width,
			height: shape.height,
			cells: [...shape.cells]
		};
	}

	const rotatedCells = shape.cells.map(([x, y]) => {
		switch (rotation) {
			case 1:
				return [shape.height - 1 - y, x] as [number, number];
			case 2:
				return [shape.width - 1 - x, shape.height - 1 - y] as [number, number];
			case 3:
				return [y, shape.width - 1 - x] as [number, number];
		}
	});

	const minX = Math.min(...rotatedCells.map(([x]) => x));
	const minY = Math.min(...rotatedCells.map(([, y]) => y));
	const normalizedCells = rotatedCells.map(([x, y]) => [x - minX, y - minY] as [number, number]);
	const maxX = Math.max(...normalizedCells.map(([x]) => x));
	const maxY = Math.max(...normalizedCells.map(([, y]) => y));

	return {
		width: maxX + 1,
		height: maxY + 1,
		cells: normalizedCells
	};
}
