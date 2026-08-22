<script lang="ts">
	import { formatDisplayNumber } from '$lib/number-format';

	interface Props {
		label: string;
		value: string | number;
		variant?: 'tile' | 'compact';
	}

	let { label, value, variant = 'tile' }: Props = $props();
	let formattedValue = $derived(
		typeof value === 'number' ? formatDisplayNumber(value) : value
	);
</script>

<div class={['stat-card', variant]}>
	<span>{label}</span>
	<strong>{formattedValue}</strong>
</div>

<style>
	.stat-card {
		padding: 0.85rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		gap: 0.25rem;
	}

	.stat-card span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	.stat-card strong {
		font-size: 1.2rem;
	}

	.stat-card.compact {
		padding: 0.8rem 0.9rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: baseline;
	}

	.stat-card.compact strong {
		font-size: 1rem;
		text-align: right;
	}
</style>
