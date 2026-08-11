import type P5 from 'p5';

const MAX_WIDTH = 640;
const BASE_HEIGHT = 360;
const ASPECT_RATIO = MAX_WIDTH / BASE_HEIGHT;

function getCanvasSize(canvas: HTMLCanvasElement | null) {
	const parentWidth = canvas?.parentElement?.clientWidth ?? MAX_WIDTH;
	const width = Math.min(parentWidth, MAX_WIDTH);

	return {
		width,
		height: Math.round(width / ASPECT_RATIO)
	};
}

export function pulseSketch(p: P5) {
	let canvas: HTMLCanvasElement | null = null;

	p.setup = () => {
		const { width, height } = getCanvasSize(canvas);
		canvas = p.createCanvas(width, height).elt as HTMLCanvasElement;
	};

	p.draw = () => {
		const t = p.frameCount * 0.03;
		const pulse = 0.5 + 0.5 * Math.sin(t);
		const radius = p.lerp(54, 118, pulse);

		p.background(244, 241, 235);
		p.noStroke();
		p.fill(37, 99, 235, 32);
		p.circle(p.width / 2, p.height / 2, radius * 2.3);
		p.fill(15, 23, 42, 220);
		p.circle(p.width / 2, p.height / 2, radius * 1.35);
		p.fill(255, 255, 255, 220);
		p.circle(p.width / 2, p.height / 2, radius * 0.42);
	};

	const resize = () => {
		const { width, height } = getCanvasSize(canvas);
		p.resizeCanvas(width, height);
	};

	p.windowResized = resize;
	resize();
}
