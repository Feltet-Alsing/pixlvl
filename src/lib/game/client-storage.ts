const PIXLVL_STORAGE_PREFIX = 'pixlvl-';
const PIXLVL_STORAGE_WIPE_MARKER_KEY = 'pixlvl-save-wiped-at';
const PIXLVL_SESSION_WIPE_APPLIED_KEY = 'pixlvl-save-wipe-applied-at';

function clearPixlvlStorage(storage: Storage, preserveKeys: string[] = []) {
	const preserved = new Set(preserveKeys);

	for (let index = storage.length - 1; index >= 0; index -= 1) {
		const key = storage.key(index);

		if (!key || preserved.has(key) || !key.startsWith(PIXLVL_STORAGE_PREFIX)) {
			continue;
		}

		storage.removeItem(key);
	}
}

export function markPixlvlSaveWiped() {
	const wipeStamp = Date.now().toString();

	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(PIXLVL_STORAGE_WIPE_MARKER_KEY, wipeStamp);
		clearPixlvlStorage(localStorage, [PIXLVL_STORAGE_WIPE_MARKER_KEY]);
		localStorage.setItem(PIXLVL_STORAGE_WIPE_MARKER_KEY, wipeStamp);
	}

	if (typeof sessionStorage !== 'undefined') {
		clearPixlvlStorage(sessionStorage);
		sessionStorage.setItem(PIXLVL_SESSION_WIPE_APPLIED_KEY, wipeStamp);
	}

	return wipeStamp;
}

export function applyPendingPixlvlSaveWipe() {
	if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') {
		return false;
	}

	const wipeStamp = localStorage.getItem(PIXLVL_STORAGE_WIPE_MARKER_KEY);

	if (!wipeStamp) {
		return false;
	}

	if (sessionStorage.getItem(PIXLVL_SESSION_WIPE_APPLIED_KEY) === wipeStamp) {
		return false;
	}

	clearPixlvlStorage(sessionStorage, [PIXLVL_SESSION_WIPE_APPLIED_KEY]);
	sessionStorage.setItem(PIXLVL_SESSION_WIPE_APPLIED_KEY, wipeStamp);

	return true;
}
