<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import DungeonArena from '$lib/components/dungeons/DungeonArena.svelte';
	import DungeonDamageOverlay from '$lib/components/dungeons/DungeonDamageOverlay.svelte';
	import DungeonStageMenu from '$lib/components/dungeons/DungeonStageMenu.svelte';
	import type {
		DungeonArenaSummary,
		DungeonCombatStatus,
		DungeonFloorMenuItem,
		DungeonWeaponDamageRow
	} from '$lib/components/dungeons/types';
	import type { CampaignDefinition, CombatProfile, DungeonDefinition } from '$lib/data/types';
	import { createUpgradeablePixlState, getXpProgress } from '$lib/game/upgrades';
	import {
		createArenaCombatSketch,
		createLoadoutSweepPreviewSketch
	} from '$lib/p5/arena-combat-sketch';
	import type { GameState, PersistedDungeonProgress } from '$lib/server/game-state';

	interface DungeonPageData {
		dungeonId: number;
		dungeon: DungeonDefinition;
		sourceCampaign: CampaignDefinition;
		combatProfile: CombatProfile;
		gameState: GameState | null;
		dungeonState: PersistedDungeonProgress | null;
	}

	type CombatStatus = 'idle' | DungeonCombatStatus;
	const LEVEL_COMPLETE_DIALOG_DURATION_MS = 2400;

	interface LevelTransitionDialogState {
		title: string;
		message: string;
		countdownLabel: string;
	}

	interface DungeonCombatOverlay {
		stage: number;
		stageLevel: number;
		campaignLevel: number;
		pixlHealth: number;
		maxPixlHealth: number;
		pixlShieldPool: number;
		shieldColor: string;
		bankedXp: number;
		waveXp: number;
		statusTimerRemaining: number;
		remainingEnemies: number;
		latestCompletedCycle: number;
		weaponDamageRows: DungeonWeaponDamageRow[];
		status: DungeonCombatStatus;
	}

	const fallbackProgress = {
		currentFloor: 1,
		highestUnlockedFloor: 1,
		highestClearedFloor: 0,
		runActive: false,
		completed: false
	} satisfies Pick<
		PersistedDungeonProgress,
		'currentFloor' | 'highestUnlockedFloor' | 'highestClearedFloor' | 'runActive' | 'completed'
	>;

	let { data }: { data: DungeonPageData } = $props();
	let selectedFloorCandidate = $state<number | null>(null);
	let requestInFlight = $state(false);
	let actionMessage = $state('');
	let actionError = $state('');
	let combatStatus = $state<CombatStatus>('idle');
	let handledOutcomeKey = $state('');
	let combatOverlay = $state.raw<DungeonCombatOverlay | null>(null);
	let levelTransitionDialog = $state<LevelTransitionDialogState | null>(null);

	let levelTransitionInterval: ReturnType<typeof setInterval> | null = null;
	let levelTransitionTimeout: ReturnType<typeof setTimeout> | null = null;

	let progress = $derived(data.dungeonState ?? fallbackProgress);
	let remainingKeys = $derived(data.gameState?.pixlState.dungeonKeys[data.dungeon.keyId] ?? 0);
	let floorNumbers = $derived(
		Array.from({ length: data.dungeon.totalLevels }, (_, index) => index + 1)
	);
	let currentFloor = $derived(progress.currentFloor);
	let highestUnlockedFloor = $derived(progress.highestUnlockedFloor);
	let highestClearedFloor = $derived(progress.highestClearedFloor);
	let hasActiveRun = $derived(progress.runActive);
	let canStartRun = $derived(Boolean(data.gameState) && !hasActiveRun && remainingKeys > 0);
	let selectedFloor = $derived(
		hasActiveRun && selectedFloorCandidate === currentFloor ? selectedFloorCandidate : null
	);
	let selectedDungeonFloor = $derived.by(() => {
		if (selectedFloor === null) {
			return null;
		}

		return data.dungeon.floors.find((floor) => floor.floor === selectedFloor) ?? null;
	});
	let previewPixlState = $derived(data.gameState?.pixlState ?? null);
	let syntheticCampaign = $derived.by(() => {
		if (!selectedDungeonFloor) {
			return null;
		}

		return {
			campaign: data.sourceCampaign.campaign,
			name: `${data.dungeon.name} Floor ${selectedDungeonFloor.floor}`,
			mode: 'campaign',
			stages: 1,
			levelsPerStage: 1,
			totalLevels: 1,
			combatProfile: data.combatProfile.id,
			baseline: data.sourceCampaign.baseline,
			levels: data.sourceCampaign.levels.slice(0, 1)
		} satisfies CampaignDefinition;
	});
	let runSignature = $derived(
		`${hasActiveRun ? currentFloor : 0}:${highestUnlockedFloor}:${highestClearedFloor}:${remainingKeys}`
	);
	let combatSketchKey = $derived(
		`${data.dungeonId}:${selectedFloor ?? 'sealed'}:${currentFloor}:${highestClearedFloor}:${requestInFlight ? 'busy' : 'ready'}`
	);
	let currentFloorSummary = $derived.by(() => {
		if (!selectedDungeonFloor) {
			return null;
		}

		const compositionSummary = Object.entries(selectedDungeonFloor.composition)
			.filter(([, count]) => (count ?? 0) > 0)
			.map(([kind, count]) => `${kind} ${count}`)
			.join(' · ');

		return {
			enemies: selectedDungeonFloor.totalEnemies,
			spawnRate: selectedDungeonFloor.spawnRatePerSecond,
			compositionSummary
		};
	});
	let currentFloorDetail = $derived.by(() => {
		if (!selectedDungeonFloor || !currentFloorSummary) {
			return null;
		}

		const parts = [
			`Floor ${selectedDungeonFloor.floor}`,
			`${currentFloorSummary.enemies} enemies`,
			`${currentFloorSummary.spawnRate.toFixed(2)}/s`
		];

		if (currentFloorSummary.compositionSummary) {
			parts.push(currentFloorSummary.compositionSummary);
		}

		return parts.join(' · ');
	});
	let combatStatusLabel = $derived.by(() => {
		const activeStatus = combatOverlay?.status ?? combatStatus;

		if (activeStatus === 'complete' && !requestInFlight) {
			return 'LEVEL COMPLETE';
		}

		if (requestInFlight && (activeStatus === 'complete' || activeStatus === 'defeated')) {
			return activeStatus === 'complete'
				? 'Sealing floor clear...'
				: 'Casting you out of the ruin...';
		}

		if (activeStatus === 'defeated') {
			return 'PIXL DOWN';
		}

		return null;
	});
	let combatStatusTone = $derived<'danger' | 'neutral'>(
		(combatOverlay?.status ?? combatStatus) === 'defeated' ? 'danger' : 'neutral'
	);
	let upgradeState = $derived.by(() => {
		const basePixlState = data.gameState?.pixlState;

		return createUpgradeablePixlState({
			xp: combatOverlay?.bankedXp ?? basePixlState?.xp ?? 0,
			defence: basePixlState?.defence ?? 0,
			agility: basePixlState?.agility ?? 0
		});
	});
	let currentXpProgress = $derived(getXpProgress(upgradeState));
	let resolvedCombatOverlay = $derived.by(() => ({
		stage: combatOverlay?.stage ?? 1,
		stageLevel: combatOverlay?.stageLevel ?? selectedDungeonFloor?.floor ?? 1,
		campaignLevel: combatOverlay?.campaignLevel ?? selectedDungeonFloor?.floor ?? 1,
		pixlHealth: combatOverlay?.pixlHealth ?? upgradeState.health,
		maxPixlHealth: combatOverlay?.maxPixlHealth ?? upgradeState.health,
		pixlShieldPool: combatOverlay?.pixlShieldPool ?? 0,
		shieldColor: combatOverlay?.shieldColor ?? '#8bd8ff',
		bankedXp: combatOverlay?.bankedXp ?? data.gameState?.pixlState.xp ?? 0,
		waveXp: combatOverlay?.waveXp ?? 0,
		statusTimerRemaining: combatOverlay?.statusTimerRemaining ?? 0,
		remainingEnemies: combatOverlay?.remainingEnemies ?? 0,
		latestCompletedCycle: combatOverlay?.latestCompletedCycle ?? 0,
		weaponDamageRows: combatOverlay?.weaponDamageRows ?? [],
		status: combatOverlay?.status ?? 'running'
	}));
	let combatSummary = $derived.by((): DungeonArenaSummary | null => {
		if (!selectedDungeonFloor) {
			return null;
		}

		return {
			remainingEnemies: resolvedCombatOverlay.remainingEnemies,
			waveXp: resolvedCombatOverlay.waveXp,
			status: resolvedCombatOverlay.status,
			pixlHealth: resolvedCombatOverlay.pixlHealth,
			maxPixlHealth: resolvedCombatOverlay.maxPixlHealth,
			pixlShieldPool: resolvedCombatOverlay.pixlShieldPool,
			shieldColor: resolvedCombatOverlay.shieldColor
		};
	});
	let combatHealthRatio = $derived(
		resolvedCombatOverlay.maxPixlHealth > 0
			? resolvedCombatOverlay.pixlHealth / resolvedCombatOverlay.maxPixlHealth
			: 0
	);
	let combatShieldRatio = $derived(
		resolvedCombatOverlay.maxPixlHealth > 0
			? Math.min(1, resolvedCombatOverlay.pixlShieldPool / resolvedCombatOverlay.maxPixlHealth)
			: 0
	);
	let combatXpRatio = $derived(
		currentXpProgress.xpNeeded > 0
			? Math.min(1, Math.max(0, currentXpProgress.xpIntoLevel / currentXpProgress.xpNeeded))
			: 0
	);
	let combatXpLabel = $derived(
		`XP ${currentXpProgress.xpIntoLevel} / ${currentXpProgress.xpNeeded} · L${currentXpProgress.nextLevel} next`
	);
	let floorMenuItems = $derived.by((): DungeonFloorMenuItem[] => {
		return floorNumbers.map((floor) => {
			const cleared = floor <= highestClearedFloor;
			const unlocked = hasActiveRun && floor <= highestUnlockedFloor;
			const actionable = hasActiveRun && floor === currentFloor;
			const locked = !cleared && !unlocked;
			const selected = selectedFloor === floor;

			let caption = 'Sealed';
			let meta = 'Locked';

			if (cleared) {
				caption = 'Cleared';
				meta = 'Completed';
			} else if (actionable) {
				caption = 'Enter';
				meta = 'Current descent';
			} else if (unlocked) {
				caption = 'Open';
				meta = 'Available';
			} else if (!hasActiveRun && floor === 1 && remainingKeys > 0) {
				caption = 'Awaiting key';
				meta = 'Ready to start';
			}

			return {
				floor,
				label: `Floor ${floor}`,
				caption,
				meta,
				cleared,
				unlocked,
				actionable,
				locked,
				selected
			};
		});
	});
	let averageLevelDamageTotal = $derived.by(() => {
		if (resolvedCombatOverlay.weaponDamageRows.length === 0) {
			return 0;
		}

		return resolvedCombatOverlay.weaponDamageRows.reduce(
			(total, row) => total + row.averageDamagePerCycle,
			0
		);
	});
	let loadoutPreviewRemountKey = $derived.by(() => {
		if (!previewPixlState) {
			return `${data.dungeonId}:no-loadout`;
		}

		return `${data.dungeonId}:${previewPixlState.attackSpeed}:${previewPixlState.loadoutRows}:${previewPixlState.loadoutColumns}:${JSON.stringify(previewPixlState.loadoutPlacements)}:${previewPixlState.ownedWeapons.map((weapon) => `${weapon.instanceId}:${weapon.definitionId}`).join('|')}`;
	});

	function selectFloor(floor: number) {
		const floorItem = floorMenuItems.find((item) => item.floor === floor);

		if (requestInFlight || !floorItem?.actionable) {
			return;
		}

		actionError = '';
		actionMessage = '';
		combatStatus = 'running';
		selectedFloorCandidate = floor;
	}

	async function postDungeonAction(
		payload: { action: 'start' | 'fail' } | { action: 'clear-floor'; floor: number }
	) {
		const response = await fetch(`/api/game/dungeons/${data.dungeonId}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify(payload)
		});
		const responseData = (await response.json().catch(() => ({}))) as { message?: string };

		if (!response.ok) {
			throw new Error(responseData.message ?? 'Dungeon request failed.');
		}

		return responseData;
	}

	async function refreshDungeonState() {
		await invalidateAll();
	}

	function clearLevelTransitionDialog() {
		if (levelTransitionInterval) {
			clearInterval(levelTransitionInterval);
			levelTransitionInterval = null;
		}

		if (levelTransitionTimeout) {
			clearTimeout(levelTransitionTimeout);
			levelTransitionTimeout = null;
		}

		levelTransitionDialog = null;
	}

	async function showLevelTransitionDialog(currentFloorNumber: number, nextFloorNumber: number) {
		clearLevelTransitionDialog();

		const startedAt = Date.now();
		const getSecondsRemaining = () =>
			Math.max(1, Math.ceil((LEVEL_COMPLETE_DIALOG_DURATION_MS - (Date.now() - startedAt)) / 1000));

		const updateDialog = () => {
			const secondsRemaining = getSecondsRemaining();

			levelTransitionDialog = {
				title: `Floor ${currentFloorNumber} complete`,
				message: `Descending to Floor ${nextFloorNumber}`,
				countdownLabel: `Next floor in ${secondsRemaining}s`
			};
		};

		updateDialog();

		await new Promise<void>((resolve) => {
			levelTransitionInterval = setInterval(updateDialog, 150);
			levelTransitionTimeout = setTimeout(() => {
				clearLevelTransitionDialog();
				resolve();
			}, LEVEL_COMPLETE_DIALOG_DURATION_MS);
		});
	}

	async function handleStartRun() {
		if (!canStartRun || requestInFlight) {
			return;
		}

		requestInFlight = true;
		actionError = '';
		actionMessage = '';
		combatStatus = 'idle';
		combatOverlay = null;
		selectedFloorCandidate = null;

		try {
			const response = await postDungeonAction({ action: 'start' });
			actionMessage = response.message ?? 'Run started.';
			await refreshDungeonState();
		} catch (error) {
			actionError = error instanceof Error ? error.message : 'Unable to start run.';
		} finally {
			requestInFlight = false;
		}
	}

	async function resolveCombatOutcome(status: DungeonCombatStatus, floor: number) {
		if (status !== 'complete' && status !== 'defeated') {
			return;
		}

		const outcomeKey = `${runSignature}:${floor}:${status}`;

		if (requestInFlight || handledOutcomeKey === outcomeKey) {
			return;
		}

		handledOutcomeKey = outcomeKey;

		if (status === 'complete') {
			const nextFloorNumber = floor < data.dungeon.totalLevels ? floor + 1 : null;

			if (nextFloorNumber !== null) {
				await showLevelTransitionDialog(floor, nextFloorNumber);
			}
		}

		requestInFlight = true;
		actionError = '';

		try {
			const response =
				status === 'complete'
					? await postDungeonAction({ action: 'clear-floor', floor })
					: await postDungeonAction({ action: 'fail' });

			actionMessage =
				response.message ?? (status === 'complete' ? `Floor ${floor} cleared.` : 'Run failed.');
			await refreshDungeonState();

			if (status === 'complete' && floor < data.dungeon.totalLevels) {
				selectedFloorCandidate = floor + 1;
				combatStatus = 'running';
				combatOverlay = null;
			} else {
				selectedFloorCandidate = null;
			}
		} catch (error) {
			actionError = error instanceof Error ? error.message : 'Unable to update dungeon progress.';
		} finally {
			requestInFlight = false;
		}
	}

	function handleCombatStateChange(state: DungeonCombatOverlay) {
		combatStatus = state.status;
		combatOverlay = state;

		if (selectedFloor === null) {
			return;
		}

		if (state.status === 'complete' || state.status === 'defeated') {
			void resolveCombatOutcome(state.status, selectedFloor);
		}
	}

	let combatSketch = $derived.by(() => {
		if (!syntheticCampaign || !selectedDungeonFloor) {
			return null;
		}

		return (p: import('p5').default) =>
			createArenaCombatSketch(syntheticCampaign, data.combatProfile, {
				flowMode: 'campaign',
				runMode: 'combat',
				levelResolver: () => selectedDungeonFloor,
				rewardsEnabled: false,
				showLoadoutSketch: false,
				pixlState: previewPixlState,
				onCombatStateChange: handleCombatStateChange
			})(p);
	});
	let loadoutSweepPreviewSketch = $derived.by(() => {
		if (!previewPixlState) {
			return null;
		}

		return (p: import('p5').default) =>
			createLoadoutSweepPreviewSketch({
				pixlState: previewPixlState
			})(p);
	});

	function formatDamageValue(value: number) {
		return Number.isInteger(value)
			? value.toString()
			: value.toLocaleString(undefined, {
					minimumFractionDigits: 0,
					maximumFractionDigits: 2
				});
	}
</script>

<svelte:head>
	<title>{data.dungeon.name} | pixlvl</title>
	<meta
		name="description"
		content={`Dungeon hub for ${data.dungeon.name}, with five floors and a single active descent.`}
	/>
</svelte:head>

<div class="page">
	{#if levelTransitionDialog}
		<div class="level-transition-backdrop" aria-live="polite">
			<div class="level-transition-dialog">
				<p class="level-transition-kicker">Floor clear</p>
				<h2>{levelTransitionDialog.title}</h2>
				<p>{levelTransitionDialog.message}</p>
				<strong>{levelTransitionDialog.countdownLabel}</strong>
			</div>
		</div>
	{/if}

	<div class={['dungeon-layout', previewPixlState ? 'has-overlay' : '']}>
		<DungeonStageMenu
			title={data.dungeon.name}
			subtitle={`Dungeon ${data.dungeonId} · Source Campaign ${data.sourceCampaign.campaign}`}
			detailText={currentFloorDetail}
			keyCount={remainingKeys}
			floors={floorMenuItems}
			{selectedFloor}
			{canStartRun}
			{requestInFlight}
			{actionMessage}
			{actionError}
			onStartRun={handleStartRun}
			onSelectFloor={selectFloor}
			onClearSelection={() => (selectedFloorCandidate = null)}
		/>

		<DungeonArena
			dungeonName={`Dungeon ${data.dungeonId}`}
			floorNumber={selectedDungeonFloor?.floor ?? null}
			sketch={combatSketch}
			sketchKey={combatSketchKey}
			statusLabel={combatStatusLabel}
			statusTone={combatStatusTone}
			{combatSummary}
			healthRatio={combatHealthRatio}
			shieldRatio={combatShieldRatio}
			xpRatio={combatXpRatio}
			xpLabel={combatXpLabel}
		/>

		{#if previewPixlState}
			<DungeonDamageOverlay
				previewSketch={loadoutSweepPreviewSketch}
				previewKey={loadoutPreviewRemountKey}
				damageRows={resolvedCombatOverlay.weaponDamageRows}
				averageDamageTotal={averageLevelDamageTotal}
				latestCompletedCycle={resolvedCombatOverlay.latestCompletedCycle}
				{formatDamageValue}
			/>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background: #050505;
	}

	.page {
		position: relative;
		flex: 1;
		width: 100%;
		max-width: 100vw;
		min-height: 100%;
		overflow-x: hidden;
		overflow-y: auto;
		color: #f5f5f5;
	}

	.level-transition-backdrop {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(2, 3, 4, 0.48);
		backdrop-filter: blur(6px);
		pointer-events: none;
	}

	.level-transition-dialog {
		width: min(28rem, calc(100vw - 2rem));
		padding: 1.25rem 1.15rem;
		display: grid;
		gap: 0.45rem;
		text-align: center;
		border-radius: 1.2rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(8, 8, 10, 0.92);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
	}

	.level-transition-kicker,
	.level-transition-dialog h2,
	.level-transition-dialog p,
	.level-transition-dialog strong {
		margin: 0;
	}

	.level-transition-kicker {
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #a6a6a6;
	}

	.level-transition-dialog h2 {
		font-size: clamp(1.5rem, 4vw, 2.1rem);
		color: #f7ead3;
	}

	.level-transition-dialog p {
		color: #d1d1d1;
	}

	.level-transition-dialog strong {
		font-size: 0.92rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #f4bb44;
	}

	.dungeon-layout {
		display: grid;
		grid-template-columns: minmax(20rem, 24rem) minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
		padding: 1rem;
		box-sizing: border-box;
	}

	.dungeon-layout.has-overlay {
		grid-template-columns: minmax(20rem, 24rem) minmax(0, 1fr) minmax(20rem, 24rem);
	}

	@media (max-width: 860px) {
		.page {
			min-height: 100dvh;
			overflow-x: hidden;
			overflow-y: auto;
		}

		.dungeon-layout,
		.dungeon-layout.has-overlay {
			grid-template-columns: minmax(0, 1fr);
			grid-auto-rows: auto;
		}
	}
</style>
