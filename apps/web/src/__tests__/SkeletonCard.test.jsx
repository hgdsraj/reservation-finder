import { describe, test, expect } from 'vitest';
import { render, container } from '@testing-library/react';
import { SkeletonCard } from '../components/SkeletonCard.jsx';

describe('SkeletonCard', () => {
  test('renders without crashing', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });

  test('renders shimmer elements', () => {
    const { container } = render(<SkeletonCard />);
    const shimmers = container.querySelectorAll('.shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
  });
});
