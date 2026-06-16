import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';

export interface AlertButton {
    text?: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertModalProps {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
    onClose: () => void;
}

export default function CustomAlertModal({
    visible,
    title,
    message,
    buttons,
    onClose
}: CustomAlertModalProps) {
    const handlePress = (button: AlertButton) => {
        onClose();
        if (button.onPress) {
            // Need a slight delay to allow the modal to close before executing the action,
            // especially if the action opens another modal or navigates
            setTimeout(() => {
                button.onPress!();
            }, 50);
        }
    };

    // Default button if none provided (matching standard Alert.alert behavior)
    const normalizedButtons = buttons && buttons.length > 0 
        ? buttons 
        : [{ text: 'OK', onPress: () => {} }];

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            animationIn="fadeInUp"
            animationOut="fadeOutDown"
            animationInTiming={200}
            animationOutTiming={200}
            backdropOpacity={0.4}
            useNativeDriver
            hideModalContentWhileAnimating
            style={{ margin: 24, justifyContent: 'center' }}
        >
            <View className="bg-card rounded-[24px] overflow-hidden border border-border shadow-lg">
                <ScrollView 
                    className="max-h-[300px]" 
                    contentContainerStyle={{ padding: 24 }}
                    bounces={false}
                >
                    <Text className="text-[18px] font-bold text-foreground text-center mb-2">
                        {title}
                    </Text>
                    {message ? (
                        <Text className="text-[14px] text-muted-foreground text-center leading-5">
                            {message}
                        </Text>
                    ) : null}
                </ScrollView>

                <View className={`flex-row border-t border-border-light bg-muted/30 ${normalizedButtons.length > 2 ? 'flex-col' : ''}`}>
                    {normalizedButtons.map((btn, index) => {
                        const isDestructive = btn.style === 'destructive';
                        const isCancel = btn.style === 'cancel';
                        const isLast = index === normalizedButtons.length - 1;

                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handlePress(btn)}
                                className={`
                                    flex-1 py-4 items-center justify-center
                                    ${!isLast && normalizedButtons.length <= 2 ? 'border-r border-border-light' : ''}
                                    ${!isLast && normalizedButtons.length > 2 ? 'border-b border-border-light' : ''}
                                `}
                            >
                                <Text
                                    className={`text-[15px] ${isCancel ? 'font-medium text-muted-foreground' : 'font-bold'} ${
                                        isDestructive 
                                            ? 'text-destructive' 
                                            : isCancel 
                                                ? 'text-foreground' 
                                                : 'text-primary'
                                    }`}
                                >
                                    {btn.text || 'OK'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </Modal>
    );
}
