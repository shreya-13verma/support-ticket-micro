import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const parseMarkdown = (markdownText: string) => {
    if (!markdownText) return [];

    const lines = markdownText.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLanguage = '';
    let codeBlockLines: string[] = [];
    let inList = false;
    let listItems: string[] = [];
    let listOrdered = false;

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        if (listOrdered) {
          elements.push(
            <ol key={`ol-${key}`} className="list-decimal list-inside space-y-1 my-3 text-slate-700">
              {listItems.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {renderInlineFormatting(item)}
                </li>
              ))}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`ul-${key}`} className="list-disc list-inside space-y-1 my-3 text-slate-700">
              {listItems.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {renderInlineFormatting(item)}
                </li>
              ))}
            </ul>
          );
        }
        listItems = [];
        inList = false;
      }
    };

    const flushCodeBlock = (key: number) => {
      if (inCodeBlock) {
        const fullCode = codeBlockLines.join('\n');
        elements.push(
          <div key={`code-${key}`} className="my-4 rounded-lg bg-slate-900 text-slate-100 overflow-hidden border border-slate-800 shadow-sm">
            {codeBlockLanguage && (
              <div className="bg-slate-800/80 px-4 py-1.5 text-xs text-slate-400 font-mono border-b border-slate-700/60 flex justify-between items-center">
                <span>{codeBlockLanguage}</span>
              </div>
            )}
            <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        codeBlockLines = [];
        inCodeBlock = false;
        codeBlockLanguage = '';
      }
    };

    const renderInlineFormatting = (text: string): React.ReactNode => {
      // Bold + Italic, Bold, Italic, Inline Code, Links
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let keyCounter = 0;

      while (remaining.length > 0) {
        // Inline code `code`
        const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);
        // Link [text](url)
        const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/);
        // Bold **text**
        const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/);
        // Italic *text*
        const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*(.*)$/);

        // Find earliest match index
        const matches: Array<{ type: string; match: RegExpMatchArray; index: number }> = [];
        if (codeMatch && codeMatch.index !== undefined) {
          matches.push({ type: 'code', match: codeMatch, index: codeMatch[1].length });
        }
        if (linkMatch && linkMatch.index !== undefined) {
          matches.push({ type: 'link', match: linkMatch, index: linkMatch[1].length });
        }
        if (boldMatch && boldMatch.index !== undefined) {
          matches.push({ type: 'bold', match: boldMatch, index: boldMatch[1].length });
        }
        if (italicMatch && italicMatch.index !== undefined && !boldMatch) {
          matches.push({ type: 'italic', match: italicMatch, index: italicMatch[1].length });
        }

        if (matches.length === 0) {
          parts.push(remaining);
          break;
        }

        matches.sort((a, b) => a.index - b.index);
        const earliest = matches[0];

        if (earliest.type === 'code') {
          const m = earliest.match;
          if (m[1]) parts.push(m[1]);
          parts.push(
            <code key={`inline-code-${keyCounter++}`} className="px-1.5 py-0.5 rounded bg-slate-100 text-pink-600 font-mono text-xs border border-slate-200">
              {m[2]}
            </code>
          );
          remaining = m[3];
        } else if (earliest.type === 'link') {
          const m = earliest.match;
          if (m[1]) parts.push(m[1]);
          parts.push(
            <a
              key={`inline-link-${keyCounter++}`}
              href={m[3]}
              target={m[3].startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline font-medium"
            >
              {m[2]}
            </a>
          );
          remaining = m[4];
        } else if (earliest.type === 'bold') {
          const m = earliest.match;
          if (m[1]) parts.push(m[1]);
          parts.push(
            <strong key={`inline-bold-${keyCounter++}`} className="font-semibold text-slate-900">
              {m[2]}
            </strong>
          );
          remaining = m[3];
        } else if (earliest.type === 'italic') {
          const m = earliest.match;
          if (m[1]) parts.push(m[1]);
          parts.push(
            <em key={`inline-italic-${keyCounter++}`} className="italic text-slate-800">
              {m[2]}
            </em>
          );
          remaining = m[3];
        }
      }

      return parts.length === 1 ? parts[0] : <React.Fragment>{parts}</React.Fragment>;
    };

    lines.forEach((line, index) => {
      // Check code block fences
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock(index);
        } else {
          flushList(index);
          inCodeBlock = true;
          codeBlockLanguage = line.trim().replace(/^```/, '').trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      // Check unordered list
      const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (ulMatch) {
        if (!inList || listOrdered) {
          flushList(index);
          inList = true;
          listOrdered = false;
        }
        listItems.push(ulMatch[2]);
        return;
      }

      // Check ordered list
      const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
      if (olMatch) {
        if (!inList || !listOrdered) {
          flushList(index);
          inList = true;
          listOrdered = true;
        }
        listItems.push(olMatch[2]);
        return;
      }

      // Not in list anymore
      flushList(index);

      // Blank line
      if (!line.trim()) {
        elements.push(<div key={`blank-${index}`} className="h-2" />);
        return;
      }

      // Blockquote
      if (line.startsWith('>')) {
        const quoteText = line.replace(/^>\s?/, '');
        elements.push(
          <blockquote key={`quote-${index}`} className="border-l-4 border-indigo-500 bg-indigo-50/50 pl-4 py-2 my-3 text-slate-700 italic rounded-r">
            {renderInlineFormatting(quoteText)}
          </blockquote>
        );
        return;
      }

      // Horizontal rule
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
        elements.push(<hr key={`hr-${index}`} className="my-6 border-slate-200" />);
        return;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${index}`} className="text-2xl md:text-3xl font-bold text-slate-900 mt-6 mb-3">
            {renderInlineFormatting(line.substring(2))}
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${index}`} className="text-xl md:text-2xl font-bold text-slate-900 mt-5 mb-2.5 pb-1 border-b border-slate-100">
            {renderInlineFormatting(line.substring(3))}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-lg md:text-xl font-semibold text-slate-800 mt-4 mb-2">
            {renderInlineFormatting(line.substring(4))}
          </h3>
        );
        return;
      }
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4-${index}`} className="text-base font-semibold text-slate-800 mt-3 mb-1">
            {renderInlineFormatting(line.substring(5))}
          </h4>
        );
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${index}`} className="text-slate-700 leading-relaxed my-2 text-sm md:text-base">
          {renderInlineFormatting(line)}
        </p>
      );
    });

    flushList(lines.length);
    flushCodeBlock(lines.length);

    return elements;
  };

  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
};
