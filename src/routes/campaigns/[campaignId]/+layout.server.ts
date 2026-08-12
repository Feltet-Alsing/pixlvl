import { error } from '@sveltejs/kit';

import { loadCampaignRouteData } from '$lib/server/campaign-route';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const campaignId = Number(params.campaignId);

	if (!Number.isInteger(campaignId)) {
		throw error(404, 'Campaign not found');
	}

	try {
		return await loadCampaignRouteData(campaignId, locals.user?.id);
	} catch {
		throw error(404, 'Campaign not found');
	}
};
