import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { SuggestedDocsWidget } from '../components/docs/SuggestedDocsWidget';
import { docsApi } from '../api/docsApi';

vi.mock('../api/docsApi', () => ({
  docsApi: {
    suggestDocuments: vi.fn().mockResolvedValue([
      {
        id: 1,
        title: 'Troubleshooting SSO Login Errors',
        slug: 'troubleshooting-sso-login-errors',
        summary: 'Fix SAML and OAuth 2.0 configuration mismatches.',
        category_name: 'Security',
        view_count: 50,
        helpful_count: 12,
      },
    ]),
  },
}));

describe('SuggestedDocsWidget Component', () => {
  it('does not render when query length is too short', () => {
    const { container } = render(
      <BrowserRouter>
        <SuggestedDocsWidget query="hi" />
      </BrowserRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('queries suggestions and renders recommended article when query is provided', async () => {
    render(
      <BrowserRouter>
        <SuggestedDocsWidget query="sso login failed" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(docsApi.suggestDocuments).toHaveBeenCalledWith('sso login failed', undefined, 4);
      expect(screen.getByText('Recommended Knowledge Base Articles')).toBeInTheDocument();
      expect(screen.getByText('Troubleshooting SSO Login Errors')).toBeInTheDocument();
      expect(screen.getByText('Fix SAML and OAuth 2.0 configuration mismatches.')).toBeInTheDocument();
    });
  });
});
