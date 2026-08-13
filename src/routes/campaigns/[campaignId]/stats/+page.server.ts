import { toActionFailure, purchaseUpgradeForUser } from '$lib/server/campaign-route';

import type { Actions } from './$types';

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
