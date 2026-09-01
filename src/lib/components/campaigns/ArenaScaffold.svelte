<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		isMobileLayout: boolean;
		combatEnabled?: boolean;
		showUtility?: boolean;
		showDesktopStartRail?: boolean;
		showDesktopEndRail?: boolean;
		showMobilePanels?: boolean;
		shellClass?: string;
		shellStyle?: string;
		canvasClass?: string;
		canvasStyle?: string;
		desktopStartRailId?: string;
		utility?: Snippet;
		canvas: Snippet;
		overlay?: Snippet;
		desktopStartRail?: Snippet;
		desktopEndRail?: Snippet;
		mobilePanels?: Snippet;
	}

	let {
		isMobileLayout,
		combatEnabled = false,
		showUtility = false,
		showDesktopStartRail = false,
		showDesktopEndRail = false,
		showMobilePanels = false,
		shellClass = '',
		shellStyle = '',
		canvasClass = '',
		canvasStyle = '',
		desktopStartRailId,
		utility,
		canvas,
		overlay,
		desktopStartRail,
		desktopEndRail,
		mobilePanels
	}: Props = $props();
</script>

<div
	class={['arena-shell', showUtility && utility ? 'has-utility' : 'no-utility', shellClass]}
	style={shellStyle}
>
	{#if showUtility && utility}
		<div class="utility-bar">
			<div class="utility-secondary">
				{@render utility()}
			</div>
		</div>
	{/if}

	<div class={['arena-layout', combatEnabled ? 'combat-enabled' : '']}>
		<section class={['canvas-stage', canvasClass]} style={canvasStyle}>
			{@render canvas()}

			{#if overlay}
				<div class="overlay-layout">
					{@render overlay()}
				</div>
			{/if}
		</section>

		{#if !isMobileLayout && showDesktopStartRail && desktopStartRail}
			<div class="desktop-panel-rail desktop-panel-rail-float-start" id={desktopStartRailId}>
				{@render desktopStartRail()}
			</div>
		{/if}

		{#if !isMobileLayout && showDesktopEndRail && desktopEndRail}
			<div class="desktop-panel-rail desktop-panel-rail-end">
				{@render desktopEndRail()}
			</div>
		{/if}
	</div>

	{#if isMobileLayout && showMobilePanels && mobilePanels}
		<div class="mobile-panel-stack">
			{@render mobilePanels()}
		</div>
	{/if}
</div>

<style>
	.arena-shell {
		width: 100%;
		max-width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		padding: 1rem;
		box-sizing: border-box;
	}

	.arena-shell.has-utility {
		grid-template-rows: auto minmax(0, 1fr);
	}

	.arena-shell.no-utility {
		grid-template-rows: minmax(0, 1fr);
	}

	.arena-layout {
		grid-column: 1;
		display: grid;
		grid-template-areas: 'canvas';
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
		min-width: 0;
		min-height: 0;
		position: relative;
	}

	.arena-shell.has-utility .arena-layout {
		grid-row: 2;
	}

	.arena-shell.no-utility .arena-layout {
		grid-row: 1;
	}

	.arena-layout.combat-enabled {
		grid-template-areas: 'canvas';
		grid-template-columns: minmax(0, 1fr);
	}

	.utility-bar,
	.utility-secondary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.utility-bar {
		grid-column: 1;
		grid-row: 1;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		justify-content: flex-end;
		pointer-events: auto;
	}

	.utility-secondary {
		flex: 1 1 auto;
		justify-content: flex-end;
		min-width: 0;
		max-width: 100%;
	}

	.canvas-stage {
		grid-area: canvas;
		position: relative;
		width: 100%;
		height: var(--arena-stage-height, 100%);
		min-width: 0;
		min-height: var(--arena-stage-min-height, 0);
		transform: translateY(var(--arena-stage-offset-y, 0));
		overflow: hidden;
		border-radius: 1.5rem;
		touch-action: pan-y;
		background: var(--arena-stage-background, transparent);
		border: var(--arena-stage-border, none);
		box-shadow: var(--arena-stage-shadow, none);
	}

	.overlay-layout {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: 1rem;
		padding: 1rem;
		pointer-events: none;
	}

	.desktop-panel-rail {
		display: grid;
		align-content: start;
		gap: 1rem;
		min-width: 0;
		min-height: 0;
	}

	.desktop-panel-rail-float-start {
		position: absolute;
		left: 1rem;
		top: 1rem;
		z-index: 5;
		width: min(24rem, calc(100% - 2rem));
		max-width: 100%;
		max-height: calc(100% - 2rem);
		display: grid;
		align-content: start;
		gap: 0.75rem;
		overflow-y: auto;
		padding-right: 0.2rem;
		pointer-events: auto;
	}

	.desktop-panel-rail-end {
		position: absolute;
		right: 1rem;
		top: 1rem;
		z-index: 5;
		width: min(24rem, calc(100% - 2rem));
		max-width: 100%;
		max-height: calc(100% - 2rem);
		overflow-y: auto;
		padding-right: 0.2rem;
		pointer-events: auto;
	}

	.mobile-panel-stack {
		display: grid;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		gap: 0.75rem;
		align-content: start;
		justify-items: stretch;
	}

	:global(.canvas-frame) {
		width: 100%;
		height: 100%;
		background: #000000;
		touch-action: pan-y;
	}

	:global(.canvas-frame canvas) {
		display: block;
		width: 100%;
		height: 100%;
	}

	@media (min-width: 861px) {
		.mobile-panel-stack {
			display: none;
		}
	}

	@media (max-width: 860px) {
		.mobile-panel-stack {
			padding-bottom: 1.25rem;
		}

		.arena-shell,
		.arena-shell.preview-enabled {
			height: auto;
			min-height: 100%;
			grid-template-columns: 1fr;
			grid-template-rows: auto auto minmax(0, auto);
			gap: 0.75rem;
			padding: 0.75rem;
		}

		.utility-bar {
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem;
		}

		.utility-secondary {
			width: 100%;
			justify-content: center;
		}

		.overlay-layout {
			grid-template-columns: 1fr;
		}

		.canvas-stage {
			height: var(--arena-stage-mobile-height, auto);
			min-height: 0;
			transform: translateY(var(--arena-stage-mobile-offset-y, var(--arena-stage-offset-y, 0)));
			overflow: hidden;
			max-width: 100%;
			width: 100%;
			justify-self: center;
		}

		.canvas-stage :global(.canvas-frame) {
			height: auto;
			min-height: 15rem;
			aspect-ratio: 1 / 0.92;
			width: 100%;
			max-width: 100%;
			margin: 0 auto;
			border-radius: inherit;
			overflow: hidden;
		}
	}
</style>
