import {
	placeLoadoutWeaponForUser,
	removeLoadoutPlacementForUser,
	toActionFailure
} from '$lib/server/campaign-route';

import type { Actions } from './$types';

export const actions: Actions = {
	placeLoadoutWeapon: async ({ request, locals, params }) => {
		const campaignId = Number(params.campaignId);
		const result = await placeLoadoutWeaponForUser(
			locals.user?.id,
			campaignId,
			await request.formData()
		);

		return toActionFailure(result);
	},
	removeLoadoutPlacement: async ({ request, locals, params }) => {
		const campaignId = Number(params.campaignId);
		const result = await removeLoadoutPlacementForUser(
			locals.user?.id,
			campaignId,
			await request.formData()
		);

		return toActionFailure(result);
	}
};
