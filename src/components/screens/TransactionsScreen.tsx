import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/database/AppContext';
import ScreenHeader from '../ui/ScreenHeader';

export default function TransactionsScreen() {
    const { transactions } = useApp();
    const [txSearch, setTxSearch] = useState('');
    const [txFilter, setTxFilter] = useState<'all' | 'sale' | 'credit' | 'expense' | 'purchase'>('all');

    return (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
                <ScreenHeader title="Transactions" subtitle="Quickly view all the recent transactions" showBackButton={false} />
                <View className='fixed'>
                    <View className="flex-row items-center mt-1 bg-muted border-[0.5px] border-border-strong rounded-[10px] px-3 py-2 mb-[10px]">
                        <Ionicons name="search" size={18} color="#6b7a6d" />
                        <TextInput
                            className="flex-1 text-foreground text-[13px] p-0 ml-2"
                            placeholder="Search history..."
                            placeholderTextColor="#6b7a6d"
                            value={txSearch}
                            onChangeText={setTxSearch}
                        />
                    </View>

                    {/* Filter pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-3">
                        {['all', 'sale', 'credit', 'expense', 'purchase'].map((filter, i) => {
                            const isActive = txFilter === filter;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    className={`py-1.5 px-3 rounded-[20px] bg-muted border-[0.5px] border-border-strong mr-1.5 ${isActive ? 'bg-primary/10 border-primary/30' : ''
                                        }`}
                                    onPress={() => setTxFilter(filter as any)}
                                >
                                    <Text className={`text-[10px] font-semibold text-muted-foreground ${isActive ? 'text-primary' : ''}`}>
                                        {filter.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 80 }}
            >

                {/* Transactions lists */}
                <View className="mt-2">
                    {transactions
                        .filter(t => {
                            const matchSearch = t.title.toLowerCase().includes(txSearch.toLowerCase()) || t.description.toLowerCase().includes(txSearch.toLowerCase());
                            if (txFilter === 'all') return matchSearch;
                            if (txFilter === 'sale') return matchSearch && t.type === 'sale';
                            if (txFilter === 'credit') return matchSearch && t.paymentMethod === 'credit';
                            if (txFilter === 'expense') return matchSearch && t.type === 'expense';
                            if (txFilter === 'purchase') return matchSearch && t.type === 'purchase';
                            return matchSearch;
                        })
                        .map((tx, idx) => {
                            const isOutflow = ['expense', 'purchase', 'creditor_payment', 'collection', 'refund'].includes(tx.type);
                            const isFlow = ['takeaway', 'consumed', 'adjustment', 'day_close', 'takeout_reconciliation'].includes(tx.type);
                            const txColor = isFlow ? "#f39c12" : isOutflow ? "#e74c3c" : "#2ecc71";
                            const amtSign = isOutflow ? '-' : '+';
                            const date = new Date(tx.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });

                            return (
                                <View key={idx} className="flex-row items-center py-2.5 border-b-[0.5px] border-border gap-[10px]">
                                    <View
                                        className={`w-8 h-8 rounded-2xl items-center justify-center ${isOutflow ? 'bg-destructive/10' : isFlow ? 'bg-warning/10' : 'bg-primary/10'}`}
                                    >
                                        <Ionicons name={isOutflow ? "trending-down" : isFlow ? "swap-horizontal" : "trending-up"} size={16} color={txColor} />
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row items-center">
                                            <Text className="text-[13px] font-medium text-foreground">{tx.title}</Text>
                                            <Text className="text-[8px] text-muted-foreground bg-muted px-1 py-[1px] rounded-[3px] ml-1.5">{date}</Text>
                                        </View>
                                        <Text className="text-[10px] text-muted-foreground mt-[1px]">{tx.description}</Text>
                                    </View>
                                    <Text style={{ color: txColor }} className="text-[12px] font-bold">
                                        {isFlow ? 'Flow' : `${amtSign}KES ${tx.amount.toLocaleString()}`}
                                    </Text>
                                </View>
                            );
                        })}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
