<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { UpgradeOption } from '$lib/game/upgrades';

	interface Props {
		option: UpgradeOption;
		action?: string;
		enabledLabel?: string;
		disabledLabel?: string;
		variant?: 'default' | 'compact';
		submit?: SubmitFunction;
	}

	let {
		option,
		action = '?/purchaseUpgrade',
		enabledLabel = `Spend point on ${option.label}`,
		disabledLabel = 'No perk points',
		variant = 'default',
		submit
	}: Props = $props();
</script>

<form
	class={['upgrade-card', variant === 'compact' && 'compact']}
	method="post"
	{action}
	use:enhance={submit}
>
	<input type="hidden" name="upgrade" value={option.key} />
	<div class="upgrade-head">
		<span>{option.label}</span>
		<strong>Rank {option.level}</strong>
	</div>
	<p>{option.description}</p>
	<small>Allocated {option.level} point{option.level === 1 ? '' : 's'}</small>
	<button class="purchase" type="submit" disabled={!option.canSpend}>
		{option.canSpend ? enabledLabel : disabledLabel}
	</button>
</form>

<style>
	.upgrade-card {
		padding: 0.9rem;
		display: grid;
		gap: 0.45rem;
		border-radius: 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 10, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
	}

	.upgrade-card.compact {
		gap: 0.4rem;
		padding: 0.8rem;
	}

	.upgrade-head {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: baseline;
	}

	.upgrade-head span {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: #9d9d9d;
		font-weight: 700;
	}

	p,
	small {
		margin: 0;
		color: #c4c4c4;
	}

	.purchase {
		width: 100%;
		min-height: 2rem;
		padding: 0.45rem 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: #f5f5f5;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.purchase:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
