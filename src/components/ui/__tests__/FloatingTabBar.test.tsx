import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FloatingTabBar from '../FloatingTabBar';

// Mock hapticLight to track calls without triggering native haptics
const mockHapticLight = jest.fn();
jest.mock('../../../utils/haptics', () => ({
    hapticLight: () => mockHapticLight(),
}));

// Mock @expo/vector-icons to avoid native module issues
jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

type TabName = 'home' | 'transactions' | 'inventory' | 'debtors' | 'settings';

describe('FloatingTabBar', () => {
    const mockSetCurrentTab = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all five tab buttons', () => {
        const { getByText } = render(
            <FloatingTabBar
                bottomInset={0}
                currentTab="home"
                setCurrentTab={mockSetCurrentTab}
            />
        );
        expect(getByText('Home')).toBeTruthy();
        expect(getByText('History')).toBeTruthy();
        expect(getByText('Menu')).toBeTruthy();
        expect(getByText('Debts')).toBeTruthy();
        expect(getByText('Settings')).toBeTruthy();
    });

    it('calls setCurrentTab with the pressed tab name when pressing an inactive tab', () => {
        const { getByText } = render(
            <FloatingTabBar
                bottomInset={0}
                currentTab="home"
                setCurrentTab={mockSetCurrentTab}
            />
        );
        fireEvent.press(getByText('History'));
        expect(mockSetCurrentTab).toHaveBeenCalledWith('transactions');
    });

    it('triggers hapticLight when switching to an inactive tab', () => {
        const { getByText } = render(
            <FloatingTabBar
                bottomInset={0}
                currentTab="home"
                setCurrentTab={mockSetCurrentTab}
            />
        );
        fireEvent.press(getByText('History'));
        expect(mockHapticLight).toHaveBeenCalledTimes(1);
    });

    it('does NOT call setCurrentTab when pressing the already-active tab', () => {
        const { getByText } = render(
            <FloatingTabBar
                bottomInset={0}
                currentTab="home"
                setCurrentTab={mockSetCurrentTab}
            />
        );
        fireEvent.press(getByText('Home'));
        expect(mockSetCurrentTab).not.toHaveBeenCalled();
    });

    it('does NOT trigger hapticLight when pressing the already-active tab', () => {
        const { getByText } = render(
            <FloatingTabBar
                bottomInset={0}
                currentTab="home"
                setCurrentTab={mockSetCurrentTab}
            />
        );
        fireEvent.press(getByText('Home'));
        expect(mockHapticLight).not.toHaveBeenCalled();
    });

    it('calls setCurrentTab with correct tab name for each inactive tab', () => {
        const tabs: { label: string; name: TabName }[] = [
            { label: 'Menu', name: 'inventory' },
            { label: 'Debts', name: 'debtors' },
            { label: 'Settings', name: 'settings' },
        ];

        tabs.forEach(({ label, name }) => {
            jest.clearAllMocks();
            const { getByText } = render(
                <FloatingTabBar
                    bottomInset={0}
                    currentTab="home"
                    setCurrentTab={mockSetCurrentTab}
                />
            );
            fireEvent.press(getByText(label));
            expect(mockSetCurrentTab).toHaveBeenCalledWith(name);
            expect(mockHapticLight).toHaveBeenCalledTimes(1);
        });
    });

    it('applies correct accessibility state for active tab', () => {
        const { getAllByRole } = render(
            <FloatingTabBar
                bottomInset={0}
                currentTab="home"
                setCurrentTab={mockSetCurrentTab}
            />
        );
        const buttons = getAllByRole('button');
        // Home is the first button and should be selected
        expect(buttons[0]).toHaveProp('accessibilityState', { selected: true });
        // Other tabs should not be selected
        expect(buttons[1]).toHaveProp('accessibilityState', { selected: false });
    });

    it('updates active state when a different currentTab prop is passed', () => {
        const { getAllByRole, rerender } = render(
            <FloatingTabBar
                bottomInset={0}
                currentTab="home"
                setCurrentTab={mockSetCurrentTab}
            />
        );
        let buttons = getAllByRole('button');
        expect(buttons[0]).toHaveProp('accessibilityState', { selected: true });

        rerender(
            <FloatingTabBar
                bottomInset={0}
                currentTab="transactions"
                setCurrentTab={mockSetCurrentTab}
            />
        );
        buttons = getAllByRole('button');
        expect(buttons[0]).toHaveProp('accessibilityState', { selected: false });
        expect(buttons[1]).toHaveProp('accessibilityState', { selected: true });
    });
});