import { redirect, type RequestHandler } from '@sveltejs/kit';

import { auth } from '$lib/server/auth';

function sanitizeNext(value: FormDataEntryValue | null) {
	if (
		typeof value !== 'string' ||
		!value.startsWith('/') ||
		value.startsWith('//') ||
		value.startsWith('/auth')
	) {
		return '/';
	}

	return value;
}

export const POST: RequestHandler = async (event) => {
	const formData = await event.request.formData();

	await auth.api.signOut({
		headers: event.request.headers
	});

	throw redirect(303, sanitizeNext(formData.get('next')));
};
