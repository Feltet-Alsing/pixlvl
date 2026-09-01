import { error, json } from '@sveltejs/kit';

import { getDungeon } from '$lib/data';
import {
	clearDungeonFloorForUser,
	failDungeonRunForUser,
	startDungeonRunForUser
} from '$lib/server/dungeon-route';
import { getDungeonProgressForUser, getOrCreateGameState } from '$lib/server/game-state';

import type { RequestHandler } from './$types';

interface DungeonRequestBody {
	action?: 'start' | 'clear-floor' | 'fail';
	floor?: number;
}

function parseDungeonId(value: string) {
	const dungeonId = Number(value);

	if (!Number.isInteger(dungeonId)) {
		throw error(404, 'Dungeon not found');
	}

	getDungeon(dungeonId);

	return dungeonId;
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const dungeonId = parseDungeonId(params.dungeonId);
	const dungeon = getDungeon(dungeonId);
	const gameState = await getOrCreateGameState(locals.user.id);
	const progress = await getDungeonProgressForUser(locals.user.id, dungeonId);

	return json({
		dungeonId,
		keyId: dungeon.keyId,
		remainingKeys: gameState.pixlState.dungeonKeys[dungeon.keyId],
		progress
	});
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const dungeonId = parseDungeonId(params.dungeonId);

	let body: DungeonRequestBody | null = null;

	try {
		body = (await request.json()) as DungeonRequestBody;
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	if (!body?.action) {
		return json({ message: 'Missing dungeon action.' }, { status: 400 });
	}

	const result =
		body.action === 'start'
			? await startDungeonRunForUser(locals.user?.id, dungeonId)
			: body.action === 'fail'
				? await failDungeonRunForUser(locals.user?.id, dungeonId)
				: await clearDungeonFloorForUser(locals.user?.id, dungeonId, Number(body.floor));

	if (!result.ok) {
		return json({ message: result.message }, { status: result.status });
	}

	return json(result.data);
};
