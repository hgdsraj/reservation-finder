import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RestaurantCard } from '../components/RestaurantCard.jsx';

const MOCK_RESTAURANT = {
  id: 'opentable-123',
  name: 'The French Laundry',
  platform: 'opentable',
  cuisine: 'French, American',
  neighborhood: 'Yountville',
  address: '6640 Washington St',
  price: '$$$$',
  rating: '4.8',
  reviewCount: 2150,
  photos: ['https://example.com/photo.jpg'],
  description: 'World-class tasting menu.',
  bookingUrl: 'https://www.opentable.com/r/the-french-laundry',
  slots: [
    { time: '18:00', url: 'https://www.opentable.com/book?time=18:00' },
    { time: '19:00', url: 'https://www.opentable.com/book?time=19:00' },
    { time: '20:00', url: 'https://www.opentable.com/book?time=20:00' },
  ],
};

const SEARCH_PARAMS = { date: '2026-07-01', partySize: 2, time: '19:00' };

describe('RestaurantCard', () => {
  test('renders restaurant name', () => {
    render(<RestaurantCard restaurant={MOCK_RESTAURANT} searchParams={SEARCH_PARAMS} />);
    expect(screen.getByText('The French Laundry')).toBeInTheDocument();
  });

  test('renders cuisine', () => {
    render(<RestaurantCard restaurant={MOCK_RESTAURANT} searchParams={SEARCH_PARAMS} />);
    expect(screen.getByText('French, American')).toBeInTheDocument();
  });

  test('renders neighborhood', () => {
    render(<RestaurantCard restaurant={MOCK_RESTAURANT} searchParams={SEARCH_PARAMS} />);
    expect(screen.getByText('Yountville')).toBeInTheDocument();
  });

  test('renders price indicator', () => {
    render(<RestaurantCard restaurant={MOCK_RESTAURANT} searchParams={SEARCH_PARAMS} />);
    expect(screen.getByText('$$$$')).toBeInTheDocument();
  });

  test('renders time slot buttons', () => {
    render(<RestaurantCard restaurant={MOCK_RESTAURANT} searchParams={SEARCH_PARAMS} />);
    expect(screen.getByText('6:00 PM')).toBeInTheDocument();
    expect(screen.getByText('7:00 PM')).toBeInTheDocument();
  });

  test('shows Available badge when slots exist', () => {
    render(<RestaurantCard restaurant={MOCK_RESTAURANT} searchParams={SEARCH_PARAMS} />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  test('shows "No times shown" when slots are empty', () => {
    const r = { ...MOCK_RESTAURANT, slots: [] };
    render(<RestaurantCard restaurant={r} searchParams={SEARCH_PARAMS} />);
    expect(screen.getByText('No times shown')).toBeInTheDocument();
  });

  test('opens modal on card click', () => {
    render(<RestaurantCard restaurant={MOCK_RESTAURANT} searchParams={SEARCH_PARAMS} />);
    fireEvent.click(screen.getByText('The French Laundry').closest('article'));
    expect(screen.getAllByText('The French Laundry').length).toBeGreaterThan(1);
  });

  test('renders platform badge', () => {
    render(<RestaurantCard restaurant={MOCK_RESTAURANT} searchParams={SEARCH_PARAMS} />);
    expect(screen.getByText('OpenTable')).toBeInTheDocument();
  });

  test('slots link to correct booking URL', () => {
    render(<RestaurantCard restaurant={MOCK_RESTAURANT} searchParams={SEARCH_PARAMS} />);
    const link = screen.getByText('6:00 PM').closest('a');
    expect(link.href).toContain('18:00');
  });

  test('shows +N more when slots exceed 5', () => {
    const r = {
      ...MOCK_RESTAURANT,
      slots: Array.from({ length: 8 }, (_, i) => ({ time: `1${i}:00`, url: '#' })),
    };
    render(<RestaurantCard restaurant={r} searchParams={SEARCH_PARAMS} />);
    expect(screen.getByText('+3 more')).toBeInTheDocument();
  });
});
