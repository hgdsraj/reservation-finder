import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarRating } from '../components/StarRating.jsx';

describe('StarRating', () => {
  test('renders nothing when rating is 0', () => {
    const { container } = render(<StarRating rating={0} reviewCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when rating is null', () => {
    const { container } = render(<StarRating rating={null} reviewCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  test('shows numeric rating value', () => {
    render(<StarRating rating={4.5} reviewCount={1234} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  test('shows formatted review count', () => {
    render(<StarRating rating={4.5} reviewCount={1234} />);
    expect(screen.getByText('(1,234)')).toBeInTheDocument();
  });

  test('hides review count when 0', () => {
    render(<StarRating rating={4.5} reviewCount={0} />);
    expect(screen.queryByText(/\(\d/)).toBeNull();
  });

  test('accepts string rating', () => {
    render(<StarRating rating="3.8" reviewCount={50} />);
    expect(screen.getByText('3.8')).toBeInTheDocument();
  });
});
