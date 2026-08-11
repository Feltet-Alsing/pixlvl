<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Redirecting</title>
</svelte:head>

<div class="page">
	<section class="card">
		<h1>Redirecting…</h1>
		<p>This demo route now forwards automatically based on your session.</p>
		<p><a href={resolve('/dashboard')}>Continue to dashboard</a></p>
	</section>
</div>

<style>
	.page {
		padding: 2rem 1rem;
		display: grid;
		place-items: start center;
	}

	.card {
		width: min(100%, 30rem);
		display: grid;
		gap: 0.85rem;
		padding: 1.5rem;
		border: 1px solid #dbe2ea;
		border-radius: 1rem;
		background: #ffffff;
	}

	h1,
	p {
		margin: 0;
	}

	p {
		color: #526071;
	}

	a {
		color: #111827;
		font-weight: 600;
	}
</style>
