import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export default function ScreenHeader({ title, subtitle, showBackButton = true }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center px-4 py-1 border-b border-border-light bg-background/80">
      {showBackButton && (
        <TouchableOpacity 
          className="w-10 h-10 rounded-full items-center justify-center bg-card border border-border"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="var(--foreground)" />
        </TouchableOpacity>
      )}
      
      <View className="ml-4 flex-1">
        <Text className="text-[18px] font-bold text-foreground tracking-[0.5px]">{title}</Text>
        {subtitle && (
          <Text className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</Text>
        )}
      </View>
    </View>
  );
}
