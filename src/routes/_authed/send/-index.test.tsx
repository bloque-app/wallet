import { render, screen } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

const { Route } = await import('./index');
Object.assign(Route, { useSearch: () => ({}) });
const SendPage = Route.options.component as ComponentType;

describe('send route', () => {
  test('PIX is coming soon and cannot be opened', () => {
    const { container } = render(<SendPage />);

    const pixRow = screen.getByText('PIX').closest('div.rounded-2xl');
    expect(pixRow).toHaveTextContent('Próximamente');
    expect(container.querySelector('a[href="/send/pix"]')).toBeNull();
  });

  test('SPEI stays available', () => {
    const { container } = render(<SendPage />);

    expect(container.querySelector('a[href="/send/spei"]')).not.toBeNull();
  });

  test('each country group shows its flag next to the title', () => {
    render(<SendPage />);

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings).toHaveLength(4);
    for (const heading of headings) {
      expect(heading.querySelector('svg')).not.toBeNull();
    }
  });
});
