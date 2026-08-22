export function formatDisplayNumber(value: number) {
	return value.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: Number.isInteger(value) ? 0 : 2
	});
}
