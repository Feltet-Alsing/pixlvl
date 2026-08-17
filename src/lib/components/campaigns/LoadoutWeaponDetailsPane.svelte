<script lang="ts">
	interface DetailRow {
		label: string;
		value: string;
	}

	interface SelectedWeaponDetails {
		weaponInstanceId?: string;
		name: string;
		rarity: string;
		category: 'weapon' | 'utility';
		role: string;
		shapeLabel: string;
		rotationLabel?: string;
		targetingValue?: string;
		summary: string;
		isUpgradeable?: boolean;
		upgradeLevel?: number;
		nextUpgradeCost?: number | null;
		isMaxUpgradeLevel?: boolean;
		totalScrapInvested?: number;
		stats: DetailRow[];
		canRotate?: boolean;
		canChangeTargeting?: boolean;
	}

	interface Props {
		detail: SelectedWeaponDetails | null;
		signedIn?: boolean;
		onRotate?: () => void;
		targetingOptions?: Array<{ value: string; label: string }>;
		onTargetingChange?: (value: string) => void;
	}

	let {
		detail,
		signedIn = false,
		onRotate,
		targetingOptions = [],
		onTargetingChange
	}: Props = $props();
</script>

<section class="details-pane panel" aria-label="Selected weapon details">
	<div class="details-header">
		<h2>Weapon details</h2>
		{#if detail}
			<span class={`rarity-pill ${detail.rarity.toLowerCase()}`}>{detail.rarity}</span>
		{/if}
	</div>

	{#if detail}
		<div class="details-copy">
			<div>
				<h3>{detail.name}</h3>
				<p class="details-role">{detail.role}</p>
			</div>
			<p class="details-summary">{detail.summary}</p>
		</div>

		<div class="details-grid">
			<div class="detail-card">
				<span>Category</span>
				<strong>{detail.category}</strong>
			</div>
			<div class="detail-card">
				<span>Shape</span>
				<strong>{detail.shapeLabel}</strong>
			</div>
			{#if detail.rotationLabel}
				<div class="detail-card">
					<span>Rotation</span>
					<strong>{detail.rotationLabel}</strong>
				</div>
			{/if}
			{#each detail.stats as stat (stat.label)}
				<div class="detail-card">
					<span>{stat.label}</span>
					<strong>{stat.value}</strong>
				</div>
			{/each}
		</div>

		{#if detail.canChangeTargeting && detail.targetingValue && onTargetingChange}
			<label class="targeting-field">
				<span>Targeting</span>
				<select
					value={detail.targetingValue}
					onchange={(event) => onTargetingChange((event.currentTarget as HTMLSelectElement).value)}
				>
					{#each targetingOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
		{/if}

		{#if detail.canRotate && onRotate}
			<button class="rotate-button" type="button" onclick={onRotate}>Rotate 90°</button>
		{/if}

		{#if signedIn && detail.category === 'weapon' && detail.isUpgradeable && detail.weaponInstanceId}
			<form method="post" action="?/upgradeWeapon" class="upgrade-form">
				<input type="hidden" name="weaponInstanceId" value={detail.weaponInstanceId} />

				<div class="detail-card upgrade-card">
					<span>Upgrade</span>
					<strong>
						{#if detail.isMaxUpgradeLevel}
							Maxed at +5
						{:else if detail.nextUpgradeCost !== null && detail.nextUpgradeCost !== undefined}
							Next costs {detail.nextUpgradeCost} Scrap
						{:else}
							Not available
						{/if}
					</strong>
				</div>

				<button class="rotate-button" type="submit" disabled={detail.isMaxUpgradeLevel}
					>Upgrade weapon</button
				>
			</form>
		{/if}
	{:else}
		<p class="details-empty">Select a placed weapon or a toolbox item to inspect its full stats.</p>
	{/if}
</section>

<style>
	.panel {
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
	}

	.details-pane {
		padding: 0.8rem;
		display: grid;
		gap: 0.7rem;
	}

	.details-header {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: center;
	}

	h2,
	h3,
	p,
	span,
	strong {
		margin: 0;
	}

	h2 {
		font-size: 1rem;
	}

	h3 {
		font-size: 1.15rem;
	}

	.details-copy {
		display: grid;
		gap: 0.45rem;
	}

	.details-role,
	.details-summary,
	.details-empty {
		color: #c4c4c4;
	}

	.details-summary,
	.details-empty {
		font-size: 0.92rem;
		line-height: 1.45;
	}

	.details-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 0.55rem;
	}

	.targeting-field {
		display: grid;
		gap: 0.35rem;
	}

	.detail-card {
		padding: 0.65rem 0.7rem;
		border-radius: 0.8rem;
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.18rem;
	}

	.detail-card span,
	.rarity-pill,
	.targeting-field span {
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.detail-card span,
	.targeting-field span {
		color: #bdbdc3;
	}

	.detail-card strong {
		font-size: 0.94rem;
	}

	.rotate-button {
		min-height: 2.25rem;
		padding: 0.55rem 0.8rem;
		border-radius: 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.08);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
	}

	.upgrade-form {
		display: grid;
		gap: 0.55rem;
	}

	.upgrade-card {
		grid-column: 1 / -1;
	}

	.targeting-field select {
		min-height: 2.25rem;
		padding: 0.55rem 0.8rem;
		border-radius: 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.08);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.88rem;
	}

	.rarity-pill {
		padding: 0.3rem 0.55rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.05);
	}

	.rarity-pill.normal {
		color: #ececec;
	}

	.rarity-pill.magic {
		color: #8ac4ff;
	}

	.rarity-pill.rare {
		color: #ffe899;
	}

	.rarity-pill.exotic {
		color: #ffaaaa;
	}

	.rarity-pill.legendary {
		color: #e09c5c;
	}
</style>
