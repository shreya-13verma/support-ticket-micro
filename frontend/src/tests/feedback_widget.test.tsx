import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FeedbackWidget } from '../components/docs/FeedbackWidget';
import { docsApi } from '../api/docsApi';

vi.mock('../api/docsApi', () => ({
  docsApi: {
    submitFeedback: vi.fn().mockResolvedValue({ id: 1, is_helpful: true }),
  },
}));

describe('FeedbackWidget Component', () => {
  it('renders initial state and helpful counts', () => {
    render(<FeedbackWidget docId={5} initialHelpfulCount={10} initialNotHelpfulCount={1} />);

    expect(screen.getByText('Was this article helpful?')).toBeInTheDocument();
    expect(screen.getByText(/10 people found this helpful/)).toBeInTheDocument();
  });

  it('allows clicking Yes and opens optional comment section', () => {
    render(<FeedbackWidget docId={5} initialHelpfulCount={10} initialNotHelpfulCount={1} />);

    const yesBtn = screen.getByRole('button', { name: /yes/i });
    fireEvent.click(yesBtn);

    expect(screen.getByPlaceholderText(/Tell us what was missing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Feedback/i })).toBeInTheDocument();
  });

  it('submits feedback and displays thank you message', async () => {
    render(<FeedbackWidget docId={5} initialHelpfulCount={10} initialNotHelpfulCount={1} />);

    const yesBtn = screen.getByRole('button', { name: /yes/i });
    fireEvent.click(yesBtn);

    const submitBtn = screen.getByRole('button', { name: /Send Feedback/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(docsApi.submitFeedback).toHaveBeenCalledWith(5, { is_helpful: true, comment: undefined });
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    });
  });
});
