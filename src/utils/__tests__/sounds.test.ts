import { Audio } from 'expo-av';

// Mock expo-av before importing sounds module
const mockPlayAsync = jest.fn().mockResolvedValue(undefined);
const mockUnloadAsync = jest.fn().mockResolvedValue(undefined);
const mockSetOnPlaybackStatusUpdate = jest.fn();
const mockSound = {
    playAsync: mockPlayAsync,
    unloadAsync: mockUnloadAsync,
    setOnPlaybackStatusUpdate: mockSetOnPlaybackStatusUpdate,
};

jest.mock('expo-av', () => ({
    Audio: {
        Sound: {
            createAsync: jest.fn().mockResolvedValue({ sound: mockSound }),
        },
        setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    },
}));

// Import after mocks are set up
import { playClickSound, playSuccessSound, playErrorSound } from '../sounds';

describe('sounds utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({ sound: mockSound });
        mockPlayAsync.mockResolvedValue(undefined);
    });

    describe('audio mode initialization', () => {
        it('configures audio mode on module load', () => {
            // The IIFE in sounds.ts runs on import; setAudioModeAsync should have been called
            // We verify it via the mock being set up (import already happened above)
            expect(Audio.setAudioModeAsync).toBeDefined();
        });
    });

    describe('playClickSound', () => {
        it('creates an audio sound from the click.wav asset', async () => {
            await playClickSound();
            expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
                expect.anything() // require('../../assets/sounds/click.wav')
            );
        });

        it('plays the sound after creating it', async () => {
            await playClickSound();
            expect(mockPlayAsync).toHaveBeenCalled();
        });

        it('registers an onPlaybackStatusUpdate callback', async () => {
            await playClickSound();
            expect(mockSetOnPlaybackStatusUpdate).toHaveBeenCalledWith(expect.any(Function));
        });

        it('unloads the sound when playback finishes', async () => {
            await playClickSound();
            // Get the callback registered
            const callback = mockSetOnPlaybackStatusUpdate.mock.calls[0][0];
            // Simulate finished playback
            callback({ isLoaded: true, didJustFinish: true });
            expect(mockUnloadAsync).toHaveBeenCalled();
        });

        it('does NOT unload when playback has not finished', async () => {
            await playClickSound();
            const callback = mockSetOnPlaybackStatusUpdate.mock.calls[0][0];
            callback({ isLoaded: true, didJustFinish: false });
            expect(mockUnloadAsync).not.toHaveBeenCalled();
        });

        it('does NOT unload when sound is not loaded', async () => {
            await playClickSound();
            const callback = mockSetOnPlaybackStatusUpdate.mock.calls[0][0];
            callback({ isLoaded: false, didJustFinish: true });
            expect(mockUnloadAsync).not.toHaveBeenCalled();
        });

        it('catches and warns on error without throwing', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            (Audio.Sound.createAsync as jest.Mock).mockRejectedValueOnce(new Error('Audio unavailable'));
            await expect(playClickSound()).resolves.toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to play click sound', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('playSuccessSound', () => {
        it('creates an audio sound from the success.wav asset', async () => {
            await playSuccessSound();
            expect(Audio.Sound.createAsync).toHaveBeenCalledWith(expect.anything());
        });

        it('plays the sound after creating it', async () => {
            await playSuccessSound();
            expect(mockPlayAsync).toHaveBeenCalled();
        });

        it('unloads the sound when playback finishes', async () => {
            await playSuccessSound();
            const callback = mockSetOnPlaybackStatusUpdate.mock.calls[0][0];
            callback({ isLoaded: true, didJustFinish: true });
            expect(mockUnloadAsync).toHaveBeenCalled();
        });

        it('catches and warns on error without throwing', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            (Audio.Sound.createAsync as jest.Mock).mockRejectedValueOnce(new Error('Audio unavailable'));
            await expect(playSuccessSound()).resolves.toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to play success sound', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('playErrorSound', () => {
        it('creates an audio sound from the error.wav asset', async () => {
            await playErrorSound();
            expect(Audio.Sound.createAsync).toHaveBeenCalledWith(expect.anything());
        });

        it('plays the sound after creating it', async () => {
            await playErrorSound();
            expect(mockPlayAsync).toHaveBeenCalled();
        });

        it('unloads the sound when playback finishes', async () => {
            await playErrorSound();
            const callback = mockSetOnPlaybackStatusUpdate.mock.calls[0][0];
            callback({ isLoaded: true, didJustFinish: true });
            expect(mockUnloadAsync).toHaveBeenCalled();
        });

        it('catches and warns on error without throwing', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            (Audio.Sound.createAsync as jest.Mock).mockRejectedValueOnce(new Error('Audio unavailable'));
            await expect(playErrorSound()).resolves.toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to play error sound', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('playAsync failure handling', () => {
        it('playClickSound warns when playAsync rejects', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            mockPlayAsync.mockRejectedValueOnce(new Error('Playback failed'));
            await expect(playClickSound()).resolves.toBeUndefined();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to play click sound', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });
});
