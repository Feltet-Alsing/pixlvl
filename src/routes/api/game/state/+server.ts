import { json } from '@sveltejs/kit';

import { getOrCreateGameState, updateGameState, type GameStatePatch } from '$lib/server/game-state';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const gameState = await getOrCreateGameState(locals.user.id);

	return json(gameState);
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	let body: GameStatePatch | null = null;

	try {
		body = (await request.json()) as GameStatePatch;
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	if (
		!body ||
		(body.pixlState === undefined &&
			body.rewardPacks === undefined &&
			body.campaignProgress === undefined)
	) {
		return json({ message: 'No game-state changes provided' }, { status: 400 });
	}

	const nextState = await updateGameState(locals.user.id, body);

	return json(nextState);
};
