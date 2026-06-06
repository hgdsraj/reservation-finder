import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformBadge } from '../components/PlatformBadge.jsx';

describe('PlatformBadge', () => {
  test.each(['opentable', 'resy', 'tock', 'sevenrooms', 'thefork'])(
    'renders %s with correct label',
    (platform) => {
      render(<PlatformBadge platform={platform} />);
      const expectedLabels = {
        opentable: 'OpenTable',
        resy: 'Resy',
        tock: 'Tock',
        sevenrooms: 'SevenRooms',
        thefork: 'TheFork',
      };
      expect(screen.getByText(expectedLabels[platform])).toBeInTheDocument();
    }
  );

  test('renders unknown platform gracefully', () => {
    render(<PlatformBadge platform="unknown" />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  test('applies sm size classes by default', () => {
    const { container } = render(<PlatformBadge platform="resy" />);
    expect(container.firstChild).toHaveClass('px-2');
  });

  test('applies md size classes when size="md"', () => {
    const { container } = render(<PlatformBadge platform="resy" size="md" />);
    expect(container.firstChild).toHaveClass('px-3');
  });
});
