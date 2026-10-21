import { Fragment, type ReactNode } from "react";

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={`${keyPrefix}-${index}`}>{part.slice(1, -1)}</code>;
    }
    return <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>;
  });
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let codeLang = "";
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${key++}`}>
        {paragraph.map((line, index) => (
          <Fragment key={index}>
            {index > 0 ? <br /> : null}
            {inline(line, `p-${key}-${index}`)}
          </Fragment>
        ))}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`}>
        {list.map((item, index) => (
          <li key={index}>{inline(item, `li-${key}-${index}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      if (code) {
        blocks.push(
          <pre className="rich-code" key={`pre-${key++}`}>
            <code data-lang={codeLang}>{code.join("\n")}</code>
          </pre>,
        );
        code = null;
        codeLang = "";
      } else {
        flushParagraph();
        flushList();
        code = [];
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^\s*[-*]\s+/, ""));
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  if (code) {
    blocks.push(
      <pre className="rich-code" key={`pre-${key++}`}>
        <code data-lang={codeLang}>{code.join("\n")}</code>
      </pre>,
    );
  }

  return <div className="rich-text">{blocks}</div>;
}
