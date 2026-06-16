import React, { createContext, useContext, useState, ReactNode } from 'react';
import CustomAlertModal, { AlertButton } from '../components/ui/CustomAlertModal';
import { hapticSuccess, hapticError, hapticWarning } from '../utils/haptics';

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
        } else if (lowerTitle.includes('failed') || lowerTitle.includes('error')) {
            hapticError();
        } else {
            hapticWarning();
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
