let phoneTemplate;
const PHONE_ASPECT_RATIO = 1472 / 2968; // width / height from phoneTemplate.png

// Timer settings
const TIMER_DURATION = 120; // 120 seconds (2 minutes)
const FEEDBACK_DURATION = 420; // 420 seconds (7 minutes)
const TIME_SCALE = 1; // Increase this to make timer run faster for testing (1 = real time, 10 = 10x faster)

let timerStartTime;
let timerElapsed = 0;
let timerComplete = false;
let feedbackPhase = false;
let feedbackStartTime;
let feedbackElapsed = 0;
let feedbackComplete = false;
let isPaused = false;
let pausedElapsed = 0;
let timerStarted = false;

// Phone screen area (accounting for bezels and rounded corners)
// These values are proportional to the phone template (1472 x 2968)
const SCREEN_MARGIN_TOP = 0.058; // Top bezel with notch
const SCREEN_MARGIN_BOTTOM = 0.015; // Bottom bezel
const SCREEN_MARGIN_SIDES = 0.027; // Side bezels
const CORNER_RADIUS_RATIO = 0.095; // Rounded corner radius as ratio of width

function preload() {
	phoneTemplate = loadImage('image/phoneTemplate.png');
}

function setup() {
	// Calculate canvas dimensions based on window height
	let canvasHeight = windowHeight;
	let canvasWidth = canvasHeight * PHONE_ASPECT_RATIO;
	
	// Create canvas and center it
	let canvas = createCanvas(canvasWidth, canvasHeight);
	let x = (windowWidth - width) / 2;
	let y = 0;
	canvas.position(x, y);
	
	// Start the timer
	timerStartTime = millis();
}

