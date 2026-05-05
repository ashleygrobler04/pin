/**
 * Accessible 10-Pin Bowling
 * Focus: High-quality spatial audio feedback for blind players + Visual feedback for sighted players.
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.crowdSource = null;
        this.aimOsc = null;
        this.aimPanner = null;
        this.powerOsc = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;
        this.isInitialized = true;
        this.startCrowd();
    }

    startCrowd() {
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.05;

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        whiteNoise.start();
        this.crowdSource = whiteNoise;
    }

    startAiming(frequency = 440) {
        this.stopAiming();
        this.aimOsc = this.ctx.createOscillator();
        this.aimPanner = this.ctx.createPanner();
        this.aimPanner.panningModel = 'equalpower';
        const gain = this.ctx.createGain();
        this.aimOsc.type = 'square';
        this.aimOsc.frequency.value = frequency;
        
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 4;
        lfoGain.gain.value = 1;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        this.aimOsc.connect(gain);
        gain.connect(this.aimPanner);
        this.aimPanner.connect(this.masterGain);
        this.aimOsc.start();
        lfo.start();
    }

    updateAimPosition(x) {
        if (this.aimPanner) this.aimPanner.setPosition(x, 0, 1 - Math.abs(x));
    }

    stopAiming() {
        if (this.aimOsc) { this.aimOsc.stop(); this.aimOsc = null; }
    }

    startPowerTone() {
        this.stopPowerTone();
        this.powerOsc = this.ctx.createOscillator();
        this.powerGain = this.ctx.createGain();
        this.powerOsc.type = 'sine';
        this.powerOsc.frequency.value = 220;
        this.powerGain.gain.value = 0.3;
        this.powerOsc.connect(this.powerGain);
        this.powerGain.connect(this.masterGain);
        this.powerOsc.start();
    }

    updatePowerPitch(freq) {
        if (this.powerOsc) this.powerOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    }

    stopPowerTone() {
        if (this.powerOsc) { this.powerOsc.stop(); this.powerOsc = null; }
    }

    playRoll(duration, x) {
        const bufferSize = this.ctx.sampleRate * duration;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = noiseBuffer;
        const panner = this.ctx.createPanner();
        panner.setPosition(x, 0, 1);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + duration);
        panner.positionZ.linearRampToValueAtTime(10, this.ctx.currentTime + duration);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.4, this.ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(panner);
        panner.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }

    playPins(count, x) {
        if (count === 0) return;
        for (let i = 0; i < count; i++) {
            const delay = Math.random() * 0.1;
            this.playSinglePin(x + (Math.random() - 0.5) * 0.2, delay);
        }
    }

    playSinglePin(x, delay) {
        const duration = 0.4;
        const now = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200 + Math.random() * 400, now);
        oscGain.gain.setValueAtTime(0.2, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        const bufferSize = this.ctx.sampleRate * duration;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        const panner = this.ctx.createPanner();
        panner.setPosition(x, 0, 5);
        osc.connect(oscGain);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        oscGain.connect(panner);
        noiseGain.connect(panner);
        panner.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration);
        noise.start(now);
    }
}

class ScoringManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.p1Frames = Array.from({ length: 10 }, () => []);
        this.p2Frames = Array.from({ length: 10 }, () => []);
        this.currentFrame = 0;
        this.rollsInFrame = 0;
        this.isPlayer1Turn = true;
    }

    addRoll(pins) {
        const frames = this.isPlayer1Turn ? this.p1Frames : this.p2Frames;
        const frame = frames[this.currentFrame];
        frame.push(pins);
        this.rollsInFrame++;

        let frameDone = false;
        const isStrike = (pins === 10 && this.rollsInFrame === 1);
        const isLastFrame = (this.currentFrame === 9);

        if (isLastFrame) {
            const rolls = frame.length;
            if (rolls === 2) {
                if (frame[0] + frame[1] < 10) frameDone = true;
            } else if (rolls === 3) {
                frameDone = true;
            }
        } else {
            if (isStrike || this.rollsInFrame === 2) frameDone = true;
        }

        if (frameDone) {
            if (!this.isPlayer1Turn) {
                this.currentFrame++;
            }
            this.isPlayer1Turn = !this.isPlayer1Turn;
            this.rollsInFrame = 0;
            return true;
        }
        return false;
    }

    calculateScore(frames) {
        let total = 0;
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const frameSum = frame.reduce((a, b) => a + b, 0);
            total += frameSum;
            if (i < 9) {
                if (frame[0] === 10) {
                    const next = frames[i+1];
                    if (next.length >= 2) total += next[0] + next[1];
                    else if (next.length === 1 && i < 8) total += next[0] + (frames[i+2][0] || 0);
                } else if (frameSum === 10 && frame.length === 2) {
                    total += (frames[i+1][0] || 0);
                }
            }
        }
        return total;
    }

    get scores() {
        return {
            p1: this.calculateScore(this.p1Frames),
            p2: this.calculateScore(this.p2Frames)
        };
    }

    isGameOver() {
        return this.currentFrame >= 10;
    }
}

class BowlingGame {
    constructor() {
        this.audio = new AudioEngine();
        this.scoring = new ScoringManager();
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.state = 'WAITING';
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.myPlayerNum = 1;
        this.isNetworkGame = false;
        
        this.angle = 0;
        this.power = 0;
        this.ballX = 200;
        this.ballY = 450;
        this.pins = this.initPins();
        
        this.setupEventListeners();
        this.render();
    }

    initPins() {
        const pins = [];
        const rows = 4;
        const spacingX = 30;
        const spacingY = 25;
        let count = 0;
        for (let r = 0; r < rows; r++) {
            for (let i = 0; i <= r; i++) {
                pins.push({
                    x: 200 + (i - r / 2) * spacingX,
                    y: 50 + r * spacingY,
                    hit: false,
                    id: count++
                });
            }
        }
        return pins;
    }

    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.start(false));
        document.getElementById('host-btn').addEventListener('click', () => this.initNetwork(true));
        document.getElementById('join-btn').addEventListener('click', () => {
            document.getElementById('join-input-area').style.display = 'block';
        });
        document.getElementById('confirm-join-btn').addEventListener('click', () => {
            const id = document.getElementById('join-id').value;
            if (id) this.initNetwork(false, id);
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleInput();
            }
        });

        // Mobile support: Any touch acts as a Space bar press
        window.addEventListener('touchstart', (e) => {
            if (this.state !== 'WAITING' && e.target.tagName !== 'BUTTON') {
                e.preventDefault();
                if (this.audio) this.audio.init();
                this.handleInput();
            }
        }, { passive: false });
    }

    initNetwork(isHost, partnerId = null) {
        this.isNetworkGame = true;
        this.isHost = isHost;
        this.peer = new Peer();
        this.peer.on('open', (id) => {
            if (isHost) {
                document.getElementById('peer-id-display').style.display = 'block';
                document.getElementById('my-id').textContent = id;
                this.announce("Hosting. Your ID is on screen. Waiting for partner...");
            } else {
                this.conn = this.peer.connect(partnerId);
                this.setupConnection();
            }
        });
        this.peer.on('connection', (conn) => {
            if (isHost && !this.conn) {
                this.conn = conn;
                this.setupConnection();
                this.start(true);
            }
        });
    }

    setupConnection() {
        this.conn.on('open', () => {
            this.myPlayerNum = this.isHost ? 1 : 2;
            if (!this.isHost) this.start(true);
        });
        this.conn.on('data', (data) => this.handleNetworkData(data));
    }

    handleNetworkData(data) {
        if (data.type === 'THROW') {
            this.throwBall(data.angle, data.power, false);
        } else if (data.type === 'RESULT') {
            this.applyResult(data.pinsHit, data.angle);
        }
    }

    start(isNetwork) {
        this.audio.init();
        this.isNetworkGame = isNetwork;
        document.getElementById('setup-ui').style.display = 'none';
        document.getElementById('game-ui').style.display = 'block';
        this.nextTurn();
    }

    announce(text) {
        const announcer = document.getElementById('announcer');
        const info = document.getElementById('game-info');
        announcer.textContent = '';
        setTimeout(() => {
            announcer.textContent = text;
            info.textContent = text;
        }, 50);
    }

    updateUI() {
        const scores = this.scoring.scores;
        document.getElementById('p1-score').textContent = scores.p1;
        document.getElementById('p2-score').textContent = scores.p2;
        document.getElementById('current-frame').textContent = Math.min(10, this.scoring.currentFrame + 1);
    }

    nextTurn() {
        this.updateUI();
        this.ballX = 200;
        this.ballY = 450;
        if (this.scoring.rollsInFrame === 0) {
            this.pins.forEach(p => p.hit = false);
        }

        if (this.scoring.isGameOver()) {
            this.endGame();
            return;
        }

        const isMyTurn = (this.scoring.isPlayer1Turn && this.myPlayerNum === 1) ||
                         (!this.scoring.isPlayer1Turn && this.myPlayerNum === 2);

        if (isMyTurn) {
            this.state = 'AIMING';
            this.announce("Your turn. Aiming...");
            this.audio.startAiming();
        } else {
            this.state = 'WAITING_FOR_OTHER';
            const otherName = this.isNetworkGame ? (this.scoring.isPlayer1Turn ? "Player 1" : "Player 2") : "Computer";
            this.announce(`Waiting for ${otherName}...`);
            if (!this.isNetworkGame) {
                setTimeout(() => this.simulateAITurn(), 2000);
            }
        }
    }

    handleInput() {
        if (this.state === 'AIMING') {
            this.state = 'POWER';
            this.audio.stopAiming();
            this.audio.startPowerTone();
            this.announce("Locked. Power selection...");
        } else if (this.state === 'POWER') {
            this.state = 'ROLLING';
            const a = this.angle;
            const p = this.power;
            this.audio.stopPowerTone();
            if (this.isNetworkGame) {
                this.conn.send({ type: 'THROW', angle: a, power: p });
            }
            this.throwBall(a, p, true);
        }
    }

    throwBall(angle, power, isLocal) {
        this.state = 'ROLLING';
        const otherName = this.isNetworkGame ? "Opponent" : "Computer";
        this.announce(isLocal ? "You're rolling..." : `${otherName} is rolling...`);
        const duration = 2 + (1 - power) * 2;
        this.audio.playRoll(duration, angle);

        const startTime = Date.now();
        const animateRoll = () => {
            if (this.state !== 'ROLLING') return;
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = elapsed / duration;

            if (progress < 1) {
                this.ballY = 450 - progress * 350;
                this.ballX = 200 + angle * 100 * progress;
                requestAnimationFrame(animateRoll);
            } else {
                if (isLocal || !this.isNetworkGame) {
                    this.calculateResult(angle, power);
                }
            }
        };
        requestAnimationFrame(animateRoll);
    }

    calculateResult(angle, power) {
        const accuracy = 1 - Math.abs(angle);
        let pinsToHit = 0;
        if (accuracy > 0.9 && power > 0.7) pinsToHit = 10;
        else if (accuracy > 0.7) pinsToHit = Math.floor(7 + Math.random() * 3);
        else if (accuracy > 0.4) pinsToHit = Math.floor(3 + Math.random() * 5);
        else pinsToHit = Math.floor(Math.random() * 3);

        const remainingPins = this.pins.filter(p => !p.hit);
        const actualHits = Math.min(pinsToHit, remainingPins.length);
        
        if (this.isNetworkGame) {
            this.conn.send({ type: 'RESULT', pinsHit: actualHits, angle: angle });
        }
        
        this.applyResult(actualHits, angle);
    }

    applyResult(pinsHit, angle) {
        const remainingPins = this.pins.filter(p => !p.hit);
        const actualToHit = Math.min(pinsHit, remainingPins.length);

        for (let i = 0; i < actualToHit; i++) {
            const idx = Math.floor(Math.random() * remainingPins.length);
            remainingPins[idx].hit = true;
            remainingPins.splice(idx, 1);
        }

        this.audio.playPins(actualToHit, angle);
        const isStrike = actualToHit === 10 && this.scoring.rollsInFrame === 0;
        const msg = isStrike ? "STRIKE!" : `Knocked over ${actualToHit} pins!`;
        this.announce(msg);

        setTimeout(() => {
            this.scoring.addRoll(actualToHit);
            this.nextTurn();
        }, 3000);
    }

    simulateAITurn() {
        const a = (Math.random() - 0.5) * 0.8;
        const p = 0.5 + Math.random() * 0.5;
        this.throwBall(a, p, false);
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 400, 500);

        ctx.fillStyle = '#332211';
        ctx.fillRect(100, 0, 200, 500);
        ctx.strokeStyle = '#553311';
        ctx.lineWidth = 2;
        for(let i=0; i<10; i++) {
            ctx.beginPath();
            ctx.moveTo(100 + i*20, 0);
            ctx.lineTo(100 + i*20, 500);
            ctx.stroke();
        }

        this.pins.forEach(p => {
            if (!p.hit) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'red';
                ctx.fillRect(p.x - 8, p.y - 2, 16, 2);
            }
        });

        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(this.ballX, this.ballY, 12, 0, Math.PI * 2);
        ctx.fill();

        if (this.state === 'AIMING') {
            const time = Date.now() % 2000;
            this.angle = Math.sin((time / 2000) * Math.PI * 2);
            this.audio.updateAimPosition(this.angle);
            
            ctx.strokeStyle = '#00ff00';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(200, 450);
            ctx.lineTo(200 + this.angle * 100, 100);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (this.state === 'POWER') {
            const time = Date.now() % 1500;
            const progress = time / 1500;
            this.power = progress < 0.5 ? progress * 2 : 2 - (progress * 2);
            this.audio.updatePowerPitch(220 + this.power * 660);

            ctx.fillStyle = '#444';
            ctx.fillRect(350, 100, 20, 300);
            ctx.fillStyle = `rgb(${this.power * 255}, ${255 - this.power * 255}, 0)`;
            ctx.fillRect(350, 400 - this.power * 300, 20, this.power * 300);
        }

        requestAnimationFrame(() => this.render());
    }

    endGame() {
        const scores = this.scoring.scores;
        let resultMsg = `Game Over! P1: ${scores.p1}, P2: ${scores.p2}. `;
        if (scores.p1 > scores.p2) resultMsg += "Player 1 Wins!";
        else if (scores.p2 > scores.p1) resultMsg += "Player 2 Wins!";
        else resultMsg += "It's a Draw!";
        this.announce(resultMsg);
        document.getElementById('game-info').innerHTML += `<br><button onclick="location.reload()">Play Again</button>`;
    }
}

window.addEventListener('load', () => { new BowlingGame(); });