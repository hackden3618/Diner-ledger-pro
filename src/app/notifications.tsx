import { useApp } from "@/database/AppContext";
import React from "react";
import { Text, TouchableOpacity, View, FlatList, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { useCustomAlert } from "@/context/AlertContext";

/**
 * Displays a system notifications screen with a list of notifications and options to mark all as read or delete all.
 */
export default function NotificationsScreen() {
    const { notifications, clearAllNotifs, deleteAllNotifs } = useApp();
    const { showAlert } = useCustomAlert();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, 12);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f4' }}>
            <ScreenHeader title="System Notifications" subtitle="Alerts and messages" />
            <View className="flex-1 w-full px-4 pt-4 bg-background" style={{ paddingBottom: bottomInset }}>
                <FlatList
                    data={notifications}
                    keyExtractor={(item, idx) => `${item.id}-${idx}`}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-10">
                            <Text className="text-[11px] text-muted-foreground text-center">
                                All systems operational. No unread warnings.
                            </Text>
                        </View>
                    }
                    renderItem={({ item: n }) => (
                        <View className="flex-row py-3 border-b-[0.5px] border-border gap-2.5 items-start">
                            <View
                                className={`w-2 h-2 rounded-full mt-1 ${n.read === 0 ? "bg-destructive" : "bg-transparent"
                                    }`}
                            />
                            <View className="flex-1">
                                <Text className="text-[12px] font-bold text-foreground">
                                    {n.title}
                                </Text>
                                <Text className="text-[10px] text-muted-foreground my-0.5">
                                    {n.message}
                                </Text>
                                <Text className="text-[8px] text-muted-foreground">
                                    {new Date(n.date).toLocaleDateString()} ·{" "}
                                    {new Date(n.date).toLocaleTimeString()}
                                </Text>
                            </View>
                        </View>
                    )}
                />

                <View className="flex-row gap-2 mt-2.5">
                    <TouchableOpacity
                        className="flex-1 bg-card border-[0.5px] border-border-strong rounded-[10px] py-4 items-center justify-center"
                        onPress={() => {
                            clearAllNotifs();
                            router.back();
                        }}
                    >
                        <Text className="text-[13px] font-bold text-foreground">
                            Mark All Read
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 bg-destructive/10 border-[0.5px] border-destructive/30 rounded-[10px] py-4 items-center justify-center"
                        onPress={() => {
                            showAlert(
                                "Delete All Notifications",
                                "Are you sure you want to permanently delete all notifications? This action cannot be undone.",
                                [
                                    {
                                        text: "Cancel",
                                        style: "cancel"
                                    },
                                    {
                                        text: "Delete All",
                                        style: "destructive",
                                        onPress: () => {
                                            deleteAllNotifs();
                                            router.back();
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Text className="text-[13px] font-bold text-destructive">
                            Clear All
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
