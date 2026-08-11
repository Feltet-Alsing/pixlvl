<script lang="ts">
	import type { Attachment } from 'svelte/attachments';

	interface Props {
		sketch: (p: import('p5').default) => void;
		class?: string;
	}

	let { sketch, class: className }: Props = $props();

	function attachP5(currentSketch: Props['sketch']): Attachment<HTMLDivElement> {
		return (element) => {
			let instance: import('p5').default | null = null;
			let destroyed = false;

			void import('p5').then(({ default: P5 }) => {
				if (destroyed) return;

				instance = new P5((p) => {
					currentSketch(p);
				}, element);
			});

			return () => {
				destroyed = true;
				instance?.remove();
				instance = null;
			};
		};
	}
</script>

<div class={className} {@attach attachP5(sketch)}></div>

<style>
	div {
		width: 100%;
	}
</style>
