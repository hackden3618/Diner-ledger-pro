import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/database/AppContext';
import { useRouter } from 'expo-router';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ActionDropdown from '@/components/ui/ActionDropdown';
import InfoAlert from '@/components/ui/InfoAlert';

export default function DispatchTakeoutScreen() {
  const { meals, dispatchTakeout, transactions } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  const [staffName, setStaffName] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ mealId: number; name: string; qty: number; price: number }[]>([]);

  const staffMembers = Array.from(new Set(transactions.map((t) => t.operant).filter(Boolean))) as string[];

  const handleIncrement = (mealId: number, name: string, price: number, stock: number) => {
    setSelectedItems(prev => {
      const existing = prev.find(item => item.mealId === mealId);
      if (existing) {
        if (existing.qty >= stock) {
          Alert.alert('Stock Limit', 'Cannot dispatch more than available stock.');
          return prev;
        }
        return prev.map(item => item.mealId === mealId ? { ...item, qty: item.qty + 1 } : item);
      }
      if (stock > 0) {
        return [...prev, { mealId, name, qty: 1, price }];
      } else {
        Alert.alert('Out of Stock', 'This meal is currently out of stock.');
        return prev;
      }
    });
  };

  const handleDecrement = (mealId: number) => {
    setSelectedItems(prev => {
      const existing = prev.find(item => item.mealId === mealId);
      if (existing && existing.qty > 1) {
        return prev.map(item => item.mealId === mealId ? { ...item, qty: item.qty - 1 } : item);
      }
      return prev.filter(item => item.mealId !== mealId);
    });
  };

  const handleSetQuantity = (mealId: number, name: string, price: number, stock: number, text: string) => {
    const qty = parseInt(text) || 0;
    setSelectedItems(prev => {
      if (qty <= 0) {
        return prev.filter(item => item.mealId !== mealId);
      }
      
      const cappedQty = Math.min(qty, stock);
      const existing = prev.find(item => item.mealId === mealId);
      if (existing) {
        return prev.map(item => item.mealId === mealId ? { ...item, qty: cappedQty } : item);
      }
      return [...prev, { mealId, name, qty: cappedQty, price }];
    });
  };

  const handleDispatch = () => {
    if (!staffName.trim()) {
      Alert.alert('Validation Error', 'Please provide the staff member name taking out the goods.');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one item.');
      return;
    }
    try {
      dispatchTakeout(staffName, selectedItems);
      resetForm();
      router.back();
    } catch (error) {
      Alert.alert(
        'Dispatch Failed',
        error instanceof Error ? error.message : 'The dispatch could not be recorded.',
      );
    }
  };

  const resetForm = () => {
    setStaffName('');
    setSelectedItems([]);
  };

  const availableMeals = meals.filter(m => m.isAvailable === 1);
  const totalItems = selectedItems.reduce((sum, item) => sum + item.qty, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
      <ScreenHeader title="Dispatch Takeout" subtitle="Assign goods for outside catering" />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: bottomInset + 16 }} keyboardShouldPersistTaps="handled">

          <View className="px-5 pt-4">
            <InfoAlert message={
              <Text>
                Dispatching items automatically deducts them from your kitchen stock. Reconciling the session will handle cash and restock any unsold items.
              </Text>
            } />
          </View>

          <View className="px-5 py-2">
            <ActionDropdown
              label="STAFF MEMBER DISPATCHED TO"
              value={staffName}
              onChange={setStaffName}
              options={staffMembers}
              modalTitle="Select Staff"
              isRequired
            />
          </View>

          <View className="px-5 py-4">
            {availableMeals.map((item) => {
              const selectedQty = selectedItems.find(i => i.mealId === item.id)?.qty || 0;
              return (
                <View key={item.id} className="flex-row items-center justify-between mb-4 bg-card p-3 rounded-[10px] border-[0.5px] border-border">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-primary/10 border-[0.5px] border-primary/20 items-center justify-center mr-3">
                      <Text className="text-[14px] font-bold text-primary">{item.name.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text className="text-[13px] font-bold text-foreground">{item.name}</Text>
                      <Text className="text-[11px] text-muted-foreground mt-0.5">Stock: {item.stock}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center bg-muted rounded-lg">
                    <TouchableOpacity 
                      className="w-8 h-8 items-center justify-center"
                      onPress={() => handleDecrement(item.id)}
                    >
                      <Ionicons name="remove" size={16} color={selectedQty > 0 ? "#e74c3c" : "#4a5e4c"} />
                    </TouchableOpacity>
                    <TextInput
                      className="text-[13px] font-bold text-foreground w-10 text-center"
                      keyboardType="numeric"
                      value={selectedQty > 0 ? selectedQty.toString() : ''}
                      onChangeText={(text) => handleSetQuantity(item.id, item.name, item.price, item.stock, text)}
                      placeholder="0"
                      placeholderTextColor="#8a9e8c"
                    />
                    <TouchableOpacity 
                      className="w-8 h-8 items-center justify-center"
                      onPress={() => handleIncrement(item.id, item.name, item.price, item.stock)}
                    >
                      <Ionicons name="add" size={16} color="#2ecc71" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          <View
            className="flex-row gap-2 px-5 pt-3 border-t-[0.5px] border-border bg-background"
            style={{ paddingBottom: bottomInset }}
          >
            <View className="flex-1 bg-card rounded-[10px] justify-center px-4">
              <Text className="text-[10px] text-muted-foreground">Total Items</Text>
              <Text className="text-[14px] font-bold text-primary">{totalItems}</Text>
            </View>
            <TouchableOpacity
              className="flex-[2] bg-primary rounded-[10px] py-3 items-center justify-center"
              onPress={handleDispatch}
            >
              <Text className="text-[13px] font-bold text-background">Dispatch Session</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
