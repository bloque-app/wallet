import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { KycProgressBanner } from './kyc-progress-banner';

// KycProgressBanner renders a TanStack Router <Link>, which throws outside a
// RouterProvider. Stubbed to a plain anchor since routing isn't under test here.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('KycProgressBanner', () => {
  test('a rejected verification shows distinct copy, not the generic "complete your verification" prompt', () => {
    render(<KycProgressBanner kycStatus="rejected" />);

    expect(
      screen.getByText('No pudimos verificar tu identidad'),
    ).toBeInTheDocument();
    expect(screen.getByText('Reintentar verificación')).toBeInTheDocument();
    expect(
      screen.queryByText('Completa tu verificación'),
    ).not.toBeInTheDocument();
  });

  test('never-started still shows the generic prompt', () => {
    render(<KycProgressBanner kycStatus="not_started" />);

    expect(screen.getByText('Completa tu verificación')).toBeInTheDocument();
    expect(screen.getByText('Ir a verificar')).toBeInTheDocument();
  });

  test('an approved verification marks the step as done', () => {
    const { container } = render(<KycProgressBanner kycStatus="approved" />);

    expect(container.textContent).toContain('✓');
  });
});
