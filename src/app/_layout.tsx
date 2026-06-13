import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/database/AppContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNotificationBridge from '@/components/notifications/AppNotificationBridge';
import '@/global.css';

export default function RootLayout() {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <AppNotificationBridge />
            <Stack screenOptions={{ headerShown: false }} />
          </BottomSheetModalProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
