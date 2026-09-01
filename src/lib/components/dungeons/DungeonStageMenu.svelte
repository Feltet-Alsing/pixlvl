<script lang="ts">
	import type { DungeonFloorMenuItem } from './types';

	interface Props {
		title: string;
		subtitle: string;
		detailText?: string | null;
		keyCount: number;
		floors: DungeonFloorMenuItem[];
		selectedFloor: number | null;
		canStartRun: boolean;
		requestInFlight: boolean;
		actionMessage: string;
		actionError: string;
		onStartRun: () => void;
		onSelectFloor: (floor: number) => void;
		onClearSelection: () => void;
	}

	let {
		title,
		subtitle,
		detailText = null,
		keyCount,
		floors,
		selectedFloor,
		canStartRun,
		requestInFlight,
		actionMessage,
		actionError,
		onStartRun,
		onSelectFloor,
		onClearSelection
	}: Props = $props();
</script>

<section class="stage-menu panel" aria-label="Dungeon floors">
	<div class="copy-block">
		<p class="eyebrow">{subtitle}</p>
		<h2>{title}</h2>
		<p class="support-copy">Keys remaining: {keyCount}</p>
		{#if detailText}
			<p class="support-copy">{detailText}</p>
		{/if}
	</div>

	<div class="action-row">
		{#if canStartRun}
			<button
				class="pill-button pill-button-primary"
				type="button"
				onclick={onStartRun}
				disabled={requestInFlight}
			>
				{requestInFlight ? 'Turning key...' : 'Start run'}
			</button>
		{/if}

		{#if selectedFloor !== null}
			<button
				class="pill-button"
				type="button"
				onclick={onClearSelection}
				disabled={requestInFlight}
			>
				Close floor
			</button>
		{/if}
	</div>

	{#if actionMessage}
		<p class="feedback success">{actionMessage}</p>
	{/if}
	{#if actionError}
		<p class="feedback error">{actionError}</p>
	{/if}

	<div class="floor-list" role="list" aria-label="Dungeon floor selector">
		{#each floors as floor (floor.floor)}
			<button
				type="button"
				class={[
					'floor-button',
					floor.cleared && 'is-cleared',
					floor.unlocked && 'is-unlocked',
					floor.actionable && 'is-actionable',
					floor.locked && 'is-locked',
					floor.selected && 'is-selected'
				]}
				onclick={() => onSelectFloor(floor.floor)}
				disabled={!floor.actionable || requestInFlight}
				aria-pressed={floor.selected}
			>
				<span class="floor-number">{floor.label}</span>
				<strong>{floor.caption}</strong>
				<span class="floor-meta">{floor.meta}</span>
			</button>
		{/each}
	</div>
</section>

<style>
	.panel {
		background: rgba(10, 10, 10, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.25rem;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
		box-sizing: border-box;
	}

	.stage-menu {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
		height: fit-content;
		max-height: calc(100dvh - 2rem);
		overflow: auto;
	}

	.copy-block {
		display: grid;
		gap: 0.35rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #9d9d9d;
	}

	@media (max-width: 860px) {
		.stage-menu {
			height: auto;
			max-height: none;
		}
	}

	h2,
	.support-copy {
		margin: 0;
	}

	h2 {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(1.35rem, 2.2vw, 1.95rem);
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #f7ead3;
	}

	.support-copy,
	.floor-meta {
		color: #cfcfcf;
		line-height: 1.5;
		font-size: 0.85rem;
	}

	.action-row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.pill-button,
	.floor-button {
		font: inherit;
	}

	.pill-button {
		min-height: 2.5rem;
		padding: 0.65rem 0.95rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: #f5f5f5;
		cursor: pointer;
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			background 180ms ease;
	}

	.pill-button-primary {
		border-color: rgba(244, 187, 68, 0.32);
		background: rgba(244, 187, 68, 0.1);
		color: #f8e7b1;
	}

	.pill-button:hover:not(:disabled),
	.floor-button:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.pill-button:disabled,
	.floor-button:disabled {
		opacity: 0.68;
		cursor: not-allowed;
	}

	.feedback {
		margin: 0;
		padding: 0.8rem 0.95rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 0.9rem;
	}

	.feedback.success {
		background: rgba(255, 255, 255, 0.05);
		color: #f5f5f5;
	}

	.feedback.error {
		background: rgba(255, 96, 96, 0.08);
		border-color: rgba(255, 96, 96, 0.35);
		color: #ffb3b3;
	}

	.floor-list {
		display: grid;
		gap: 0.7rem;
	}

	.floor-button {
		display: grid;
		gap: 0.18rem;
		justify-items: start;
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: #f5f5f5;
		text-align: left;
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			background 180ms ease,
			box-shadow 180ms ease;
	}

	.floor-number {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #9d9d9d;
	}

	.floor-button strong {
		font-size: 0.92rem;
	}

	.floor-button.is-actionable,
	.floor-button.is-selected {
		border-color: rgba(244, 187, 68, 0.34);
		background: rgba(244, 187, 68, 0.08);
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
	}

	.floor-button.is-cleared {
		border-color: rgba(103, 217, 111, 0.22);
		background: rgba(103, 217, 111, 0.08);
	}

	.floor-button.is-locked {
		opacity: 0.74;
	}
</style>
