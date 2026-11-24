import {Fragment, useMemo} from 'react';
import {findHighlightRanges} from '../utils/search';

export function HighlightText({
  text,
  keywords,
  markClassName = 'bg-[#ffdea8] dark:bg-[#f2be5e]/35 text-[#271900] dark:text-[#ffdea8] rounded-sm px-0.5 font-bold',
}: {
  text: string;
  keywords: string[];
  markClassName?: string;
}) {
  const ranges = useMemo(() => findHighlightRanges(text, keywords), [text, keywords]);

  if (!text || ranges.length === 0) {
    return <>{text}</>;
  }

  const nodes: Array<{key: string; content: string; highlight: boolean}> = [];
  let cursor = 0;

  for (let i = 0; i < ranges.length; i += 1) {
    const r = ranges[i];
    if (r.start > cursor) {
      nodes.push({
        key: `t-${cursor}-${r.start}`,
        content: text.slice(cursor, r.start),
        highlight: false,
      });
    }
    nodes.push({
      key: `m-${r.start}-${r.end}`,
      content: text.slice(r.start, r.end),
      highlight: true,
    });
    cursor = r.end;
  }

  if (cursor < text.length) {
    nodes.push({
      key: `t-${cursor}-${text.length}`,
      content: text.slice(cursor),
      highlight: false,
    });
  }

  return (
    <>
      {nodes.map((part) =>
        part.highlight ? (
          <mark key={part.key} className={markClassName}>
            {part.content}
          </mark>
        ) : (
          <Fragment key={part.key}>{part.content}</Fragment>
        ),
      )}
    </>
  );
}
