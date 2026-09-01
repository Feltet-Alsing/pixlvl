import postgres from 'postgres';

const DEFAULT_EMAIL = 'alsing3520@gmail.com';
const VALID_DUNGEON_KEYS = [
	'dungeon-1-key',
	'dungeon-2-key',
	'dungeon-3-key',
	'dungeon-4-key',
	'dungeon-5-key'
];

function createDefaultDungeonKeys() {
	return Object.fromEntries(VALID_DUNGEON_KEYS.map((keyId) => [keyId, 0]));
}

function printUsage() {
	console.log(
		`Usage: yarn grant:dev-dungeon-keys [--email address] [--count amount] <dungeon-key-id> [dungeon-key-id ...]\n\nDefaults to ${DEFAULT_EMAIL} when --email is omitted.`
	);
}

function parseArguments(argv) {
	const keyIds = [];
	let email = DEFAULT_EMAIL;
	let count = 1;

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (arg === '--help' || arg === '-h') {
			return { showHelp: true, email, count, keyIds };
		}

		if (arg === '--email') {
			const next = argv[index + 1];

			if (!next) {
				throw new Error('--email requires a value');
			}

			email = next;
			index += 1;
			continue;
		}

		if (arg === '--count') {
			const next = argv[index + 1];

			if (!next) {
				throw new Error('--count requires a value');
			}

			const parsed = Number.parseInt(next, 10);

			if (!Number.isInteger(parsed) || parsed <= 0) {
				throw new Error('--count must be a positive integer');
			}

			count = parsed;
			index += 1;
			continue;
		}

		if (!VALID_DUNGEON_KEYS.includes(arg)) {
			throw new Error(
				`Unknown dungeon key id: ${arg}. Valid keys: ${VALID_DUNGEON_KEYS.join(', ')}`
			);
		}

		keyIds.push(arg);
	}

	return { showHelp: false, email, count, keyIds };
}

const { showHelp, email, count, keyIds } = parseArguments(process.argv.slice(2));

if (showHelp) {
	printUsage();
	process.exit(0);
}

if (keyIds.length === 0) {
	printUsage();
	process.exit(1);
}

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

try {
	const users = await sql`select id from "user" where email = ${email} limit 1`;

	if (users.length === 0) {
		throw new Error(`No user found for ${email}`);
	}

	const userId = users[0].id;
	const states = await sql`
		select dungeon_keys
		from pixl_state
		where user_id = ${userId}
		limit 1
	`;

	if (states.length === 0) {
		throw new Error(`No pixl_state found for user ${userId}`);
	}

	const currentDungeonKeys = {
		...createDefaultDungeonKeys(),
		...(states[0].dungeon_keys && typeof states[0].dungeon_keys === 'object'
			? states[0].dungeon_keys
			: {})
	};
	const requestedTotals = Object.fromEntries(VALID_DUNGEON_KEYS.map((keyId) => [keyId, 0]));

	for (const keyId of keyIds) {
		requestedTotals[keyId] += count;
	}

	const nextDungeonKeys = { ...currentDungeonKeys };

	for (const keyId of VALID_DUNGEON_KEYS) {
		nextDungeonKeys[keyId] = (nextDungeonKeys[keyId] ?? 0) + requestedTotals[keyId];
	}

	await sql`
		update pixl_state
		set dungeon_keys = ${sql.json(nextDungeonKeys)},
			updated_at = now()
		where user_id = ${userId}
	`;

	console.log(
		JSON.stringify(
			{
				email,
				userId,
				countPerArgument: count,
				requestedKeyIds: keyIds,
				grantedTotals: requestedTotals,
				dungeonKeys: nextDungeonKeys
			},
			null,
			2
		)
	);
	process.exit(0);
} finally {
	await sql.end();
}
