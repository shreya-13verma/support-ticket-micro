import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarkdownRenderer } from '../components/docs/MarkdownRenderer';

describe('MarkdownRenderer Component', () => {
  it('renders headings correctly', () => {
    const markdown = '# Main Title\n## Sub Title\n### Section Title';
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Title');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Sub Title');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Section Title');
  });

  it('renders code blocks and inline code', () => {
    const markdown = 'Here is `inline code` and:\n```bash\ncurl -X GET http://localhost:8003\n```';
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText('inline code')).toBeInTheDocument();
    expect(screen.getByText(/curl -X GET/)).toBeInTheDocument();
    expect(screen.getByText('bash')).toBeInTheDocument();
  });

  it('renders unordered and ordered lists', () => {
    const markdown = '- First item\n- Second item\n\n1. Numbered item 1\n2. Numbered item 2';
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
    expect(screen.getByText('Numbered item 1')).toBeInTheDocument();
    expect(screen.getByText('Numbered item 2')).toBeInTheDocument();
  });

  it('renders blockquotes and formatted text', () => {
    const markdown = '> This is important advice with **bold statement** and *italic note*';
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByText(/This is important advice with/)).toBeInTheDocument();
    expect(screen.getByText('bold statement')).toHaveClass('font-semibold');
  });

  it('renders links with secure attributes', () => {
    const markdown = 'Check [Documentation](https://example.com/docs)';
    render(<MarkdownRenderer content={markdown} />);

    const link = screen.getByRole('link', { name: 'Documentation' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
