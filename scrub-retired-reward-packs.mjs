import postgres from 'postgres';

const RETIRED_DEFINITION_IDS = new Set(['fan-of-knives']);
const NO_GUARANTEED_PACK_SLOT_INDEX = -1;

function normalizeCards(cards) {
	if (!Array.isArray(cards) || cards.length === 0) {
		return [];
	}

	return cards
		.filter(
			(card) =>
				card &&
				typeof card === 'object' &&
				typeof card.definitionId === 'string' &&
				!RETIRED_DEFINITION_IDS.has(card.definitionId)
		)
		.map((card, slotIndex) => ({
			...card,
			slotIndex
		}));
}

function areCardsEqual(left, right) {
	if (left.length !== right.length) {
		return false;
	}

	return left.every((card, index) => {
		const other = right[index];

		return (
			other &&
			card.slotIndex === other.slotIndex &&
			card.definitionId === other.definitionId &&
			card.rarity === other.rarity &&
			card.isGuaranteedSlot === other.isGuaranteedSlot
		);
	});
}

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

try {
	const packs = await sql`
		select id, owner_user_id, status, card_count, guaranteed_slot_index, cards
		from reward_pack
	`;

	let scannedPacks = 0;
	let updatedPacks = 0;
	let removedCards = 0;

	for (const pack of packs) {
		scannedPacks += 1;

		const currentCards = Array.isArray(pack.cards) ? pack.cards : [];
		const nextCards = normalizeCards(currentCards);
		const nextGuaranteedSlotIndex =
			nextCards.find((card) => card.isGuaranteedSlot)?.slotIndex ?? NO_GUARANTEED_PACK_SLOT_INDEX;

		if (
			pack.card_count === nextCards.length &&
			pack.guaranteed_slot_index === nextGuaranteedSlotIndex &&
			areCardsEqual(currentCards, nextCards)
		) {
			continue;
		}

		removedCards += Math.max(0, currentCards.length - nextCards.length);
		updatedPacks += 1;

		await sql`
			update reward_pack
			set cards = ${sql.json(nextCards)},
				card_count = ${nextCards.length},
				guaranteed_slot_index = ${nextGuaranteedSlotIndex},
				updated_at = now()
			where id = ${pack.id}
		`;
	}

	console.log(
		JSON.stringify(
			{
				scannedPacks,
				updatedPacks,
				removedCards,
				retiredDefinitionIds: [...RETIRED_DEFINITION_IDS]
			},
			null,
			2
		)
	);
} finally {
	await sql.end();
}
