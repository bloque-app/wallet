import { Fragment } from 'react';

/** Renders `**bold**` spans inside a line of plain legal text. No other
 * markdown inline syntax appears in the source documents. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const key = `${i}-${part.slice(0, 12)}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/** Minimal block renderer for the legal documents' markdown subset:
 * `#`/`##`/`###` headings and plain paragraphs, both allowing `**bold**`.
 * Deliberately not a general markdown renderer — these documents only ever
 * use headings, bold and paragraphs. */
export function LegalMarkdown({ content }: { content: string }) {
  const blocks = content.trim().split(/\n\n+/);

  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground">
      {blocks.map((block, i) => {
        const key = `${i}-${block.slice(0, 24)}`;
        const heading = /^(#{1,3})\s+(.*)$/.exec(block);
        if (heading) {
          const level = heading[1].length;
          const text = heading[2].replace(/\*\*/g, '');
          if (level === 1) {
            return (
              <h1 key={key} className="text-xl font-bold tracking-[-0.025em]">
                {text}
              </h1>
            );
          }
          if (level === 2) {
            return (
              <h2 key={key} className="text-base font-bold tracking-[-0.02em]">
                {text}
              </h2>
            );
          }
          return (
            <h3 key={key} className="text-sm font-semibold">
              {text}
            </h3>
          );
        }
        return (
          <p key={key} className="whitespace-pre-line text-muted-foreground">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
