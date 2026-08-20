import { fail } from '@sveltejs/kit';

import { getLoadoutItemDefinition } from '$lib/data';
import { openRewardPackForUser } from '$lib/server/game-state';

import type { Actions } from './$types';

export const actions: Actions = {
	openPack: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { openPackError: 'Sign in to open reward packs.' });
		}

		const campaignId = Number(params.campaignId);

		if (!Number.isInteger(campaignId)) {
			return fail(404, { openPackError: 'Campaign not found.' });
		}

		const formData = await request.formData();
		const packId = formData.get('packId');

		if (typeof packId !== 'string' || packId.length === 0) {
			return fail(400, { openPackError: 'Invalid reward pack request.' });
		}

		try {
			const result = await openRewardPackForUser(locals.user.id, packId, campaignId);
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
					: `Opened ${openedCards.length} cards from Campaign ${result.pack.campaignId}.`,
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
	}
};
