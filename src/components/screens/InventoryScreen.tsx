import { useApp } from "@/database/AppContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { resolveMenuItemImageSource } from "@/utils/menuItemImages";

export default function InventoryScreen() {
  const { meals } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredMeals = meals
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aDepleted = a.stock <= 0 ? 2 : a.stock <= a.lowAlert ? 1 : 0;
      const bDepleted = b.stock <= 0 ? 2 : b.stock <= b.lowAlert ? 1 : 0;
      if (aDepleted !== bDepleted) return aDepleted - bDepleted;
      return a.name.localeCompare(b.name);
    });

  const getPlaceholderColor = (name: string) => {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#F7B731", 
      "#5F27CD", "#00D2D3", "#FF9FF3", "#54A0FF"
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <View className="flex-1 bg-muted">
      {/* Search Header */}
      <View className="bg-card px-4 pt-4 pb-3 border-b border-border-light shadow-sm z-10">
        <View className="flex-row items-center bg-input border-[0.5px] border-border-strong rounded-[16px] px-4 py-3 mb-4">
          <Ionicons name="search" size={18} color="#6b7a6d" />
          <TextInput
            className="flex-1 text-foreground text-[14px] p-0 ml-2"
            placeholder="Search menu items..."
            placeholderTextColor="#a1b0a3"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#a1b0a3" />
            </TouchableOpacity>
          )}
        </View>

        {/* Prominent Add Meal button */}
        <TouchableOpacity
          className="bg-primary py-4 rounded-[12px] items-center justify-center flex-row gap-2 shadow-sm"
          onPress={() => router.push('/add-meal')}
        >
          <Ionicons name="add-circle" size={20} color="#ffffff" />
          <Text className="text-[14px] font-bold text-primary-foreground tracking-[0.5px]">Add New Menu Item</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredMeals}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center py-10 bg-card rounded-[16px] border-[0.5px] border-border-light shadow-sm">
            <Ionicons name="fast-food-outline" size={40} color="#a1b0a3" />
            <Text className="text-[14px] text-foreground font-bold mt-3">No meals found</Text>
            <Text className="text-[12px] text-muted-foreground mt-1">Try adjusting your search</Text>
          </View>
        }
        renderItem={({ item: meal }) => {
          const isLow = meal.stock <= meal.lowAlert;
          const stockPct = meal.lowAlert > 0 ? Math.min(100, (meal.stock / meal.lowAlert) * 100) : 100;
          const imageSource = resolveMenuItemImageSource(meal.image, meal.name);
          const color = getPlaceholderColor(meal.name);

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/add-meal', params: { id: meal.id } })}
              className="bg-card rounded-[16px] overflow-hidden border border-border-light mb-5 shadow-sm"
            >
              {/* Image Banner */}
              <View className="w-full h-[180px] bg-muted relative items-center justify-center">
                {imageSource ? (
                  <Image source={imageSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View 
                    className="w-full h-full items-center justify-center opacity-80"
                    style={{ backgroundColor: color }}
                  >
                    {meal.image ? (
                      <Text style={{ fontSize: 64 }}>{meal.image}</Text>
                    ) : (
                      <Ionicons name="fast-food" size={64} color={color} />
                    )}
                  </View>
                )}

                {/* Badge */}
                {isLow && (
                  <View className="absolute top-3 right-3 bg-destructive/90 px-3 py-1.5 rounded-[8px] shadow-sm">
                    <Text className="text-[10px] font-bold text-background uppercase tracking-[0.5px]">Low Stock</Text>
                  </View>
                )}
              </View>

              {/* Content Details */}
              <View className="p-5">
                <View className="flex-row justify-between items-center mb-0.5">
                  <Text className="text-[18px] font-bold text-foreground flex-1" numberOfLines={1}>
                    {meal.name}
                  </Text>
                  <Text className="text-[16px] font-bold text-primary ml-2">
                    KES {meal.price.toLocaleString()}
                  </Text>
                </View>

                <Text className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.5px] mb-4">
                  SKU: M-{meal.id.toString().padStart(3, '0')}
                </Text>

                <View className="flex-row items-center pt-2">
                  <View 
                    className={`w-[46px] h-[46px] rounded-full border-[3px] items-center justify-center mr-3 ${
                      isLow ? 'border-destructive' : 'border-primary'
                    }`}
                  >
                    <Text className={`text-[10px] font-bold ${isLow ? 'text-destructive' : 'text-primary'}`}>
                      {stockPct.toFixed(0)}%
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[14px] font-bold text-foreground">{meal.stock} servings</Text>
                    <Text className="text-[11px] text-muted-foreground">Threshold: {meal.lowAlert}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
