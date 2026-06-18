import Image from "next/image";
import Link from "next/link";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { rewriteOrgHref } from "@/lib/org/load";

const components: Components = {
  h1: ({ children }) => <h1 className="org-prose__h1">{children}</h1>,
  h2: ({ children }) => <h2 className="org-prose__h2">{children}</h2>,
  h3: ({ children }) => <h3 className="org-prose__h3">{children}</h3>,
  p: ({ children }) => <p className="org-prose__p">{children}</p>,
  ul: ({ children }) => <ul className="org-prose__ul">{children}</ul>,
  ol: ({ children }) => <ol className="org-prose__ol">{children}</ol>,
  li: ({ children }) => <li className="org-prose__li">{children}</li>,
  blockquote: ({ children }) => <blockquote className="org-prose__quote">{children}</blockquote>,
  hr: () => <hr className="org-prose__hr" />,
  table: ({ children }) => (
    <div className="org-prose__table-wrap">
      <table className="org-prose__table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="org-prose__thead">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="org-prose__tr">{children}</tr>,
  th: ({ children }) => <th className="org-prose__th">{children}</th>,
  td: ({ children }) => <td className="org-prose__td">{children}</td>,
  code: ({ className, children }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return <code className={`org-prose__code-block ${className ?? ""}`}>{children}</code>;
    }
    return <code className="org-prose__code">{children}</code>;
  },
  pre: ({ children }) => <pre className="org-prose__pre">{children}</pre>,
  a: ({ href, children }) => {
    const target = rewriteOrgHref(href);
    if (target?.startsWith("/")) {
      return (
        <Link href={target} className="org-prose__a">
          {children}
        </Link>
      );
    }
    return (
      <a href={target} className="org-prose__a" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    const url = typeof src === "string" ? src : undefined;
    if (url?.startsWith("/")) {
      return (
        <span className="org-prose__figure">
          <Image
            src={url}
            alt={alt ?? ""}
            width={1200}
            height={675}
            sizes="(max-width: 900px) 100vw, 820px"
            className="org-prose__img"
          />
          {alt ? <span className="org-prose__caption">{alt}</span> : null}
        </span>
      );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt ?? ""} className="org-prose__img" />;
  },
  strong: ({ children }) => <strong className="org-prose__strong">{children}</strong>,
  em: ({ children }) => <em className="org-prose__em">{children}</em>,
};

export function DocBody({ markdown }: { markdown: string }) {
  return (
    <article className="org-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
