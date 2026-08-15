<script lang="ts">
	import type { WeaponShape } from '$lib/data/types';

	interface Props {
		shape: WeaponShape;
		pointerX?: number;
		pointerY?: number;
	}

	let { shape, pointerX = 0, pointerY = 0 }: Props = $props();

	function createIndexArray(length: number) {
		return Array.from({ length }, (_, index) => index);
	}

	function isShapeCellFilled(x: number, y: number) {
		return shape.cells.some(([cellX, cellY]) => cellX === x && cellY === y);
	}
</script>

<div
	class="weapon-shape-preview"
	data-drag-preview
	style:left={`${pointerX}px`}
	style:top={`${pointerY}px`}
>
	<div class="shape-grid" style:grid-template-columns={`repeat(${shape.width}, 1fr)`}>
		{#each createIndexArray(shape.height) as shapeY (shapeY)}
			{#each createIndexArray(shape.width) as shapeX (shapeX)}
				<div class="shape-cell" class:filled={isShapeCellFilled(shapeX, shapeY)}></div>
			{/each}
		{/each}
	</div>
</div>

<style>
	.weapon-shape-preview {
		position: fixed;
		left: 0;
		top: 0;
		z-index: 60;
		display: grid;
		justify-items: center;
		text-align: center;
		padding: 0.4rem;
		border-radius: 0.9rem;
		background: rgba(4, 6, 10, 0.58);
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.34);
		backdrop-filter: blur(8px);
		pointer-events: none;
		transform: translate(-35%, -35%);
	}

	.shape-grid {
		display: grid;
		gap: 0.24rem;
		width: fit-content;
	}

	.shape-cell {
		aspect-ratio: 1;
		width: 1.35rem;
		border-radius: 0.35rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
	}

	.shape-cell.filled {
		background: rgba(103, 217, 111, 0.2);
		border-color: rgba(103, 217, 111, 0.72);
		box-shadow: inset 0 0 0 1px rgba(103, 217, 111, 0.18);
	}

	@media (max-width: 640px) {
		.shape-cell {
			width: 1.1rem;
		}
	}
</style>
