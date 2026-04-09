import { MarkdownPlugin } from "@platejs/markdown";

import { ArrowDownToLineIcon } from "@/components/ui/icons";
import { createSlateEditor } from "platejs";
import { useEditorRef } from "platejs/react";
import { serializeHtml } from "platejs/static";
import * as React from "react";
import { BaseEditorKit } from "@/components/editor/editor-base-kit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EditorStatic } from "./editor-static";
import { ToolbarButton } from "./toolbar";

const siteUrl = "https://platejs.org";

export const ExportToolbarButton = (props: React.ComponentProps<typeof DropdownMenu>) => {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  const getCanvas = React.useCallback(async () => {
    const { default: html2canvas } = await import("html2canvas-pro");

    const style = document.createElement("style");
    document.head.append(style);

    const editorDom = editor.api.toDOMNode(editor);
    if (!editorDom) return;

    const canvas = await html2canvas(editorDom, {
      onclone: (document: Document) => {
        const editorElement = document.querySelector('[contenteditable="true"]');
        if (editorElement) {
          Array.from(editorElement.querySelectorAll("*")).forEach((element) => {
            const existingStyle = element.getAttribute("style") || "";
            element.setAttribute(
              "style",
              `${existingStyle}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important`,
            );
          });
        }
      },
    });
    style.remove();

    return canvas;
  }, [editor]);

  const downloadFile = React.useCallback(async (url: string, filename: string) => {
    const response = await fetch(url);

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();

    // Clean up the blob URL
    window.URL.revokeObjectURL(blobUrl);
  }, []);

  const exportToPdf = React.useCallback(async () => {
    const canvas = await getCanvas();
    if (!canvas) return;

    const PDFLib = await import("pdf-lib");
    const pdfDoc = await PDFLib.PDFDocument.create();
    const page = pdfDoc.addPage([canvas.width, canvas.height]);
    const imageEmbed = await pdfDoc.embedPng(canvas.toDataURL("PNG"));
    const { height, width } = imageEmbed.scale(1);
    page.drawImage(imageEmbed, {
      height,
      width,
      x: 0,
      y: 0,
    });
    const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: true });

    await downloadFile(pdfBase64, "plate.pdf");
  }, [getCanvas, downloadFile]);

  const exportToImage = React.useCallback(async () => {
    const canvas = await getCanvas();
    if (!canvas) return;
    await downloadFile(canvas.toDataURL("image/png"), "plate.png");
  }, [getCanvas, downloadFile]);

  const exportToHtml = React.useCallback(async () => {
    const editorStatic = createSlateEditor({
      plugins: BaseEditorKit,
      value: editor.children,
    });

    const editorHtml = await serializeHtml(editorStatic, {
      editorComponent: EditorStatic,
      props: { style: { padding: "0 calc(50% - 350px)", paddingBottom: "" } },
    });

    const tailwindCss = `<link rel="stylesheet" href="${siteUrl}/tailwind.css">`;
    const katexCss = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.18/dist/katex.css" integrity="sha384-9PvLvaiSKCPkFKB1ZsEoTjgnJn+O3KvEwtsz37/XrkYft3DTk2gHdYvd9oWgW3tV" crossorigin="anonymous">`;

    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=JetBrains+Mono:wght@400..700&display=swap"
          rel="stylesheet"
        />
        ${tailwindCss}
        ${katexCss}
        <style>
          :root {
            --font-sans: 'Inter', 'Inter Fallback';
            --font-mono: 'JetBrains Mono', 'JetBrains Mono Fallback';
          }
        </style>
      </head>
      <body>
        ${editorHtml}
      </body>
    </html>`;

    const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

    await downloadFile(url, "plate.html");
  }, [editor.children, downloadFile]);

  const exportToMarkdown = React.useCallback(async () => {
    const md = editor.getApi(MarkdownPlugin).markdown.serialize();
    const url = `data:text/markdown;charset=utf-8,${encodeURIComponent(md)}`;
    await downloadFile(url, "plate.md");
  }, [editor, downloadFile]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger render={<ToolbarButton pressed={open} tooltip="Export" isDropdown />}>
        <ArrowDownToLineIcon className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={exportToHtml}>Export as HTML</DropdownMenuItem>
          <DropdownMenuItem onSelect={exportToPdf}>Export as PDF</DropdownMenuItem>
          <DropdownMenuItem onSelect={exportToImage}>Export as Image</DropdownMenuItem>
          <DropdownMenuItem onSelect={exportToMarkdown}>Export as Markdown</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
