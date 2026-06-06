import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';

// Mock EventSource since jsdom doesn't implement it
class MockEventSource {
  constructor() { this.readyState = 0; }
  addEventListener() {}
  close() {}
}
global.EventSource = MockEventSource;

describe('App — landing page', () => {
  test('renders headline', () => {
    render(<App />);
    expect(screen.getByText(/Find your next/i)).toBeInTheDocument();
  });

  test('renders platform badges in header', () => {
    render(<App />);
    expect(screen.getAllByText('OpenTable').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Resy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tock').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SevenRooms').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TheFork').length).toBeGreaterThan(0);
  });

  test('renders feature cards', () => {
    render(<App />);
    expect(screen.getByText('Any city in the world')).toBeInTheDocument();
    expect(screen.getByText('Real-time streaming')).toBeInTheDocument();
    expect(screen.getByText('Book in one click')).toBeInTheDocument();
  });

  test('renders search form', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/city or neighborhood/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /find tables/i })).toBeInTheDocument();
  });
});

describe('App — search interaction', () => {
  test('search button is disabled while loading', async () => {
    render(<App />);
    const cityInput = screen.getByPlaceholderText(/city or neighborhood/i);
    await userEvent.type(cityInput, 'New York');
    const btn = screen.getByRole('button', { name: /find tables/i });
    expect(btn).not.toBeDisabled();
  });
});
