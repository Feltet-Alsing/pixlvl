import { error } from '@sveltejs/kit';

import { getCampaign, getCampaignCombatProfile } from '$lib/data';
import { getCampaignProgressForUser, getOrCreateGameState } from '$lib/server/game-state';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const campaignId = Number(params.campaignId);

	if (!Number.isInteger(campaignId)) {
		throw error(404, 'Campaign not found');
	}

	try {
		const campaign = getCampaign(campaignId);
		const combatProfile = getCampaignCombatProfile(campaignId);
		const gameState = locals.user ? await getOrCreateGameState(locals.user.id) : null;
		const campaignState = locals.user
			? await getCampaignProgressForUser(locals.user.id, campaignId)
			: null;

		return {
			campaignId,
			campaign,
			combatProfile,
			gameState,
			campaignState
		};
	} catch {
		throw error(404, 'Campaign not found');
	}
};