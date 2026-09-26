import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DocCard } from '../components/docs/DocCard';
import { DocumentListItem } from '../types/docs';

const mockDoc: DocumentListItem = {
  id: 1,
  title: 'How to Reset Your 2FA Authentication',
  slug: 'how-to-reset-your-2fa-authentication',
  summary: 'Step-by-step instructions to reset two-factor auth keys.',
  category_id: 2,
  author_id: 10,
  status: 'published',
  is_featured: true,
  view_count: 142,
  helpful_count: 38,
  not_helpful_count: 2,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-02T10:00:00Z',
  category: {
    id: 2,
    name: 'Security & Access',
    slug: 'security-access',
    display_order: 1,
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
  },
  tags: [
    { id: 1, name: '2fa', slug: '2fa' },
    { id: 2, name: 'security', slug: 'security' },
  ],
};

describe('DocCard Component', () => {
  it('renders document title, summary, category, and tags', () => {
    render(
      <BrowserRouter>
        <DocCard doc={mockDoc} />
      </BrowserRouter>
    );

    expect(screen.getByText('How to Reset Your 2FA Authentication')).toBeInTheDocument();
    expect(screen.getByText('Step-by-step instructions to reset two-factor auth keys.')).toBeInTheDocument();
    expect(screen.getByText('Security & Access')).toBeInTheDocument();
    expect(screen.getByText('#2fa')).toBeInTheDocument();
    expect(screen.getByText('#security')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
  });

  it('links to document reader path using slug', () => {
    render(
      <BrowserRouter>
        <DocCard doc={mockDoc} />
      </BrowserRouter>
    );

    const link = screen.getByRole('link', { name: 'How to Reset Your 2FA Authentication' });
    expect(link).toHaveAttribute('href', '/docs/how-to-reset-your-2fa-authentication');
  });
});
