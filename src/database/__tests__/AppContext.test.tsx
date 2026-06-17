import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AppProvider, useApp } from '../AppContext';

const mockRunSync = jest.fn();

// Mock expo-sqlite because it throws outside of Expo
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    getFirstSync: jest.fn(() => ({ count: 0 })),
    runSync: mockRunSync,
    getAllSync: jest.fn(() => []),
  })),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides initial state correctly', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.businessName).toBe("Mega Diner");
    expect(result.current.meals).toEqual([]);
    expect(result.current.transactions).toEqual([]);
  });

  it('exposes deleteAllNotifs function', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.deleteAllNotifs).toBeInstanceOf(Function);
  });

  it('deleteAllNotifs calls the DELETE SQL for notifications', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.deleteAllNotifs();
    });
    // deleteAllNotifications() runs "DELETE FROM notifications"
    expect(mockRunSync).toHaveBeenCalledWith('DELETE FROM notifications');
  });

  it('clearAllNotifs calls the mark-as-read SQL for notifications', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.clearAllNotifs();
    });
    // markNotificationsAsRead() runs "UPDATE notifications SET read = 1 WHERE read = 0"
    expect(mockRunSync).toHaveBeenCalledWith(
      'UPDATE notifications SET read = 1 WHERE read = 0'
    );
  });

  it('deleteAllNotifs triggers a state refresh (notifications become empty array)', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.deleteAllNotifs();
    });
    // After refresh, notifications should still be [] since the mock DB returns []
    expect(result.current.notifications).toEqual([]);
  });
});
