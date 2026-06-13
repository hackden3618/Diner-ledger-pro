import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/database/AppContext';

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

type TabName = 'home' | 'transactions' | 'inventory' | 'debtors' | 'settings';

export default function Index() {
  const { businessName, unreadNotifsCount } = useApp();
  const router = useRouter();
  
  // App State
  const [currentTab, setCurrentTab] = useState<TabName>('home');
  
  const [debtorTab, setDebtorTab] = useState<'debtors' | 'creditors'>('debtors');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [creditorPayModalVisible, setCreditorPayModalVisible] = useState(false);
  const [selectedDebtorName, setSelectedDebtorName] = useState('');
  const [selectedCreditorName, setSelectedCreditorName] = useState('');

  // Greeting
  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const [isReady, setIsReady] = useState(false);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
      {/* HEADER SECTION */}
      <View className="flex-row justify-between items-center px-4 pt-2 pb-4">
        <View>
          <Text className="text-[12px] font-bold text-muted-foreground tracking-[0.5px] uppercase">{greeting}</Text>
          <Text className="text-[20px] font-bold text-foreground">{businessName}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity 
            className="w-10 h-10 rounded-[14px] bg-card border-[0.5px] border-border-light items-center justify-center relative"
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#6b7a6d" />
            {unreadNotifsCount > 0 && (
              <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-danger" />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            className="w-10 h-10 rounded-[14px] bg-primary/10 border-[0.5px] border-primary/20 items-center justify-center"
            onPress={() => setCurrentTab('settings')}
          >
            <Text className="text-[14px] font-bold text-primary">
              {businessName.substring(0, 2).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CORE VIEWPORT */}
      <View className="flex-1 px-4 pt-2 pb-24">
        {currentTab === 'home' && <HomeScreen />}
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

      {/* FLOATING TAB BAR */}
      <FloatingTabBar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Component-Specific Modals */}
      {paymentModalVisible && <PaymentModal visible onClose={() => setPaymentModalVisible(false)} type="debtor" personName={selectedDebtorName} />}
      {creditorPayModalVisible && <PaymentModal visible onClose={() => setCreditorPayModalVisible(false)} type="creditor" personName={selectedCreditorName} />}
    </SafeAreaView>
  );
}
