<script lang="ts">
	interface Props {
		stage: number;
		stageLevel: number;
		campaignLevel: number;
		onCancel: () => void;
		onConfirm: () => void;
	}

	let { stage, stageLevel, campaignLevel, onCancel, onConfirm }: Props = $props();
</script>

<button
	class="save-warning-backdrop"
	type="button"
	aria-label="Cancel loadout save"
	onclick={onCancel}
></button>
<div
	class="save-warning-modal"
	role="dialog"
	aria-modal="true"
	aria-labelledby="save-warning-title"
>
	<h3 id="save-warning-title">Apply new loadout?</h3>
	<p>
		The campaign keeps running while you are on this screen. Saving a new loadout will apply the
		changes and restart the current level from the beginning.
	</p>
	<p class="save-warning-meta">
		Current run: Stage {stage} · Level {stageLevel} · Campaign level {campaignLevel}
	</p>
	<div class="save-warning-actions">
		<button class="ghost" type="button" onclick={onCancel}>Cancel</button>
		<button class="save" type="button" onclick={onConfirm}>Save and restart level</button>
	</div>
</div>

<style>
	.save-warning-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.62);
		z-index: 19;
	}

	.save-warning-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(32rem, calc(100vw - 2rem));
		padding: 1.1rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(10, 10, 12, 0.98);
		box-shadow: 0 28px 72px rgba(0, 0, 0, 0.5);
		display: grid;
		gap: 0.8rem;
		z-index: 20;
	}

	.save-warning-modal h3,
	.save-warning-modal p {
		margin: 0;
	}

	.save-warning-meta {
		font-size: 0.84rem;
		color: #d3d3d8;
	}

	.save-warning-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.save,
	.ghost {
		min-height: 2.2rem;
		padding: 0 0.9rem;
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #f5f5f5;
		font: inherit;
		cursor: pointer;
	}

	.save {
		background: rgba(103, 217, 111, 0.14);
		border-color: rgba(103, 217, 111, 0.42);
	}

	.ghost {
		background: rgba(255, 255, 255, 0.04);
	}
</style>
