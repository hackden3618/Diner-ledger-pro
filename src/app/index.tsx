import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Screens
import HomeScreen from '@/components/screens/HomeScreen';
import TransactionsScreen from '@/components/screens/TransactionsScreen';
import InventoryScreen from '@/components/screens/InventoryScreen';
import DebtorsScreen from '@/components/screens/DebtorsScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';

import PaymentModal from '@/components/modals/PaymentModal';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Import UI
import FloatingTabBar from '@/components/ui/FloatingTabBar';
import { useRouter } from 'expo-router';
import { useKeyboard } from '@/hooks/useKeyboard';

type TabName = 'home' | 'transactions' | 'inventory' | 'debtors' | 'settings';

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = Math.max(insets.bottom, 8);
  
  // App State
  const [currentTab, setCurrentTab] = useState<TabName>('home');
  
  const [debtorTab, setDebtorTab] = useState<'debtors' | 'creditors'>('debtors');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [creditorPayModalVisible, setCreditorPayModalVisible] = useState(false);
  const [selectedDebtorName, setSelectedDebtorName] = useState('');
  const [selectedCreditorName, setSelectedCreditorName] = useState('');

  const [isReady, setIsReady] = useState(false);
  const isKeyboardVisible = useKeyboard();

  useEffect(() => {
    import('@/database/db').then(({ getSetting }) => {
      const hasSeenOnboarding = getSetting('has_seen_onboarding');
      if (hasSeenOnboarding !== 'true') {
        router.replace('/onboarding');
      } else {
        setIsReady(true);
      }
    });
  }, [router]);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#f4f6f4' }}>

      {/* CORE VIEWPORT */}
      <View className="flex-1 px-4 pt-2" style={{ paddingBottom: isKeyboardVisible ? 0 : tabBarBottomInset + 70 }}>
        {currentTab === 'home' && <HomeScreen onNavigateToSettings={() => setCurrentTab('settings')} />}
        {currentTab === 'transactions' && <TransactionsScreen />}
        {currentTab === 'inventory' && (
          <InventoryScreen />
        )}
        {currentTab === 'debtors' && (
          <DebtorsScreen 
            debtorTab={debtorTab}
            setDebtorTab={setDebtorTab}
            setSelectedDebtorName={setSelectedDebtorName}
            setPaymentModalVisible={setPaymentModalVisible}
            setSelectedCreditorName={setSelectedCreditorName}
            setCreditorPayModalVisible={setCreditorPayModalVisible}
          />
        )}
        {currentTab === 'settings' && <SettingsScreen />}
      </View>

      {!isKeyboardVisible && (
        <FloatingTabBar bottomInset={tabBarBottomInset} currentTab={currentTab} setCurrentTab={setCurrentTab} />
      )}

      {/* Component-Specific Modals */}
      {paymentModalVisible && <PaymentModal visible onClose={() => setPaymentModalVisible(false)} type="debtor" personName={selectedDebtorName} />}
      {creditorPayModalVisible && <PaymentModal visible onClose={() => setCreditorPayModalVisible(false)} type="creditor" personName={selectedCreditorName} />}
    </SafeAreaView>
  );
}
