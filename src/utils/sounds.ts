import { Audio } from 'expo-av';

// Configure audio to play even if the device is on silent mode
Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
});

export const playClickSound = async () => {
    try {
        const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/click.wav')
        );
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
            }
        });
    } catch (error) {
        console.warn('Failed to play click sound', error);
    }
};

export const playSuccessSound = async () => {
    try {
        const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/success.wav')
        );
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
            }
        });
    } catch (error) {
        console.warn('Failed to play success sound', error);
    }
};

export const playErrorSound = async () => {
    try {
        const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/error.wav')
        );
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
            }
        });
    } catch (error) {
        console.warn('Failed to play error sound', error);
    }
};
