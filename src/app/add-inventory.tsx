import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/database/AppContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomAlert } from "@/context/AlertContext";

export default function AddInventoryScreen() {
    const { showAlert } = useCustomAlert();
  const { addRawInventoryItem, updateRawInventoryItem, inventoryItems } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  
  const editingItem = id ? inventoryItems.find(i => i.id === parseInt(id, 10)) : undefined;

  const [itemName, setItemName] = useState(editingItem?.name || '');
  const [stockLevel, setStockLevel] = useState(editingItem ? String(editingItem.stockLevel) : '');
  const [unit, setUnit] = useState(editingItem?.unit || 'kg');
  const [price, setPrice] = useState(editingItem ? String(editingItem.price) : '');
  const [imageUri, setImageUri] = useState<string | null>(editingItem?.imageUri || null);

  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.name);
      setStockLevel(String(editingItem.stockLevel));
      setUnit(editingItem.unit);
      setPrice(String(editingItem.price));
      setImageUri(editingItem.imageUri || null);
    }
  }, [editingItem]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!itemName || !stockLevel || !price || !unit) {
      showAlert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    
    const parsedStock = parseFloat(stockLevel);
    const parsedPrice = parseFloat(price);
    
    if (isNaN(parsedStock) || parsedStock < 0 || isNaN(parsedPrice) || parsedPrice < 0) {
      showAlert('Validation Error', 'Stock and price must be positive numbers.');
      return;
    }

    if (editingItem) {
      updateRawInventoryItem(editingItem.id, itemName, parsedStock, unit, parsedPrice, imageUri || undefined);
      showAlert("Success", "Inventory item updated.");
    } else {
      addRawInventoryItem(itemName, parsedStock, unit, parsedPrice, imageUri || undefined);
      showAlert("Success", "Inventory item added.");
    }

    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
      <ScreenHeader title={editingItem ? 'Edit Raw Inventory' : 'Add Raw Inventory'} />
      <KeyboardAvoidingView 
        behavior="padding" 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ padding: 24, paddingBottom: bottomInset + 104 }} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Item Name</Text>
            <TextInput
              className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
              placeholder="e.g. Wheat Flour, Sugar, Cooking Oil..."
              placeholderTextColor="var(--muted-dark)"
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          <View className="flex-row gap-4 mb-6">
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Initial Stock</Text>
              <TextInput
                className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="var(--muted-dark)"
                value={stockLevel}
                onChangeText={setStockLevel}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Unit of Measure</Text>
              <TextInput
                className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                placeholder="kg, liters, packets"
                placeholderTextColor="var(--muted-dark)"
                value={unit}
                onChangeText={setUnit}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Estimated Price / Unit (KES)</Text>
            <TextInput
              className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor="var(--muted-dark)"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          <View className="mb-8">
            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-3 uppercase">Photo Reference (Optional)</Text>
            <TouchableOpacity 
              onPress={pickImage} 
              className="w-24 h-24 rounded-[16px] bg-card border border-border items-center justify-center overflow-hidden"
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View className="items-center">
                  <Ionicons name="camera-outline" size={32} color="var(--muted-dark)" />
                  <Text className="text-[10px] text-muted-foreground mt-1">Tap to add</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="absolute bottom-0 w-full px-6 bg-background border-t border-border-light pt-4"
        style={{ paddingBottom: bottomInset }}
      >
        <TouchableOpacity 
          className="w-full bg-primary rounded-[16px] py-4 items-center justify-center shadow-sm" 
          onPress={handleSave}
        >
          <Text className="text-[16px] font-bold text-primary-foreground">{editingItem ? 'Save Changes' : 'Add Item'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
