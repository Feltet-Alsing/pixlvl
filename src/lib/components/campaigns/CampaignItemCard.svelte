<script lang="ts">
	import type { Snippet } from 'svelte';

	import { isUtilityDefinition, isWeaponDefinition } from '$lib/data';
	import type {
		LoadoutItemDefinition,
		WeaponAttackBehavior,
		WeaponRarity,
		WeaponShape
	} from '$lib/data/types';

	interface MetaRow {
		label: string;
		value: string;
	}

	interface Props {
		definition: LoadoutItemDefinition;
		eyebrow?: string;
		title?: string;
		subtitle?: string;
		metaRows?: MetaRow[];
		headerStartLabel?: string;
		footer?: Snippet;
		size?: 'regular' | 'compact';
	}

	const rarityAccentById = {
		normal: '#f0f4f8',
		magic: '#aaceff',
		rare: '#ffe899',
		exotic: '#ffaaaa',
		legendary: '#e09c5c'
	} as const satisfies Record<WeaponRarity, string>;

	let {
		definition,
		eyebrow,
		title,
		subtitle,
		metaRows,
		headerStartLabel,
		footer,
		size = 'regular'
	}: Props = $props();

	let accentColor = $derived(getAccentColor(definition));
	let accentGlow = $derived(toAlphaColor(accentColor, 0.34));
	let accentSurface = $derived(toAlphaColor(accentColor, 0.16));
	let resolvedEyebrow = $derived(
		eyebrow ?? (isUtilityDefinition(definition) ? 'Utility' : 'Weapon')
	);
	let resolvedTitle = $derived(title ?? definition.name);
	let resolvedSubtitle = $derived(subtitle ?? definition.role);
	let resolvedMetaRows = $derived(metaRows?.length ? metaRows : buildDefaultMetaRows(definition));
	let resolvedHeaderStartLabel = $derived(headerStartLabel ?? '');
	let elementalRequirementLabel = $derived(getElementalRequirementLabel(definition));
	let stageSize = $derived(size === 'compact' ? 94 : 118);
	let shapeGridStyle = $derived(getShapeGridStyle(definition.shape, stageSize));

	function createIndexArray(length: number) {
		return Array.from({ length }, (_, index) => index);
	}

	function formatLabel(value: string) {
		return value
			.split(/[-\s]+/)
			.filter(Boolean)
			.map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
			.join(' ');
	}

	function isShapeCellFilled(shape: WeaponShape, x: number, y: number) {
		return shape.cells.some(([cellX, cellY]) => cellX === x && cellY === y);
	}

	function getAccentColor(item: LoadoutItemDefinition) {
		return rarityAccentById[item.rarity];
	}

	function getShapeGridStyle(shape: WeaponShape, nextStageSize: number) {
		const gap = nextStageSize <= 94 ? 4 : 5;
		const padding = nextStageSize <= 94 ? 12 : 14;
		const available = Math.max(24, nextStageSize - padding * 2);
		const maxSpan = Math.max(shape.width, shape.height, 1);
		const cellSize = Math.max(10, Math.floor((available - gap * (maxSpan - 1)) / maxSpan));
		const width = shape.width * cellSize + gap * Math.max(0, shape.width - 1);
		const height = shape.height * cellSize + gap * Math.max(0, shape.height - 1);

		return [
			`grid-template-columns: repeat(${shape.width}, ${cellSize}px)`,
			`grid-template-rows: repeat(${shape.height}, ${cellSize}px)`,
			`gap: ${gap}px`,
			`width: ${width}px`,
			`height: ${height}px`
		].join('; ');
	}

	function buildDefaultMetaRows(item: LoadoutItemDefinition): MetaRow[] {
		if (isWeaponDefinition(item)) {
			return [
				...(item.attack.requiredInfusion
					? [
							{
								label: 'Infusion',
								value: getElementalRequirementLabel(item) ?? 'Required'
							}
						]
					: []),
				{ label: 'Damage', value: item.baseDamage.toString() },
				{
					label: 'Volley',
					value: `${item.attack.projectileCount}x ${formatAttackLabel(item.attack)}`
				},
				{ label: 'Cycle', value: formatCycleLabel(item.attack.cycleInterval) }
			];
		}

		return [
			{ label: 'Mode', value: item.activationKind === 'passive' ? 'Passive' : 'Triggered' },
			{ label: 'Cycle', value: formatCycleLabel(item.cycleInterval) },
			{ label: 'Effect', value: formatUtilityEffect(item) }
		];
	}

	function getElementalRequirementLabel(item: LoadoutItemDefinition) {
		if (!isWeaponDefinition(item) || !item.attack.requiredInfusion) {
			return null;
		}

		const requiredCount = Math.max(1, item.attack.requiredInfusionCount ?? 1);
		const infusionLabel = formatLabel(item.attack.requiredInfusion);
		return `${requiredCount} ${infusionLabel} infusion${requiredCount === 1 ? '' : 's'}`;
	}

	function formatAttackLabel(attack: WeaponAttackBehavior) {
		switch (attack.kind) {
			case 'single':
				return 'single';
			case 'dual':
				return 'dual';
			case 'spread':
				return 'spread';
			default:
				return attack.kind;
		}
	}

	function formatCycleLabel(cycleInterval: number | undefined) {
		const cycleCount = Math.max(1, cycleInterval ?? 1);
		return `${cycleCount} cyc`;
	}

	function formatUtilityEffect(item: Extract<LoadoutItemDefinition, { category: 'utility' }>) {
		switch (item.effect.type) {
			case 'shield-pool':
				return `Shield ${Math.round(item.effect.shieldPercent * 200)}%`;
			case 'mine-shield-turret':
				return `Mine shield ${Math.round(item.effect.shieldRatioFromMineDamage * 200)}%`;
			case 'elemental-infuser':
				return `${formatLabel(item.effect.element)} infusion`;
			case 'cycle-adjacency-reduction':
				return `Adj -${item.effect.reduction}`;
			case 'cycle-damage-boost':
				return `${item.effect.damageMultiplier}x boost`;
			case 'elemental-cycle-boost':
				return `${item.effect.damageMultiplier}x ${formatLabel(item.effect.element)}`;
			case 'elemental-mastery':
				return `${item.effect.damageMultiplier}x mastery`;
			case 'hemorrhage-burst':
				return 'Bleed ricochet';
			case 'bleed-catalyst':
				return `${item.effect.multiplier}x bleed`;
			case 'knife-ricochet-fork':
				return 'Ricochet fork';
			case 'knife-siphon':
				return 'Socketed Knife leech';
			case 'mine-trigger-echo':
				return 'Mine echo';
			case 'mine-gravity-augment':
				return 'Mine gravity';
			case 'oathbreaker-sigil':
				return 'Shared damage zone';
			case 'mirror-array':
				return 'Projectile mirror';
		}

		return 'Utility';
	}

	function toAlphaColor(color: string, alpha: number) {
		if (/^#[0-9a-f]{6}$/i.test(color)) {
			const red = Number.parseInt(color.slice(1, 3), 16);
			const green = Number.parseInt(color.slice(3, 5), 16);
			const blue = Number.parseInt(color.slice(5, 7), 16);
			return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
		}

		if (/^#[0-9a-f]{3}$/i.test(color)) {
			const expanded = color
				.slice(1)
				.split('')
				.map((channel) => channel + channel)
				.join('');
			return toAlphaColor(`#${expanded}`, alpha);
		}

		return `rgba(255, 255, 255, ${alpha})`;
	}
