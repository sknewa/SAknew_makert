import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NetworkStatus from '../components/NetworkStatus';

// Mock the useNetworkStatus hook
jest.mock('../hooks/useNetworkStatus', () => ({
  __esModule: true,
  default: () => ({
    isConnected: true,
    isServerReachable: true,
    checkConnection: jest.fn(),
  }),
}));

describe('NetworkStatus Component', () => {
  it('renders correctly when connected', () => {
    const { getByText } = render(<NetworkStatus />);
    expect(getByText('Network: Connected')).toBeTruthy();
    expect(getByText('Server: Reachable')).toBeTruthy();
  });
});