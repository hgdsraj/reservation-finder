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
    expect(screen.getByText(/Your table is/i)).toBeInTheDocument();
  });

  test('renders platform badges in header', () => {
    render(<App />);
    expect(screen.getAllByText('Resy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OpenTable').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tock').length).toBeGreaterThan(0);
  });

  test('renders feature cards', () => {
    render(<App />);
    expect(screen.getByText('Any city')).toBeInTheDocument();
    expect(screen.getByText('Arrives live')).toBeInTheDocument();
    expect(screen.getByText('Book direct')).toBeInTheDocument();
  });

  test('renders search form', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/city, neighborhood/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /find tables/i })).toBeInTheDocument();
  });
});

describe('App — search interaction', () => {
  test('search button is disabled until a place is selected', async () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /find tables/i });
    expect(btn).toBeDisabled();
  });
});
