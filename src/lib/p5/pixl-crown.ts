import type P5 from 'p5';

export function drawPixlCrown(p: P5, centerX: number, centerY: number, pixlRadius: number) {
	const crownWidth = pixlRadius * 1.55;
	const crownHeight = pixlRadius * 0.78;
	const crownBaseY = centerY - pixlRadius - 9;
	const leftX = centerX - crownWidth * 0.5;
	const rightX = centerX + crownWidth * 0.5;
	const baseTopY = crownBaseY - crownHeight * 0.38;
	const peakY = crownBaseY - crownHeight;

	p.push();
	p.stroke('#fff1a8');
	p.strokeWeight(1.6);
	p.fill('#f59e0b');
	p.beginShape();
	p.vertex(leftX, crownBaseY);
	p.vertex(leftX + crownWidth * 0.18, baseTopY);
	p.vertex(leftX + crownWidth * 0.34, peakY);
	p.vertex(centerX, baseTopY - crownHeight * 0.14);
	p.vertex(rightX - crownWidth * 0.34, peakY);
	p.vertex(rightX - crownWidth * 0.18, baseTopY);
	p.vertex(rightX, crownBaseY);
	p.endShape(p.CLOSE);

	p.noStroke();
	p.fill('#fef08a');
	p.circle(leftX + crownWidth * 0.34, peakY, 4.5);
	p.circle(centerX, baseTopY - crownHeight * 0.14, 5.4);
	p.circle(rightX - crownWidth * 0.34, peakY, 4.5);
	p.pop();
}
