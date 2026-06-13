import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Alert, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/database/AppContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddMealScreen() {
  const { addNewMeal, updateMeal, deleteMeal, meals } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  
  const editingMeal = id ? meals.find(m => m.id === parseInt(id, 10)) : undefined;

  const [newMealName, setNewMealName] = useState(editingMeal?.name || '');
  const [newMealPrice, setNewMealPrice] = useState(editingMeal ? String(editingMeal.price) : '');
  const [newMealStock, setNewMealStock] = useState(editingMeal ? String(editingMeal.stock) : '');
  const [newMealAlert, setNewMealAlert] = useState(editingMeal ? String(editingMeal.lowAlert) : '');
  const [newMealEmoji, setNewMealEmoji] = useState(editingMeal?.image || '🫓');
  const [imageUri, setImageUri] = useState<string | null>(
    editingMeal?.image && (editingMeal.image.startsWith('file://') || editingMeal.image.startsWith('content://'))
      ? editingMeal.image
      : null
  );

  useEffect(() => {
    if (editingMeal) {
      setNewMealName(editingMeal.name);
      setNewMealPrice(String(editingMeal.price));
      setNewMealStock(String(editingMeal.stock));
      setNewMealAlert(String(editingMeal.lowAlert));
      setNewMealEmoji(editingMeal.image || '🫓');
      setImageUri(
        editingMeal.image && (editingMeal.image.startsWith('file://') || editingMeal.image.startsWith('content://'))
          ? editingMeal.image
          : null
      );
    }
  }, [editingMeal]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setNewMealEmoji('');
    }
  };

  const handleAddMealSave = () => {
    if (!newMealName || !newMealPrice || !newMealStock) {
      Alert.alert('Validation Error', 'Please fill in meal name, price and opening stock.');
      return;
    }
    
    const price = parseFloat(newMealPrice);
    const stock = parseInt(newMealStock, 10);
    const alertLvl = parseInt(newMealAlert, 10) || 10;
    
    if (isNaN(price) || price < 0 || isNaN(stock) || stock < 0 || isNaN(alertLvl) || alertLvl < 0) {
      Alert.alert('Validation Error', 'Prices and stocks must be positive numbers.');
      return;
    }

    const finalImage = imageUri || newMealEmoji || '🫓';

    if (editingMeal) {
      updateMeal(editingMeal.id, newMealName, price, stock, alertLvl, finalImage);
      Alert.alert("Success", "Meal updated successfully.");
    } else {
      addNewMeal(newMealName, price, stock, alertLvl, finalImage);
      Alert.alert("Success", "Meal added successfully.");
    }

    router.back();
  };

  const handleDeleteMeal = () => {
    if (!editingMeal) return;
    Alert.alert(
      "Delete Menu Item",
      `Are you sure you want to permanently delete ${editingMeal.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            deleteMeal(editingMeal.id);
            router.back();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
      <ScreenHeader title={editingMeal ? 'Edit Menu Item' : 'Add Menu Item'} />
      <KeyboardAvoidingView 
        behavior="padding" 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Meal Name</Text>
            <TextInput
              className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
              placeholder="e.g. Mandazi, Coffee..."
              placeholderTextColor="var(--muted-dark)"
              value={newMealName}
              onChangeText={setNewMealName}
            />
          </View>

          <View className="flex-row gap-4 mb-6">
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Price (KES)</Text>
              <TextInput
                className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="var(--muted-dark)"
                value={newMealPrice}
                onChangeText={setNewMealPrice}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Stock</Text>
              <TextInput
                className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                placeholder="200"
                keyboardType="numeric"
                placeholderTextColor="var(--muted-dark)"
                value={newMealStock}
                onChangeText={setNewMealStock}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Low Stock Alert Level</Text>
            <TextInput
              className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
              placeholder="20"
              keyboardType="numeric"
              placeholderTextColor="var(--muted-dark)"
              value={newMealAlert}
              onChangeText={setNewMealAlert}
            />
          </View>

          <View className="mb-8">
            <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-3 uppercase">Choose Icon or Photo</Text>
            <View className="flex-row items-center gap-4">
              <View className="flex-1 flex-row flex-wrap bg-card border border-border rounded-[16px] p-2 gap-2">
                {['🫓', '☕', '🥘', '🌾', '🍳', '🍞', '🥤', '🍔'].map((emoji, i) => (
                  <TouchableOpacity
                    key={i}
                    className={`w-[45px] h-[45px] rounded-[12px] items-center justify-center ${(!imageUri && newMealEmoji === emoji) ? 'bg-primary/20 border border-primary' : 'bg-input'}`}
                    onPress={() => {
                      setNewMealEmoji(emoji);
                      setImageUri(null);
                    }}
                  >
                    <Text className="text-[24px]">{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="items-center justify-center">
                <Text className="text-[11px] text-muted-foreground mb-2">OR</Text>
                <TouchableOpacity 
                  onPress={pickImage} 
                  className="w-16 h-16 rounded-[16px] bg-card border border-border items-center justify-center overflow-hidden"
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Ionicons name="camera-outline" size={24} color="var(--muted-dark)" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Action Button area at bottom */}
      <View className="absolute bottom-0 w-full px-6 py-4 bg-background/90 border-t border-border-light flex-row gap-3">
        {editingMeal && (
          <TouchableOpacity 
            className="flex-1 bg-destructive/10 border border-destructive/30 rounded-[16px] py-4 items-center justify-center" 
            onPress={handleDeleteMeal}
          >
            <Text className="text-[14px] font-bold text-destructive">Delete Meal</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          className="flex-[2] bg-primary rounded-[16px] py-4 items-center justify-center shadow-sm" 
          onPress={handleAddMealSave}
        >
          <Text className="text-[16px] font-bold text-primary-foreground">{editingMeal ? 'Save Changes' : 'Create Meal'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
