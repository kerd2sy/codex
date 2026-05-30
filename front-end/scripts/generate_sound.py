import wave
import struct
import math

def create_beep(filename, duration=0.5, frequency=1000.0, volume=0.5):
    sample_rate = 44100
    num_samples = int(duration * sample_rate)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 2 bytes per sample
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            # Generate a sine wave
            sample = volume * math.sin(2.0 * math.pi * frequency * i / sample_rate)
            # Convert to 16-bit signed integer
            packed_sample = struct.pack('<h', int(sample * 32767))
            wav_file.writeframesraw(packed_sample)

if __name__ == "__main__":
    create_beep(r'e:\codex\front-end\assets\sounds\notification.wav')
    print("Notification sound generated successfully.")
