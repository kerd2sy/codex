const fs = require('fs');

function writeWav(filename) {
    const sampleRate = 44100;
    const duration = 1.2; 
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = Buffer.alloc(44 + numSamples * 2);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);

    // fmt subchunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);

    // data subchunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    // "Chaaaaak" followed by "Ashaak"
    const pulses = [
        { start: 0, decay: 15, freq: 600, noise: 0.7 }, // Long Chaaaaak
        { start: 0.35, decay: 40, freq: 900, noise: 0.5 } // Sharper Ashaak
    ];

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let totalSample = 0;

        pulses.forEach(pulse => {
            if (t >= pulse.start && t < pulse.start + 0.6) {
                const dt = t - pulse.start;
                const envelope = Math.exp(-dt * pulse.decay); 
                
                const noise = (Math.random() * 2 - 1) * pulse.noise;
                const sine = Math.sin(2 * Math.PI * pulse.freq * dt) * (1 - pulse.noise);
                
                totalSample += (noise + sine) * envelope;
            }
        });

        totalSample = Math.max(-1, Math.min(1, totalSample)) * 0.8;
        const intSample = Math.floor(totalSample * 32767);
        buffer.writeInt16LE(intSample, 44 + i * 2);
    }

    fs.writeFileSync(filename, buffer);
}

const outputPath = 'e:/codex/front-end/assets/sounds/notification.wav';
writeWav(outputPath);
console.log(`'Chaaaaak-Ashaak' dramatic sound generated successfully at ${outputPath}`);
