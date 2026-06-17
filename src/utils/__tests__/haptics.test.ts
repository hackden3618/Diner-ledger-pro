import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
    hapticLight,
    hapticMedium,
    hapticHeavy,
    hapticSuccess,
    hapticWarning,
    hapticError,
} from '../haptics';

jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn().mockResolvedValue(undefined),
    notificationAsync: jest.fn().mockResolvedValue(undefined),
    ImpactFeedbackStyle: {
        Light: 'Light',
        Medium: 'Medium',
        Heavy: 'Heavy',
    },
    NotificationFeedbackType: {
        Success: 'Success',
        Warning: 'Warning',
        Error: 'Error',
    },
}));

describe('haptics utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('impact haptics', () => {
        it('hapticLight calls impactAsync with Light style on non-web platforms', () => {
            Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
            hapticLight();
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
        });

        it('hapticMedium calls impactAsync with Medium style on non-web platforms', () => {
            Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
            hapticMedium();
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
        });

        it('hapticHeavy calls impactAsync with Heavy style on non-web platforms', () => {
            Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
            hapticHeavy();
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
        });

        it('hapticLight also works on android platform', () => {
            Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
            hapticLight();
            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
        });
    });

    describe('notification haptics', () => {
        it('hapticSuccess calls notificationAsync with Success type on non-web platforms', () => {
            Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
            hapticSuccess();
            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
        });

        it('hapticWarning calls notificationAsync with Warning type on non-web platforms', () => {
            Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
            hapticWarning();
            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
        });

        it('hapticError calls notificationAsync with Error type on non-web platforms', () => {
            Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
            hapticError();
            expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
        });
    });

    describe('web platform guard', () => {
        beforeEach(() => {
            Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
        });

        it('hapticLight does NOT call impactAsync on web', () => {
            hapticLight();
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it('hapticMedium does NOT call impactAsync on web', () => {
            hapticMedium();
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it('hapticHeavy does NOT call impactAsync on web', () => {
            hapticHeavy();
            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it('hapticSuccess does NOT call notificationAsync on web', () => {
            hapticSuccess();
            expect(Haptics.notificationAsync).not.toHaveBeenCalled();
        });

        it('hapticWarning does NOT call notificationAsync on web', () => {
            hapticWarning();
            expect(Haptics.notificationAsync).not.toHaveBeenCalled();
        });

        it('hapticError does NOT call notificationAsync on web', () => {
            hapticError();
            expect(Haptics.notificationAsync).not.toHaveBeenCalled();
        });
    });

    describe('error resilience', () => {
        it('hapticLight does not throw even if impactAsync rejects', () => {
            Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
            (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('Haptic not supported'));
            expect(() => hapticLight()).not.toThrow();
        });

        it('hapticSuccess does not throw even if notificationAsync rejects', () => {
            Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
            (Haptics.notificationAsync as jest.Mock).mockRejectedValueOnce(new Error('Haptic not supported'));
            expect(() => hapticSuccess()).not.toThrow();
        });
    });
});