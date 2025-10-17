/**
 * Audio utilities to prevent interruption on mobile devices
 */

let audioContext: AudioContext | null = null;

export const initializeAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContextClass();
    }
    
    // Resume if suspended (required for mobile browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    return audioContext;
  } catch (error) {
    console.warn('AudioContext not supported:', error);
    return null;
  }
};

export const keepAudioAlive = (): void => {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
};

export const createSilentAudioBuffer = (): AudioBuffer | null => {
  if (!audioContext) return null;
  
  try {
    // Create a very short silent buffer
    const buffer = audioContext.createBuffer(1, 1, 22050);
    return buffer;
  } catch (error) {
    console.warn('Failed to create silent audio buffer:', error);
    return null;
  }
};

export const playSilentAudio = (): void => {
  if (!audioContext) return;
  
  try {
    const buffer = createSilentAudioBuffer();
    if (buffer) {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    }
  } catch (error) {
    console.warn('Failed to play silent audio:', error);
  }
};

// Initialize audio context on user interaction
export const setupAudioKeepAlive = (): void => {
  if (typeof window === 'undefined') return;
  
  const initAudio = () => {
    initializeAudioContext();
    // Play silent audio to keep context alive
    setTimeout(playSilentAudio, 100);
  };
  
  // Initialize on first user interaction
  document.addEventListener('touchstart', initAudio, { once: true });
  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });
};
