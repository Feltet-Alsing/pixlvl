import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

const DEFAULT_EMAIL = 'alsing3520@gmail.com';

function printUsage() {
	console.log(
		`Usage: yarn grant:dev-inventory [--email address] [--allow-duplicates] <definition-id> [definition-id ...]\n\nDefaults to ${DEFAULT_EMAIL} when --email is omitted.`
	);
}

function parseArguments(argv) {
	const definitionIds = [];
	let email = DEFAULT_EMAIL;
	let allowDuplicates = false;

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (arg === '--help' || arg === '-h') {
			return { showHelp: true, email, definitionIds, allowDuplicates };
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

		if (arg === '--allow-duplicates') {
			allowDuplicates = true;
			continue;
		}

		definitionIds.push(arg);
	}

	return { showHelp: false, email, definitionIds, allowDuplicates };
}

const { showHelp, email, definitionIds, allowDuplicates } = parseArguments(process.argv.slice(2));

if (showHelp) {
	printUsage();
	process.exit(0);
}

if (definitionIds.length === 0) {
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
		select owned_weapons, acknowledged_weapon_definition_ids
		from pixl_state
		where user_id = ${userId}
		limit 1
	`;

	if (states.length === 0) {
		throw new Error(`No pixl_state found for user ${userId}`);
	}

	const ownedWeapons = Array.isArray(states[0].owned_weapons) ? states[0].owned_weapons : [];
	const acknowledgedIds = Array.isArray(states[0].acknowledged_weapon_definition_ids)
		? states[0].acknowledged_weapon_definition_ids
		: [];
	const existingDefinitionIds = new Set(ownedWeapons.map((weapon) => weapon.definitionId));
	const acquiredAt = new Date().toISOString();

	const grantedWeapons = definitionIds
		.filter((definitionId) => allowDuplicates || !existingDefinitionIds.has(definitionId))
		.map((definitionId) => ({
			instanceId: randomUUID(),
			definitionId,
			source: 'drop',
			acquiredAt,
			campaignId: null,
			stage: null,
			level: null,
			upgradeLevel: 0,
			totalScrapInvested: 0
		}));

	const nextOwnedWeapons = [...ownedWeapons, ...grantedWeapons];
	const nextAcknowledgedIds = [...new Set([...acknowledgedIds, ...definitionIds])];

	await sql`
		update pixl_state
		set owned_weapons = ${sql.json(nextOwnedWeapons)},
			acknowledged_weapon_definition_ids = ${sql.json(nextAcknowledgedIds)},
			updated_at = now()
		where user_id = ${userId}
	`;

	console.log(
		JSON.stringify(
			{
				email,
				userId,
				allowDuplicates,
				requestedDefinitionIds: definitionIds,
				grantedDefinitionIds: grantedWeapons.map((weapon) => weapon.definitionId),
				alreadyOwnedDefinitionIds: definitionIds.filter((definitionId) =>
					existingDefinitionIds.has(definitionId)
				),
				totalOwnedWeapons: nextOwnedWeapons.length
			},
			null,
			2
		)
	);
	process.exit(0);
} finally {
	await sql.end();
}
