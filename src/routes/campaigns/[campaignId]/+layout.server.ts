import { error } from '@sveltejs/kit';

import { loadCampaignRouteData } from '$lib/server/campaign-route';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals, url }) => {
	const campaignId = Number(params.campaignId);
	const acknowledgeRoute = url.pathname.endsWith('/stats')
		? 'stats'
		: url.pathname.includes('/loadout')
			? 'loadout'
			: null;

	if (!Number.isInteger(campaignId)) {
		throw error(404, 'Campaign not found');
	}

	try {
		return await loadCampaignRouteData(campaignId, locals.user?.id, acknowledgeRoute);
	} catch {
		throw error(404, 'Campaign not found');
	}
};
