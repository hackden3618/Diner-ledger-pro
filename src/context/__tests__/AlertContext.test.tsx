import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AlertProvider, useCustomAlert } from '../AlertContext';

// Mock the haptics utilities
const mockHapticSuccess = jest.fn();
const mockHapticError = jest.fn();
const mockHapticWarning = jest.fn();
jest.mock('../../utils/haptics', () => ({
    hapticSuccess: () => mockHapticSuccess(),
    hapticError: () => mockHapticError(),
    hapticWarning: () => mockHapticWarning(),
}));

// Mock the sounds utilities
const mockPlaySuccessSound = jest.fn().mockResolvedValue(undefined);
const mockPlayErrorSound = jest.fn().mockResolvedValue(undefined);
const mockPlayClickSound = jest.fn().mockResolvedValue(undefined);
jest.mock('../../utils/sounds', () => ({
    playSuccessSound: () => mockPlaySuccessSound(),
    playErrorSound: () => mockPlayErrorSound(),
    playClickSound: () => mockPlayClickSound(),
}));

// Mock CustomAlertModal to avoid native module dependencies
jest.mock('../../components/ui/CustomAlertModal', () => {
    const React = require('react');
    return function MockCustomAlertModal() {
        return React.createElement('View', { testID: 'custom-alert-modal' });
    };
});

// Mock react-native-modal
jest.mock('react-native-modal', () => {
    const React = require('react');
    return function MockModal({ children }: { children: React.ReactNode }) {
        return React.createElement('View', null, children);
    };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AlertProvider>{children}</AlertProvider>
);

describe('AlertContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('useCustomAlert hook', () => {
        it('throws an error when used outside AlertProvider', () => {
            // Suppress expected console.error from React
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            expect(() => {
                renderHook(() => useCustomAlert());
            }).toThrow('useCustomAlert must be used within an AlertProvider');
            consoleSpy.mockRestore();
        });

        it('provides showAlert function within AlertProvider', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            expect(result.current.showAlert).toBeInstanceOf(Function);
        });
    });

    describe('showAlert haptic and sound routing', () => {
        it('triggers success haptic and sound when title contains "success"', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('Success', 'Operation completed.');
            });
            expect(mockHapticSuccess).toHaveBeenCalledTimes(1);
            expect(mockPlaySuccessSound).toHaveBeenCalledTimes(1);
            expect(mockHapticError).not.toHaveBeenCalled();
            expect(mockHapticWarning).not.toHaveBeenCalled();
        });

        it('is case-insensitive for "success" matching', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('SUCCESS Alert', 'Case insensitive check.');
            });
            expect(mockHapticSuccess).toHaveBeenCalledTimes(1);
            expect(mockPlaySuccessSound).toHaveBeenCalledTimes(1);
        });

        it('triggers error haptic and sound when title contains "error"', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('Error Occurred', 'Something went wrong.');
            });
            expect(mockHapticError).toHaveBeenCalledTimes(1);
            expect(mockPlayErrorSound).toHaveBeenCalledTimes(1);
            expect(mockHapticSuccess).not.toHaveBeenCalled();
            expect(mockHapticWarning).not.toHaveBeenCalled();
        });

        it('triggers error haptic and sound when title contains "failed"', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('Login Failed', 'Invalid credentials.');
            });
            expect(mockHapticError).toHaveBeenCalledTimes(1);
            expect(mockPlayErrorSound).toHaveBeenCalledTimes(1);
        });

        it('is case-insensitive for "failed" matching', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('OPERATION FAILED', 'Something failed.');
            });
            expect(mockHapticError).toHaveBeenCalledTimes(1);
            expect(mockPlayErrorSound).toHaveBeenCalledTimes(1);
        });

        it('is case-insensitive for "error" matching', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('VALIDATION ERROR', 'Invalid input.');
            });
            expect(mockHapticError).toHaveBeenCalledTimes(1);
            expect(mockPlayErrorSound).toHaveBeenCalledTimes(1);
        });

        it('triggers warning haptic and click sound for generic titles', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('Confirm Action', 'Are you sure?');
            });
            expect(mockHapticWarning).toHaveBeenCalledTimes(1);
            expect(mockPlayClickSound).toHaveBeenCalledTimes(1);
            expect(mockHapticSuccess).not.toHaveBeenCalled();
            expect(mockHapticError).not.toHaveBeenCalled();
        });

        it('triggers warning haptic and click sound when title is empty', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('', 'No title provided.');
            });
            expect(mockHapticWarning).toHaveBeenCalledTimes(1);
            expect(mockPlayClickSound).toHaveBeenCalledTimes(1);
        });

        it('triggers warning haptic and click sound for delete/notification titles', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('Delete All Notifications', 'This action cannot be undone.');
            });
            expect(mockHapticWarning).toHaveBeenCalledTimes(1);
            expect(mockPlayClickSound).toHaveBeenCalledTimes(1);
        });

        it('treats "success" anywhere in the title as a success alert', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('Operation success confirmed', 'Done.');
            });
            expect(mockHapticSuccess).toHaveBeenCalledTimes(1);
            expect(mockPlaySuccessSound).toHaveBeenCalledTimes(1);
        });

        it('prioritizes "success" over neutral routing when title contains "success"', () => {
            const { result } = renderHook(() => useCustomAlert(), { wrapper });
            act(() => {
                result.current.showAlert('Confirm Reassignment', 'Proceed?');
            });
            // "confirm reassignment" - does not include success/error/failed
            expect(mockHapticWarning).toHaveBeenCalledTimes(1);
            expect(mockHapticSuccess).not.toHaveBeenCalled();
            expect(mockHapticError).not.toHaveBeenCalled();
        });
    });
});