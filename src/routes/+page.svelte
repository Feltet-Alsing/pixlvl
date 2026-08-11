<script lang="ts">
	import P5Canvas from '$lib/components/P5Canvas.svelte';
	import { pulseSketch } from '$lib/p5/pulse-sketch';
</script>

<section>
	<P5Canvas class="canvas-frame" sketch={pulseSketch} />
</section>

<style>
	:global(body) {
		margin: 0;
		background: #f8f5ef;
		color: #111827;
		font-family: 'IBM Plex Sans', 'Avenir Next', sans-serif;
	}
</style>
