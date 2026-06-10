import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AppProvider, useApp } from '../AppContext';

// Mock expo-sqlite because it throws outside of Expo
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    getFirstSync: jest.fn(() => ({ count: 0 })),
    runSync: jest.fn(),
    getAllSync: jest.fn(() => []),
  })),
}));

describe('AppContext', () => {
  it('provides initial state correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppProvider>{children}</AppProvider>
    );
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.businessName).toBe("Mega Diner");
    expect(result.current.meals).toEqual([]);
    expect(result.current.transactions).toEqual([]);
  });
});
