import React, { createContext, useContext, useState, ReactNode } from 'react';
import CustomAlertModal, { AlertButton } from '../components/ui/CustomAlertModal';
import { hapticSuccess, hapticError, hapticWarning } from '../utils/haptics';
import { playSuccessSound, playErrorSound, playClickSound } from '../utils/sounds';

interface AlertState {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
}

interface AlertContextType {
    showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

/**
 * Provides alert context and modal functionality to child components.
 *
 * Makes the `showAlert` function available to child components via context, enabling
 * them to display custom alert modals with optional messages and buttons. Automatically
 * triggers haptic and audio feedback when alerts are displayed.
 */
export function AlertProvider({ children }: { children: ReactNode }) {
    const [alertState, setAlertState] = useState<AlertState>({
        visible: false,
        title: '',
    });

    const showAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
        setAlertState({
            visible: true,
            title,
            message,
            buttons,
        });

        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('success')) {
            hapticSuccess();
            playSuccessSound();
        } else if (lowerTitle.includes('failed') || lowerTitle.includes('error')) {
            hapticError();
            playErrorSound();
        } else {
            hapticWarning();
            playClickSound();
        }
    };

    const closeAlert = () => {
        setAlertState((prev) => ({ ...prev, visible: false }));
    };

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            <CustomAlertModal
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                buttons={alertState.buttons}
                onClose={closeAlert}
            />
        </AlertContext.Provider>
    );
}

export function useCustomAlert() {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useCustomAlert must be used within an AlertProvider');
    }
    return context;
}
