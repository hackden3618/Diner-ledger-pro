import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/database/AppContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNotificationBridge from '@/components/notifications/AppNotificationBridge';
import '@/global.css';
import { CalculationsProvider } from '@/database/CalculationsContext';

export default function RootLayout() {

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <AppProvider>
                    <CalculationsProvider>
                        <BottomSheetModalProvider>
                            <StatusBar style="auto" />
                            <AppNotificationBridge />
                            <Stack screenOptions={{ headerShown: false }} />
                        </BottomSheetModalProvider>
                    </CalculationsProvider>
                </AppProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
