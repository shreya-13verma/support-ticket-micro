import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DocEditorModal } from '../components/docs/DocEditorModal';
import { docsApi } from '../api/docsApi';
import { Category, Tag } from '../types/docs';

vi.mock('../api/docsApi', () => ({
  docsApi: {
    createDocument: vi.fn().mockResolvedValue({
      id: 99,
      title: 'New Created Doc',
      slug: 'new-created-doc',
      content: 'Content here',
      category_id: 1,
      status: 'draft',
      is_featured: false,
      tags: [],
    }),
  },
}));

const mockCategories: Category[] = [
  { id: 1, name: 'Billing & Subscriptions', slug: 'billing', display_order: 1, is_active: true, created_at: '' },
  { id: 2, name: 'Troubleshooting', slug: 'troubleshooting', display_order: 2, is_active: true, created_at: '' },
];

const mockTags: Tag[] = [
  { id: 1, name: 'invoice', slug: 'invoice' },
  { id: 2, name: 'refund', slug: 'refund' },
];

describe('DocEditorModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <DocEditorModal
        isOpen={false}
        onClose={() => {}}
        categories={mockCategories}
        existingTags={mockTags}
        onSaved={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders creation form, auto-generates slug from title, and handles submission', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <DocEditorModal
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        existingTags={mockTags}
        onSaved={onSaved}
        userRole="agent"
      />
    );

    expect(screen.getByText('Create Knowledge Base Article')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/How to Configure/i);
    fireEvent.change(titleInput, { target: { value: 'How to Download Invoices' } });

    const slugInput = screen.getByPlaceholderText(/auto-generated-slug/i);
    expect(slugInput).toHaveValue('how-to-download-invoices');

    const contentInput = screen.getByPlaceholderText(/Explain step-by-step instructions/i);
    fireEvent.change(contentInput, { target: { value: '# Steps\n1. Go to settings\n2. Click invoices' } });

    const saveDraftBtn = screen.getByRole('button', { name: /Save as Draft/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(docsApi.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'How to Download Invoices',
          slug: 'how-to-download-invoices',
          content: '# Steps\n1. Go to settings\n2. Click invoices',
          status: 'draft',
        })
      );
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
