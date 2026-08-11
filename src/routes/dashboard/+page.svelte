<script lang="ts">
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
	<title>Dashboard</title>
</svelte:head>

<div class="page">
	<section class="card">
		<header>
			<h1>Dashboard</h1>
			<p>Signed in as {data.user.name || data.user.email}.</p>
		</header>

		<dl>
			<div>
				<dt>Name</dt>
				<dd>{data.user.name || 'Not set'}</dd>
			</div>
			<div>
				<dt>Email</dt>
				<dd>{data.user.email}</dd>
			</div>
			<div>
				<dt>User ID</dt>
				<dd>{data.user.id}</dd>
			</div>
			<div>
				<dt>Session ID</dt>
				<dd>{data.session.id}</dd>
			</div>
			<div>
				<dt>Session expiry</dt>
				<dd>{data.session.expiresAt}</dd>
			</div>
		</dl>

		<form method="post" action="?/signOut">
			<button type="submit">Sign out</button>
		</form>
	</section>
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
		width: min(100%, 42rem);
		background: #ffffff;
		border: 1px solid #dbe2ea;
		border-radius: 1rem;
		padding: 2rem;
		box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
	}

	header h1 {
		margin: 0;
	}

	header p {
		margin: 0.5rem 0 0;
		color: #526071;
	}

	dl {
		display: grid;
		gap: 0.9rem;
		margin: 1.5rem 0;
	}

	dl div {
		padding: 0.9rem 1rem;
		border: 1px solid #e5eaf0;
		border-radius: 0.8rem;
		background: #fbfcfe;
	}

	dt {
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #526071;
	}

	dd {
		margin: 0.35rem 0 0;
		word-break: break-word;
	}

	button {
		font: inherit;
		padding: 0.8rem 1rem;
		border: 0;
		border-radius: 999px;
		background: #111827;
		color: #ffffff;
		font-weight: 600;
		cursor: pointer;
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
