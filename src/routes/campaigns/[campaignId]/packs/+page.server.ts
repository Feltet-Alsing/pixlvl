import { fail } from '@sveltejs/kit';

import { getLoadoutItemDefinition } from '$lib/data';
import { openRewardPackForUser, openRewardPacksForUser } from '$lib/server/game-state';
import type { WeaponRarity } from '$lib/data/types';

import type { Actions } from './$types';

const rarityRank: Record<WeaponRarity, number> = {
	normal: 0,
	magic: 1,
	rare: 2,
	exotic: 3,
	legendary: 4
};

export const actions: Actions = {
	openPack: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { openPackError: 'Sign in to open reward packs.' });
		}

		const formData = await request.formData();
		const packId = formData.get('packId');

		if (typeof packId !== 'string' || packId.length === 0) {
			return fail(400, { openPackError: 'Invalid reward pack request.' });
		}

		try {
			const result = await openRewardPackForUser(locals.user.id, packId);
			const openedCards = result.pack.cards.map((card) => {
				const definition = getLoadoutItemDefinition(card.definitionId);

				return {
					definitionId: card.definitionId,
					name: definition.name,
					rarity: card.rarity,
					isGuaranteedSlot: card.isGuaranteedSlot,
					isNew: !result.alreadyOpened && result.newDefinitionIds.includes(card.definitionId)
				};
			});

			return {
				openPackSuccess: result.alreadyOpened
					? 'That pack was already opened.'
					: `Opened ${openedCards.length} cards.`,
				openedPack: {
					id: result.pack.id,
					campaignId: result.pack.campaignId,
					status: result.pack.status,
					openedAt: result.pack.openedAt,
					cards: openedCards
				}
			};
		} catch (error) {
			return fail(400, {
				openPackError:
					error instanceof Error ? error.message : 'Unable to open reward pack right now.'
			});
		}
	},
	openSelectedPacks: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { openPackError: 'Sign in to open reward packs.' });
		}

		const formData = await request.formData();
		const packIds = formData
			.getAll('packId')
			.filter((value): value is string => typeof value === 'string' && value.length > 0);

		if (packIds.length === 0) {
			return fail(400, { openPackError: 'Select at least one unopened pack.' });
		}

		try {
			const { results } = await openRewardPacksForUser(locals.user.id, packIds);
			const newlyOpenedResults = results.filter((result) => !result.alreadyOpened);
			const openedCards = newlyOpenedResults.flatMap((result) =>
				result.pack.cards.map((card) => {
					const definition = getLoadoutItemDefinition(card.definitionId);
					return {
						packId: result.pack.id,
						definitionId: card.definitionId,
						name: definition.name,
						rarity: card.rarity,
						isGuaranteedSlot: card.isGuaranteedSlot,
						isNew: result.newDefinitionIds.includes(card.definitionId),
						slotIndex: card.slotIndex
					};
				})
			);

			const topCards = [...openedCards]
				.sort(
					(left, right) =>
						Number(right.isNew) - Number(left.isNew) ||
						rarityRank[right.rarity] - rarityRank[left.rarity] ||
						Number(right.isGuaranteedSlot) - Number(left.isGuaranteedSlot) ||
						left.packId.localeCompare(right.packId) ||
						left.slotIndex - right.slotIndex
				)
				.slice(0, 10);

			const newCardCount = openedCards.filter((card) => card.isNew).length;

			return {
				openPackSuccess:
					newlyOpenedResults.length > 0
						? `Opened ${newlyOpenedResults.length} packs.`
						: 'Those packs were already opened.',
				openedPackBatch: {
					packCount: newlyOpenedResults.length,
					openedCardCount: openedCards.length,
					newCardCount,
					topCards
				}
			};
		} catch (error) {
			return fail(400, {
				openPackError:
					error instanceof Error ? error.message : 'Unable to open reward packs right now.'
			});
		}
	}
};
