<script lang="ts" module>
	const isSignIn = (mode?: string) => mode === 'sign-in';
	const isSignUp = (mode?: string) => mode === 'sign-up';
</script>

<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData | null } = $props();

	function getFormValue(key: 'name' | 'email') {
		const values = form?.values;

		if (!values) {
			return '';
		}

		const value = key === 'name' ? ('name' in values ? values.name : '') : values.email;

		return value ?? '';
	}
</script>

<svelte:head>
	<title>Auth</title>
</svelte:head>

<div class="page">
	<div class="card">
		<header class="header">
			<h1>Email auth</h1>
			<p>Use your email and password to sign in or create an account.</p>
		</header>

		<div class="panes">
			<section class="pane">
				<h2>Sign in</h2>
				<form method="post" action="?/signIn">
					<label>
						<span>Email</span>
						<input
							autocomplete="email"
							name="email"
							type="email"
							value={isSignIn(form?.mode) ? getFormValue('email') : ''}
						/>
					</label>
					<label>
						<span>Password</span>
						<input autocomplete="current-password" name="password" type="password" />
					</label>
					{#if isSignIn(form?.mode) && form?.message}
						<p class="message error">{form.message}</p>
					{/if}
					<button type="submit">Sign in</button>
				</form>
			</section>

			<section class="pane">
				<h2>Sign up</h2>
				<form method="post" action="?/signUp">
					<label>
						<span>Name</span>
						<input
							autocomplete="name"
							name="name"
							type="text"
							value={isSignUp(form?.mode) ? getFormValue('name') : ''}
						/>
					</label>
					<label>
						<span>Email</span>
						<input
							autocomplete="email"
							name="email"
							type="email"
							value={isSignUp(form?.mode) ? getFormValue('email') : ''}
						/>
					</label>
					<label>
						<span>Password</span>
						<input autocomplete="new-password" name="password" type="password" />
					</label>
					{#if isSignUp(form?.mode) && form?.message}
						<p class="message error">{form.message}</p>
					{/if}
					<button type="submit">Create account</button>
				</form>
			</section>
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f6f7fb;
		color: #1f2937;
		font-family: 'IBM Plex Sans', 'Avenir Next', sans-serif;
	}

	.page {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 2rem;
	}

	.card {
		width: min(100%, 54rem);
		background: #ffffff;
		border: 1px solid #dbe2ea;
		border-radius: 1rem;
		padding: 2rem;
		box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
	}

	.header {
		margin-bottom: 1.5rem;
	}

	.header h1,
	.pane h2 {
		margin: 0;
	}

	.header p {
		margin: 0.5rem 0 0;
		color: #526071;
	}

	.panes {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.pane {
		padding: 1.25rem;
		border: 1px solid #e5eaf0;
		border-radius: 0.875rem;
		background: #fbfcfe;
	}

	form {
		display: grid;
		gap: 0.85rem;
		margin-top: 1rem;
	}

	label {
		display: grid;
		gap: 0.35rem;
		font-size: 0.95rem;
	}

	span {
		font-weight: 600;
	}

	input,
	button {
		font: inherit;
	}

	input {
		padding: 0.75rem 0.875rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.7rem;
		background: #ffffff;
	}

	button {
		padding: 0.8rem 1rem;
		border: 0;
		border-radius: 999px;
		background: #111827;
		color: #ffffff;
		font-weight: 600;
		cursor: pointer;
	}

	.message {
		margin: 0;
		font-size: 0.95rem;
	}

	.error {
		color: #b42318;
	}

	@media (max-width: 640px) {
		.page {
			padding: 1rem;
		}

		.card {
			padding: 1.25rem;
		}
	}
</style>
