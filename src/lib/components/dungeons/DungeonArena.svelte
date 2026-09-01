<script lang="ts">
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import type { DungeonArenaSummary } from './types';

	interface Props {
		dungeonName: string;
		floorNumber: number | null;
		sketch: ((p: import('p5').default) => void) | null;
		sketchKey: string;
		statusLabel: string | null;
		statusTone: 'neutral' | 'danger';
		combatSummary: DungeonArenaSummary | null;
		healthRatio: number;
		shieldRatio: number;
		xpRatio: number;
		xpLabel: string;
	}

	let {
		dungeonName,
		floorNumber,
		sketch,
		sketchKey,
		statusLabel,
		statusTone,
		combatSummary,
		healthRatio,
		shieldRatio,
		xpRatio,
		xpLabel
	}: Props = $props();
</script>

<section class="arena-shell">
	<div class="arena-stage">
		{#if floorNumber !== null && sketch}
			{#key sketchKey}
				<P5Canvas class="canvas-frame" {sketch} />
			{/key}
		{:else}
			<div class="arena-placeholder">
				<div class="placeholder-ring"></div>
				<p class="placeholder-title">Arena sealed</p>
				<p class="placeholder-copy">
					Choose the active floor from the dungeon menu to open the central chamber.
				</p>
			</div>
		{/if}

		<div class="overlay-layout">
			{#if statusLabel}
				<div class={`status-overlay ${statusTone}`}>{statusLabel}</div>
			{/if}

			{#if combatSummary && floorNumber !== null}
				<div class="combat-panel">
					<p class="combat-title">{dungeonName} · Floor {floorNumber}</p>
					<div class="combat-summary-row">
						<div>
							<span>Remaining</span>
							<strong>{combatSummary.remainingEnemies}</strong>
						</div>
						<div>
							<span>Wave XP</span>
							<strong>{combatSummary.waveXp}</strong>
						</div>
						<div>
							<span>Status</span>
							<strong>{combatSummary.status}</strong>
						</div>
					</div>

					<div class="combat-bars">
						<div class="combat-bar-group">
							<div class="combat-bar-meta">
								<span>Health</span>
								<strong>
									{combatSummary.pixlHealth} / {combatSummary.maxPixlHealth}
									{#if combatSummary.pixlShieldPool > 0}
										<span
											class="combat-shield-label"
											style:--shield-color={combatSummary.shieldColor}
										>
											+{Math.ceil(combatSummary.pixlShieldPool)} shield
										</span>
									{/if}
								</strong>
							</div>
							<div class="combat-health">
								{#if combatSummary.pixlShieldPool > 0}
									<div
										class="combat-shield-fill"
										style:--shield-ratio={shieldRatio}
										style:--shield-color={combatSummary.shieldColor}
									></div>
								{/if}
								<div class="combat-health-fill" style:--health-ratio={healthRatio}></div>
							</div>
						</div>

						<div class="combat-bar-group">
							<div class="combat-bar-meta">
								<span>XP</span>
								<strong>{xpLabel}</strong>
							</div>
							<div class="combat-xp">
								<div class="combat-xp-fill" style:--xp-ratio={xpRatio}></div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>

<style>
	.arena-shell {
		min-width: 0;
		align-self: start;
	}

	.arena-stage {
		position: relative;
		width: 100%;
		min-height: clamp(24rem, 58vh, 40rem);
		height: clamp(24rem, 58vh, 40rem);
		overflow: hidden;
		border-radius: 1.5rem;
		background: #000;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
	}

	.overlay-layout {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: 1rem;
		padding: 1rem;
		pointer-events: none;
	}

	.arena-placeholder {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		align-content: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
	}

	.placeholder-ring {
		width: 9.5rem;
		height: 9.5rem;
		border-radius: 50%;
		border: 1px solid rgba(244, 187, 68, 0.25);
		box-shadow: 0 0 0 0.9rem rgba(244, 187, 68, 0.06);
	}

	.placeholder-title,
	.placeholder-copy {
		margin: 0;
	}

	.placeholder-title {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(1.9rem, 3.4vw, 2.4rem);
		color: #f7ead3;
	}

	.placeholder-copy {
		color: #cfcfcf;
		line-height: 1.5;
	}

	.combat-panel {
		position: relative;
		grid-column: 1;
		grid-row: 3;
		justify-self: center;
		align-self: end;
		width: min(28rem, calc(100% - 1.2rem));
		padding: 0.45rem 0.62rem 0.5rem;
		display: grid;
		gap: 0.28rem;
		background: rgba(6, 8, 12, 0.76);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1.25rem;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
		pointer-events: auto;
	}

	.combat-title,
	.combat-summary-row span,
	.combat-bar-meta span {
		margin: 0;
		text-transform: uppercase;
	}

	.combat-title {
		font-size: 0.58rem;
		letter-spacing: 0.18em;
		color: rgba(220, 224, 232, 0.84);
	}

	.combat-summary-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, max-content));
		justify-content: center;
		gap: 0.32rem 0.75rem;
	}

	.combat-summary-row div,
	.combat-bar-group {
		display: grid;
		gap: 0.08rem;
	}

	.combat-summary-row span {
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #9d9d9d;
	}

	.combat-summary-row strong {
		font-size: 0.88rem;
		color: #f5f5f5;
	}

	.combat-bars {
		display: grid;
		gap: 0.16rem;
	}

	.combat-bar-meta {
		display: flex;
		justify-content: space-between;
		gap: 0.6rem;
		align-items: baseline;
	}

	.combat-bar-meta span {
		font-size: 0.54rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		color: rgba(138, 189, 207, 0.88);
	}

	.combat-bar-meta strong {
		font-size: 0.64rem;
		color: #e4f7ff;
		text-align: right;
	}

	.combat-health,
	.combat-xp {
		overflow: hidden;
		border-radius: 999px;
	}

	.combat-health {
		position: relative;
		height: 0.2rem;
		background: rgba(255, 255, 255, 0.06);
	}

	.combat-shield-fill {
		position: absolute;
		inset: 0;
		width: calc(var(--shield-ratio) * 100%);
		border-radius: inherit;
		background: color-mix(in srgb, var(--shield-color) 80%, white 20%);
		opacity: 0.8;
	}

	.combat-health-fill {
		height: 100%;
		width: calc(var(--health-ratio) * 100%);
		border-radius: inherit;
		background: #ff3434;
	}

	.combat-shield-label {
		margin-left: 0.45rem;
		color: color-mix(in srgb, var(--shield-color) 75%, white 25%);
		font-size: 0.56rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.combat-xp {
		height: 0.18rem;
		background: rgba(93, 210, 255, 0.1);
	}

	.combat-xp-fill {
		height: 100%;
		width: calc(var(--xp-ratio) * 100%);
		border-radius: inherit;
		background: linear-gradient(90deg, #27d3ff, #6bf0c8);
	}

	.status-overlay {
		grid-column: 1;
		grid-row: 1;
		justify-self: center;
		align-self: start;
		margin-top: 0.25rem;
		padding: 0.5rem 0.95rem;
		border-radius: 999px;
		width: fit-content;
		max-width: min(42rem, 100%);
		background: rgba(0, 0, 0, 0.78);
		color: #f5f5f5;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-align: center;
	}

	.status-overlay.danger {
		color: #ff7a7a;
	}

	@media (max-width: 860px) {
		.arena-stage {
			min-height: clamp(20rem, 48vh, 30rem);
			height: clamp(20rem, 48vh, 30rem);
		}

		.combat-panel {
			width: min(19rem, calc(100% - 0.6rem));
			max-width: calc(100% - 0.6rem);
		}
	}

	@media (max-width: 640px) {
		.combat-summary-row {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			width: 100%;
		}
	}
</style>
