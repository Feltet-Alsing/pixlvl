import { toActionFailure, selectStageForUser } from '$lib/server/campaign-route';

import type { Actions } from './$types';

export const actions: Actions = {
	selectStage: async ({ request, locals, params }) => {
		const campaignId = Number(params.campaignId);
		const result = await selectStageForUser(locals.user?.id, campaignId, await request.formData());

		return toActionFailure(result);
	}
};
