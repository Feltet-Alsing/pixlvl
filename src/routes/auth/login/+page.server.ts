import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

function readRequiredString(formData: FormData, key: string) {
	return formData.get(key)?.toString().trim() ?? '';
}

function sanitizeNext(value: string | null | undefined) {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth')) {
		return '/campaigns';
	}

	return value;
}

function getNextPath(event: Parameters<NonNullable<Actions['signIn']>>[0], formData?: FormData) {
	const submittedValue = formData?.get('next');
	const nextValue =
		typeof submittedValue === 'string' ? submittedValue : event.url.searchParams.get('next');

	return sanitizeNext(nextValue);
}

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		throw redirect(302, sanitizeNext(event.url.searchParams.get('next')));
	}
};

export const actions: Actions = {
	signIn: async (event) => {
		const formData = await event.request.formData();
		const nextPath = getNextPath(event, formData);
		const email = readRequiredString(formData, 'email');
		const password = readRequiredString(formData, 'password');

		if (!email || !password) {
			return fail(400, {
				mode: 'sign-in',
				message: 'Email and password are required.',
				values: { email }
			});
		}

		try {
			await auth.api.signInEmail({
				headers: event.request.headers,
				body: { email, password }
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					mode: 'sign-in',
					message: error.message || 'Sign in failed.',
					values: { email }
				});
			}

			return fail(500, {
				mode: 'sign-in',
				message: 'Unexpected error during sign in.',
				values: { email }
			});
		}

		throw redirect(302, nextPath);
	},
	signUp: async (event) => {
		const formData = await event.request.formData();
		const nextPath = getNextPath(event, formData);
		const name = readRequiredString(formData, 'name');
		const email = readRequiredString(formData, 'email');
		const password = readRequiredString(formData, 'password');

		if (!name || !email || !password) {
			return fail(400, {
				mode: 'sign-up',
				message: 'Name, email, and password are required.',
				values: { name, email }
			});
		}

		try {
			await auth.api.signUpEmail({
				headers: event.request.headers,
				body: { name, email, password }
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					mode: 'sign-up',
					message: error.message || 'Sign up failed.',
					values: { name, email }
				});
			}

			return fail(500, {
				mode: 'sign-up',
				message: 'Unexpected error during sign up.',
				values: { name, email }
			});
		}

		throw redirect(302, nextPath);
	}
};
