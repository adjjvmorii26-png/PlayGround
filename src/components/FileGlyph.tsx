import { Braces, FileCode2, FileText, Hash, File } from "lucide-react";
import type { FileLanguage } from "@shared/types";
import { languageColor } from "@/lib/format";

export function FileGlyph({
  language,
  size = 14,
}: {
  language: FileLanguage;
  size?: number;
}) {
  const color = languageColor(language);
  const props = { size, strokeWidth: 1.8, color } as const;
  switch (language) {
    case "javascript":
    case "typescript":
    case "python":
      return <FileCode2 {...props} />;
    case "markdown":
      return <FileText {...props} />;
    case "json":
      return <Braces {...props} />;
    case "css":
      return <Hash {...props} />;
    default:
      return <File {...props} />;
  }
}