function draw() {
	background(255);
	
	// Calculate timer progress
	if (timerStarted && !timerComplete && !isPaused) {
		timerElapsed = pausedElapsed + (millis() - timerStartTime) / 1000 * TIME_SCALE;
		if (timerElapsed >= TIMER_DURATION) {
			timerElapsed = TIMER_DURATION;
			timerComplete = true;
		}
	}
	
	// Calculate feedback phase progress
	if (timerStarted && feedbackPhase && !feedbackComplete && !isPaused) {
		feedbackElapsed = pausedElapsed + (millis() - feedbackStartTime) / 1000 * TIME_SCALE;
		if (feedbackElapsed >= FEEDBACK_DURATION) {
			feedbackElapsed = FEEDBACK_DURATION;
			feedbackComplete = true;
		}
	}
	
	let progress = timerElapsed / TIMER_DURATION;
	let feedbackProgress = feedbackElapsed / FEEDBACK_DURATION;
	let timeRemaining = TIMER_DURATION - timerElapsed;
	let feedbackTimeRemaining = FEEDBACK_DURATION - feedbackElapsed;
	let minutes = floor(timeRemaining / 60);
	let seconds = floor(timeRemaining % 60);
	let feedbackMinutes = floor(feedbackTimeRemaining / 60);
	let feedbackSeconds = floor(feedbackTimeRemaining % 60);
	
	// Calculate screen area
	let screenX = width * SCREEN_MARGIN_SIDES;
	let screenY = height * SCREEN_MARGIN_TOP;
	let screenWidth = width * (1 - 2 * SCREEN_MARGIN_SIDES);
	let screenHeight = height * (1 - SCREEN_MARGIN_TOP - SCREEN_MARGIN_BOTTOM);
	let cornerRadius = screenWidth * CORNER_RADIUS_RATIO;
	
	// Draw the filling timer with rounded corners
	push();
	
	// Draw gradient fill based on progress
	let fillHeight;
	if (!feedbackPhase) {
		// Fill up phase (Play Test) - always show full fill when timer is complete or has reached duration
		fillHeight = (timerComplete || timerElapsed >= TIMER_DURATION) ? screenHeight : screenHeight * progress;
	} else {
		// Fill down phase (Feedback) - drain from full
		fillHeight = screenHeight * (1 - feedbackProgress);
	}
	
	// Clip to rounded rectangle
	drawingContext.save();
	drawRoundedRectPath(screenX, screenY, screenWidth, screenHeight, cornerRadius);
	drawingContext.clip();
	
	// Always draw the gradient when there's fill height
	if (fillHeight > 0) {
		for (let i = 0; i < fillHeight; i++) {
			let gradientProgress = i / screenHeight;
			let hue = (gradientProgress * 60 + frameCount * 0.5) % 360;
			let sat = 70 + sin(frameCount * 0.02 + i * 0.01) * 10;
			let bright = 60 + sin(frameCount * 0.03 + i * 0.02) * 15;
			
			colorMode(HSB, 360, 100, 100);
			stroke(hue, sat, bright);
			line(screenX, screenY + screenHeight - i, screenX + screenWidth, screenY + screenHeight - i);
		}
		colorMode(RGB, 255);
	}
	
	// Draw 30-second markers
	for (let i = 1; i <= 3; i++) {
		let markerY = screenY + screenHeight * (i / 4);
		stroke(150, 150);
		strokeWeight(2);
		line(screenX, markerY, screenX + screenWidth, markerY);
		
		// Draw time labels
		noStroke();
		fill(150, 150);
		textAlign(RIGHT, CENTER);
		textSize(screenWidth * 0.04);
		
		let timeAtMarker;
		if (!feedbackPhase) {
			// Play Test phase: show countdown from 2:00 (markers at 1:30, 1:00, 0:30)
			timeAtMarker = TIMER_DURATION - (i * 30);
		} else {
			// Feedback phase: show countdown from 7:00 at same positions
			// Markers are at 25%, 50%, 75% of screen height
			// Which correspond to 75%, 50%, 25% of time remaining
			timeAtMarker = FEEDBACK_DURATION * (1 - i / 4);
		}
		
		let mins = floor(timeAtMarker / 60);
		let secs = floor(timeAtMarker % 60);
		text(nf(mins, 1) + ':' + nf(secs, 2), screenX + screenWidth - 30, markerY - 8);
	}
	
	drawingContext.restore();
	pop();
	
	// Draw title text based on phase
	push();
	textAlign(CENTER, CENTER);
	textSize(screenWidth * 0.08);
	fill(200);
	noStroke();
	let titleY = screenY + screenHeight * 0.35;
	if (!feedbackPhase) {
		if (timerComplete) {
			text('Play Test Time', width / 2, titleY);
			text('Is Over', width / 2, titleY + screenWidth * 0.1);
		} else {
			text('Play Test Time', width / 2, titleY);
		}
	} else {
		if (feedbackComplete) {
			text('Feedback Time', width / 2, titleY);
			text('Is Over', width / 2, titleY + screenWidth * 0.1);
		} else {
			text('Feedback Time', width / 2, titleY);
		}
	}
	pop();
	
	// Draw time remaining text
	if ((!timerComplete && !feedbackPhase) || (feedbackPhase && !feedbackComplete)) {
		push();
		textAlign(CENTER, CENTER);
		textSize(screenWidth * 0.15);
		
		let textY;
		let displayMinutes, displaySeconds;
		
		if (!feedbackPhase) {
			// Play Test phase - text above the fill
			textY = screenY + screenHeight - fillHeight - screenWidth * 0.15;
			displayMinutes = minutes;
			displaySeconds = seconds;
		} else {
			// Feedback phase - text at the top edge of the fill (which is draining down)
			textY = screenY + screenHeight - fillHeight - screenWidth * 0.15;
			displayMinutes = feedbackMinutes;
			displaySeconds = feedbackSeconds;
		}
		
		// Keep text visible
		if (textY < screenY + screenWidth * 0.08) {
			textY = screenY + screenWidth * 0.08;
		}
		if (textY > screenY + screenHeight - screenWidth * 0.12) {
			textY = screenY + screenHeight - screenWidth * 0.12;
		}
		
		// Black text at all times
		fill(0);
		stroke(255);
		strokeWeight(screenWidth * 0.005);
		
		text(nf(displayMinutes, 1) + ':' + nf(displaySeconds, 2), width / 2, textY);
		
		// Draw "remaining" text below timer
		textSize(screenWidth * 0.05);
		text('remaining', width / 2, textY + screenWidth * 0.08);
		pop();
	}
	
	// Draw the phone template on top
	image(phoneTemplate, 0, 0, width, height);
}

function drawRoundedRectPath(x, y, w, h, r) {
	beginShape();
	vertex(x + r, y);
	vertex(x + w - r, y);
	quadraticVertex(x + w, y, x + w, y + r);
	vertex(x + w, y + h - r);
	quadraticVertex(x + w, y + h, x + w - r, y + h);
	vertex(x + r, y + h);
	quadraticVertex(x, y + h, x, y + h - r);
	vertex(x, y + r);
	quadraticVertex(x, y, x + r, y);
	endShape(CLOSE);
}

function createCelebration() {
	// Create particles for celebration effect
	let screenX = width * SCREEN_MARGIN_SIDES;
	let screenWidth = width * (1 - 2 * SCREEN_MARGIN_SIDES);
	let screenY = height * SCREEN_MARGIN_TOP;
	let screenHeight = height * (1 - SCREEN_MARGIN_TOP - SCREEN_MARGIN_BOTTOM);
	
	// Use a consistent celebration color (vibrant purple/magenta)
	let celebrationColor = color(200, 50, 255);
	
	// Particles originate from title location (0.35 of screen height)
	let particleOriginY = screenY + screenHeight * 0.35;
	
	for (let i = 0; i < 300; i++) {
		celebrationParticles.push({
			x: screenX + random(screenWidth),
			y: particleOriginY,
			vx: random(-4, 4),
			vy: random(-10, -2),
			size: random(3, 20),
			color: celebrationColor,
			opacity: random(100, 255),
			life: 255
		});
	}
}

