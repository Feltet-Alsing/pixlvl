import { redirect, type Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

function sanitizeNext(value: string | null | undefined) {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth')) {
		return '/campaigns';
	}

	return value;
}

function buildLoginHref(pathname: string, search: string) {
	const next = encodeURIComponent(`${pathname}${search}`);

	return `/auth/login?next=${next}`;
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	const pathname = event.url.pathname;

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	} else {
		event.locals.session = undefined;
		event.locals.user = undefined;
	}

	if (pathname.startsWith('/dashboard') && !session) {
		throw redirect(302, buildLoginHref(pathname, event.url.search));
	}

	if (pathname.startsWith('/auth') && session) {
		throw redirect(302, sanitizeNext(event.url.searchParams.get('next')));
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
