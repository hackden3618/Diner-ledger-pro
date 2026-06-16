import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TabName = 'home' | 'transactions' | 'inventory' | 'debtors' | 'settings';

type FloatingTabBarProps = {
  bottomInset: number;
  currentTab: TabName;
  setCurrentTab: (tab: TabName) => void;
};

const tabs: { name: TabName; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'home', label: 'Home', icon: 'home-sharp' },
  { name: 'transactions', label: 'History', icon: 'list' },
  { name: 'inventory', label: 'Menu', icon: 'fast-food' },
  { name: 'debtors', label: 'Debts', icon: 'people' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

export default function FloatingTabBar({ bottomInset, currentTab, setCurrentTab }: FloatingTabBarProps) {
  return (
    <View style={[styles.shell, { paddingBottom: bottomInset }]}>
      <View style={styles.items}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.name;

          return (
            <TouchableOpacity
              key={tab.name}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={() => setCurrentTab(tab.name)}
              style={styles.item}
            >
              <Ionicons name={tab.icon} size={21} color={isActive ? '#1f9f55' : '#879689'} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.label, isActive ? styles.activeLabel : styles.inactiveLabel]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dbe4dd',
    borderRadius: 30,
    position: 'absolute',
    bottom:30,
    marginInline: 9,
    backgroundColor: '#fbfdfb',
    shadowColor: '#0f2015',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  items: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '700',
    maxWidth: '100%',
  },
  activeLabel: {
    color: '#1f9f55',
  },
  inactiveLabel: {
    color: '#7d8d80',
  },
});