function updateCelebration() {
	let screenX = width * SCREEN_MARGIN_SIDES;
	let screenY = height * SCREEN_MARGIN_TOP;
	let screenWidth = width * (1 - 2 * SCREEN_MARGIN_SIDES);
	let screenHeight = height * (1 - SCREEN_MARGIN_TOP - SCREEN_MARGIN_BOTTOM);
	let cornerRadius = screenWidth * CORNER_RADIUS_RATIO;
	
	// Clip to screen area
	push();
	drawingContext.save();
	drawRoundedRectPath(screenX, screenY, screenWidth, screenHeight, cornerRadius);
	drawingContext.clip();
	
	// Update and draw particles
	for (let i = celebrationParticles.length - 1; i >= 0; i--) {
		let p = celebrationParticles[i];
		p.x += p.vx;
		p.y += p.vy;
		p.vy += 0.3; // gravity
		p.life -= 3;
		
		if (p.life <= 0) {
			celebrationParticles.splice(i, 1);
		} else {
			push();
			let alpha = (p.life / 255) * p.opacity;
			fill(red(p.color), green(p.color), blue(p.color), alpha);
			noStroke();
			ellipse(p.x, p.y, p.size);
			pop();
		}
	}
	
	drawingContext.restore();
	pop();
	
	// Draw completion message
	push();
	textAlign(CENTER, CENTER);
	
	// Draw "Play Test Time"
	textSize(screenWidth * 0.08);
	fill(255, 200 + sin(frameCount * 0.1) * 55);
	stroke(0);
	strokeWeight(screenWidth * 0.003);
	text('Play Test Time', width / 2, screenY + screenHeight * 0.35);
	
	// Draw "Is Over" below it
	textSize(screenWidth * 0.08);
	text('Is Over', width / 2, screenY + screenHeight * 0.35 + screenWidth * 0.1);
	pop();
}

function windowResized() {
	// Recalculate dimensions when window is resized
	let canvasHeight = windowHeight;
	let canvasWidth = canvasHeight * PHONE_ASPECT_RATIO;
	resizeCanvas(canvasWidth, canvasHeight);
	
	// Recenter the canvas
	let x = (windowWidth - width) / 2;
	let y = 0;
	let canvas = select('canvas');
	canvas.position(x, y);
}

function mousePressed() {
	// Click to restart timer
	timerStartTime = millis();
	timerElapsed = 0;
	timerComplete = false;
	feedbackPhase = false;
	feedbackElapsed = 0;
	feedbackComplete = false;
	isPaused = false;
	pausedElapsed = 0;
	timerStarted = false;
}

function keyPressed() {
	// Spacebar to start/pause
	if (key === ' ') {
		if (!timerStarted) {
			// Start the timer
			timerStarted = true;
			timerStartTime = millis();
			isPaused = false;
		} else if (timerComplete && !feedbackPhase) {
			// If play test is complete, start feedback phase
			feedbackPhase = true;
			feedbackStartTime = millis();
			feedbackElapsed = 0;
			pausedElapsed = 0;
			isPaused = false;
		} else {
			// Toggle pause
			isPaused = !isPaused;
			if (isPaused) {
				// Store elapsed time when pausing
				if (feedbackPhase) {
					pausedElapsed = feedbackElapsed;
				} else {
					pausedElapsed = timerElapsed;
				}
			} else {
				// Reset start time when resuming
				if (feedbackPhase) {
					feedbackStartTime = millis();
				} else {
					timerStartTime = millis();
				}
			}
		}
		return false;
	}
	
	// 'R' to reset completely
	if (key === 'r' || key === 'R') {
		timerStartTime = millis();
		timerElapsed = 0;
		timerComplete = false;
		feedbackPhase = false;
		feedbackElapsed = 0;
		feedbackComplete = false;
		isPaused = false;
		pausedElapsed = 0;
		timerStarted = false;
		return false;
	}
	
	// '1' to jump to play test phase
	if (key === '1') {
		timerStartTime = millis();
		timerElapsed = 0;
		timerComplete = false;
		feedbackPhase = false;
		feedbackElapsed = 0;
		feedbackComplete = false;
		isPaused = true;
		pausedElapsed = 0;
		timerStarted = true;
		return false;
	}
	
	// '2' to jump to feedback phase
	if (key === '2') {
		timerElapsed = TIMER_DURATION;
		timerComplete = true;
		feedbackPhase = true;
		feedbackStartTime = millis();
		feedbackElapsed = 0;
		feedbackComplete = false;
		isPaused = true;
		pausedElapsed = 0;
		timerStarted = true;
		return false;
	}
	
	// 'P' to pause/unpause
	if (key === 'p' || key === 'P') {
		if (timerStarted && (!timerComplete || feedbackPhase)) {
			isPaused = !isPaused;
			if (isPaused) {
				if (feedbackPhase) {
					pausedElapsed = feedbackElapsed;
				} else {
					pausedElapsed = timerElapsed;
				}
			} else {
				if (feedbackPhase) {
					feedbackStartTime = millis();
				} else {
					timerStartTime = millis();
				}
			}
		}
		return false;
	}
}
