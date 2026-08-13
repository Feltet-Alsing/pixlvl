import { buyShopItemForUser, toActionFailure } from '$lib/server/campaign-route';

import type { Actions } from './$types';

export const actions: Actions = {
	buyShopItem: async ({ request, locals }) => {
		const result = await buyShopItemForUser(locals.user?.id, await request.formData());

		return toActionFailure(result);
	}
};
