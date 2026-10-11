"""Generate original mono PCM soundscapes. No third-party recordings or network calls."""
import math, random, wave, struct
from pathlib import Path

RATE = 22050
SECONDS = 28
OUT = Path(__file__).resolve().parents[1] / 'web' / 'sounds'
OUT.mkdir(exist_ok=True)
random.seed(17)
PI = math.pi

def note(t, frequency, decay=1.8):
    return math.sin(2*PI*frequency*t)*math.exp(-t/decay) + .22*math.sin(4*PI*frequency*t)*math.exp(-t/.8)

for name in ['piano', 'birds', 'ocean', 'ambient', 'voice']:
    samples = bytearray()
    smooth_noise = 0.0
    for i in range(RATE*SECONDS):
        t = i/RATE
        smooth_noise = .96*smooth_noise + .04*random.uniform(-1,1)
        if name == 'piano':
            frequencies = [261.626, 329.628, 391.995, 523.251, 391.995, 329.628, 293.665, 349.228]
            step = int(t/1.6)
            v = .22*note(t%1.6,frequencies[step%len(frequencies)])
            v += .08*note(t%6.4,130.813,3)
        elif name == 'birds':
            phase = t%2.7
            chirp = phase%0.24
            v = .5*smooth_noise
            if phase < .72:
                v += .18*math.sin(2*PI*(1800*chirp + 1700*chirp*chirp))*math.sin(PI*min(1,chirp/.24))**2
            v += .04*math.sin(2*PI*196*t)
        elif name == 'ocean':
            v = 1.15*smooth_noise*(.5+.5*math.sin(2*PI*t/7))
            v += .13*note(t%5.6,523.251,2.8)
        else:
            v = sum(.055*math.sin(2*PI*f*t)*(.65+.35*math.sin(2*PI*t/11+j)) for j,f in enumerate([130.813,196,261.626,329.628]))
            v += .025*note(t%4.8,659.255,2.2)
        # A short edge envelope avoids clicks; adjustable ramps are applied at playback.
        envelope = min(1,t/.1,(SECONDS-t)/.1)
        value = max(-.8,min(.8,v))*envelope
        samples.extend(struct.pack('<h',round(value*32767)))
    with wave.open(str(OUT/(name+'.wav')),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(samples)
    print(name+'.wav')
# Spoken words use the device speech synthesizer in the foreground. The native
# background fallback for this preset is the original ambient track.
