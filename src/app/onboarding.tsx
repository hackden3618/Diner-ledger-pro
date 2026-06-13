import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/database/AppContext';
import { updateSetting } from '@/database/db';


const slides = [
    {
        id: '1',
        icon: 'restaurant' as const,
        iconColor: '#ff6b6b',
        title: 'Holla! Welcome to Book-keep Diner Pro',
        description: 'Your premium, automated ledger for seamless diner and restaurant management.',
    },
    {
        id: '2',
        icon: 'analytics' as const,
        iconColor: '#4ecdc4',
        title: 'Smart Financial Tracking',
        description: 'Automatically track sales, handle overpayments, and manage suppliers with zero friction.',
    },
    {
        id: '3',
        icon: 'document-text' as const,
        iconColor: '#feca57',
        title: 'Automated Ledger PDF',
        description: 'Generate beautiful, professional PDF reports of your day-to-day transactions.',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { saveBusinessName } = useApp();

    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [businessNameInput, setBusinessNameInput] = useState('');

    const handleNext = () => {
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
        } else {
            // Finish Onboarding
            if (businessNameInput.trim()) {
                saveBusinessName(businessNameInput.trim());
            }
            updateSetting('has_seen_onboarding', 'true');
            router.replace('/');
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Progress Indicators */}
                    <View className="flex-row justify-center mt-6 mb-10 gap-2 px-6">
                        {slides.map((_, index) => (
                            <View
                                key={index}
                                className={`h-2 rounded-full ${currentSlideIndex === index ? 'w-8 bg-primary' : 'w-2 bg-muted-dark'
                                    }`}
                            />
                        ))}
                    </View>

                    <View className="flex-1 px-8 items-center justify-center">
                        <View
                            className="w-32 h-32 rounded-full items-center justify-center mb-8 shadow-sm"
                            style={{ backgroundColor: `${slides[currentSlideIndex].iconColor}20` }}
                        >
                            <Ionicons
                                name={slides[currentSlideIndex].icon}
                                size={64}
                                color={slides[currentSlideIndex].iconColor}
                            />
                        </View>

                        <Text className="text-[28px] font-extrabold text-foreground text-center leading-tight mb-4">
                            {slides[currentSlideIndex].title}
                        </Text>

                        <Text className="text-[16px] text-muted-foreground text-center leading-relaxed mb-10">
                            {slides[currentSlideIndex].description}
                        </Text>

                        {currentSlideIndex === slides.length - 1 && (
                            <View className="w-full mt-4 bg-card border-[0.5px] border-border rounded-[16px] p-6 shadow-sm">
                                <Text className="text-[13px] font-bold text-foreground mb-4 uppercase tracking-[1px] text-center">
                                    {"Let's set up your diner"}
                                </Text>

                                <View className="mb-4">
                                    <Text className="text-[11px] font-bold text-muted-foreground tracking-[1px] mb-2 uppercase">Business Name</Text>
                                    <TextInput
                                        className="bg-input border-[0.5px] border-border rounded-[12px] text-foreground text-[15px] px-4 py-4"
                                        placeholder="e.g. Mega Diner"
                                        placeholderTextColor="var(--muted-dark)"
                                        value={businessNameInput}
                                        onChangeText={setBusinessNameInput}
                                        autoCapitalize="words"
                                    />
                                </View>

                                <View className="flex-row items-start bg-primary/10 p-3 rounded-[10px]">
                                    <Ionicons name="bulb-outline" size={18} color="#2ecc71" style={{ marginTop: 2 }} />
                                    <Text className="text-[12px] text-primary-dark ml-2 flex-1">
                                        You can add your Staff members and Suppliers later in the Settings tab!
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View className="px-8 mt-10">
                        <TouchableOpacity
                            className="w-full bg-primary rounded-[16px] py-4 items-center justify-center shadow-md flex-row"
                            onPress={handleNext}
                        >
                            <Text className="text-[16px] font-bold text-primary-foreground mr-2">
                                {currentSlideIndex === slides.length - 1 ? "Let's Go!" : "Continue"}
                            </Text>
                            {currentSlideIndex < slides.length - 1 && (
                                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
