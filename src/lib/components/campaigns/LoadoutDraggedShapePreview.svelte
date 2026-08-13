<script lang="ts">
	import type { WeaponShape } from '$lib/data/types';

	interface Props {
		shape: WeaponShape;
	}

	let { shape }: Props = $props();

	function createIndexArray(length: number) {
		return Array.from({ length }, (_, index) => index);
	}

	function isShapeCellFilled(x: number, y: number) {
		return shape.cells.some(([cellX, cellY]) => cellX === x && cellY === y);
	}
</script>

<div class="weapon-shape-preview">
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
		display: grid;
		justify-items: center;
		text-align: center;
	}

	.shape-grid {
		display: grid;
		gap: 0.35rem;
		width: fit-content;
	}

	.shape-cell {
		aspect-ratio: 1;
		border-radius: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
	}

	.shape-cell.filled {
		background: rgba(255, 255, 255, 0.14);
	}
</style>
