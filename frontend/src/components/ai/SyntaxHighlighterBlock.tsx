import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("markup", markup);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.alias("javascript", ["js"]);
SyntaxHighlighter.alias("markup", ["html"]);
SyntaxHighlighter.alias("python", ["py"]);
SyntaxHighlighter.alias("typescript", ["ts"]);

interface SyntaxHighlighterBlockProps {
  code: string;
  language: string;
  isDark: boolean;
}

export default function SyntaxHighlighterBlock({
  code,
  language,
  isDark,
}: SyntaxHighlighterBlockProps) {
  return (
    <SyntaxHighlighter
      style={isDark ? oneDark : oneLight}
      language={language}
      PreTag="div"
      className="!rounded-t-none !rounded-b-xl text-sm !my-0 !bg-transparent"
      customStyle={{
        margin: 0,
        background: "transparent",
        padding: "1.25rem",
      }}
      codeTagProps={{ style: { background: "transparent" } }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
