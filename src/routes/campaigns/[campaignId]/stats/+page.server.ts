import { redirect } from '@sveltejs/kit';

import { toActionFailure, purchaseUpgradeForUser } from '$lib/server/campaign-route';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	throw redirect(307, `${url.origin}/campaigns/${params.campaignId}?stats=open`);
};

export const actions: Actions = {
	purchaseUpgrade: async ({ request, locals, params }) => {
		const campaignId = Number(params.campaignId);
		const result = await purchaseUpgradeForUser(
			locals.user?.id,
			campaignId,
			await request.formData()
		);

		return toActionFailure(result);
	}
};