</script>

<article
	class={`campaign-item-card size-${size} rarity-${definition.rarity}`}
	style:--item-accent={accentColor}
	style:--item-glow={accentGlow}
	style:--item-surface={accentSurface}
>
	<div class="card-header">
		{#if resolvedHeaderStartLabel}
			<span class="header-pill">{resolvedHeaderStartLabel}</span>
		{/if}
		<div class="card-heading">
			<p class="card-eyebrow">{elementalRequirementLabel ? 'Elemental weapon' : resolvedEyebrow}</p>
			<strong>{resolvedTitle}</strong>
			{#if elementalRequirementLabel}
				<span class="elemental-pill">{elementalRequirementLabel}</span>
			{/if}
		</div>
		<span class="rarity-pill">{formatLabel(definition.rarity)}</span>
	</div>

	<div class="shape-stage">
		<div class="shape-backdrop"></div>
		<div class="shape-frame">
			<div class="shape-grid" style={shapeGridStyle}>
				{#each createIndexArray(definition.shape.height) as shapeY (`card:${definition.id}:${shapeY}`)}
					{#each createIndexArray(definition.shape.width) as shapeX (`card:${definition.id}:${shapeY}:${shapeX}`)}
						<div
							class="shape-cell"
							class:filled={isShapeCellFilled(definition.shape, shapeX, shapeY)}
						></div>
					{/each}
				{/each}
			</div>
		</div>
	</div>

	<div class="card-copy">
		<p class="card-subtitle">{resolvedSubtitle}</p>
		<div class="meta-grid">
			{#each resolvedMetaRows as row (row.label)}
				<div class="meta-cell">
					<span>{row.label}</span>
					<strong>{row.value}</strong>
				</div>
			{/each}
		</div>
	</div>

	{#if footer}
		<div class="card-footer">
			{@render footer()}
		</div>
	{/if}
</article>

<style>
	.campaign-item-card {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		display: grid;
		gap: 0.75rem;
		padding: 0.82rem;
		border-radius: 1.05rem;
		border: 1px solid color-mix(in srgb, var(--item-accent) 24%, rgba(255, 255, 255, 0.08));
		background:
			radial-gradient(circle at top, var(--item-glow), transparent 56%),
			linear-gradient(180deg, rgba(8, 8, 12, 0.98), rgba(5, 5, 8, 0.96));
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
		color: #f5f5f5;
		overflow: hidden;
	}

	.campaign-item-card.size-compact {
		gap: 0.65rem;
		padding: 0.72rem;
		border-radius: 0.95rem;
	}

	.article,
	p,
	strong,
	span {
		margin: 0;
	}

	.card-header,
	.card-heading,
	.card-copy,
	.card-footer {
		display: grid;
		gap: 0.45rem;
	}

	.card-header {
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: start;
		gap: 0.7rem;
	}

	.card-eyebrow,
	.meta-cell span,
	.header-pill,
	.rarity-pill,
	.elemental-pill {
		font-size: 0.66rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.card-eyebrow {
		color: color-mix(in srgb, var(--item-accent) 68%, white);
		font-weight: 700;
	}

	.card-heading strong {
		display: block;
		font-size: 1rem;
		line-height: 1.05;
		word-break: break-word;
	}

	.size-compact .card-heading strong {
		font-size: 0.92rem;
	}

	.elemental-pill {
		display: inline-flex;
		justify-self: start;
		align-items: center;
		padding: 0.24rem 0.5rem;
		border-radius: 999px;
		border: 1px solid rgba(103, 217, 111, 0.38);
		background: rgba(103, 217, 111, 0.12);
		color: #c9f8cc;
		font-weight: 700;
		white-space: nowrap;
	}

	.header-pill,
	.rarity-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem 0.58rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--item-accent) 38%, white);
		background: color-mix(in srgb, var(--item-accent) 16%, transparent);
		color: color-mix(in srgb, var(--item-accent) 72%, white);
		font-weight: 700;
		white-space: nowrap;
	}

	.header-pill {
		min-width: 1.9rem;
	}

	.shape-stage {
		position: relative;
		display: grid;
		place-items: center;
		min-width: 0;
	}

	.shape-frame {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 7.4rem;
		aspect-ratio: 1;
		padding: 0.8rem;
		display: grid;
		place-items: center;
		box-sizing: border-box;
	}

	.size-compact .shape-frame {
		max-width: 5.9rem;
		padding: 0.7rem;
	}

	.shape-backdrop {
		position: absolute;
		inset: 0;
		border-radius: 0.92rem;
		background:
			radial-gradient(circle at center, var(--item-surface), transparent 72%),
			linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01));
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.shape-grid {
		position: relative;
		z-index: 1;
		display: grid;
		justify-content: center;
		align-content: center;
	}

	.shape-cell {
		aspect-ratio: 1;
		border-radius: 0.48rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
	}

	.size-compact .shape-cell {
		border-radius: 0.36rem;
	}

	.shape-cell.filled {
		border-color: color-mix(in srgb, var(--item-accent) 58%, white);
		background: linear-gradient(
			145deg,
			color-mix(in srgb, var(--item-accent) 78%, white),
			var(--item-accent)
		);
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.05) inset,
			0 0 24px var(--item-glow);
	}

	.card-subtitle {
		color: #ededf1;
		font-size: 0.88rem;
		line-height: 1.3;
	}

	.size-compact .card-subtitle {
		font-size: 0.82rem;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.meta-cell {
		padding: 0.56rem;
		border-radius: 0.8rem;
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.16rem;
		min-width: 0;
	}

	.meta-cell span {
		color: #bdbdc3;
	}

	.meta-cell strong {
		font-size: 0.8rem;
		line-height: 1.2;
		word-break: break-word;
	}

	.size-compact .meta-cell {
		padding: 0.48rem;
	}

	.size-compact .meta-cell strong {
		font-size: 0.75rem;
	}

	.card-footer {
		padding-top: 0.1rem;
	}

	@media (max-width: 640px) {
		.meta-grid {
			grid-template-columns: 1fr;
		}

		.shape-frame {
			max-width: 6.5rem;
		}

		.size-compact .shape-frame {
			max-width: 5.5rem;
		}
	}
</style>
