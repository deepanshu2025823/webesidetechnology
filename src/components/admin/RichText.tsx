"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Toolbar button - declared at module scope so its identity is stable. */
function Btn({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition-colors",
        active ? "bg-navy-900 text-gold-300" : "text-slate-600 hover:bg-slate-100 hover:text-navy-900",
      )}
    >
      {children}
    </button>
  );
}

/**
 * WYSIWYG body editor. The HTML is mirrored into a hidden input so the
 * surrounding server action reads it like any other form field.
 */
export function RichText({
  name,
  defaultValue = "",
  placeholder = "Write the page content…",
  minHeight = 320,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  minHeight?: number;
}) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      ImageExt.configure({ HTMLAttributes: { class: "rounded-xl" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "prose prose-brand max-w-none focus:outline-none px-4 py-4",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) {
    return <div className="h-40 animate-pulse rounded-xl border border-navy-900/15 bg-slate-50" />;
  }

  async function insertImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "content");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (res.ok && data.url) editor!.chain().focus().setImage({ src: data.url }).run();
    };
    input.click();
  }

  function toggleLink() {
    const previous = editor!.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL", previous ?? "https://");
    if (href === null) return;
    if (href === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-navy-900/15 bg-white focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/20">
      <input type="hidden" name={name} value={html} />

      <div className="flex flex-wrap items-center gap-0.5 border-b border-navy-900/10 bg-slate-50 px-2 py-1.5">
        <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </Btn>
        <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </Btn>
        <Btn label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="size-4" />
        </Btn>

        <span className="mx-1 h-5 w-px bg-navy-900/10" />

        <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="size-4" />
        </Btn>
        <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="size-4" />
        </Btn>

        <span className="mx-1 h-5 w-px bg-navy-900/10" />

        <Btn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="size-4" />
        </Btn>
        <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="size-4" />
        </Btn>
        <Btn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="size-4" />
        </Btn>
        <Btn label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="size-4" />
        </Btn>

        <span className="mx-1 h-5 w-px bg-navy-900/10" />

        <Btn label="Add link" active={editor.isActive("link")} onClick={toggleLink}>
          <Link2 className="size-4" />
        </Btn>
        <Btn label="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
          <Unlink className="size-4" />
        </Btn>
        <Btn label="Insert image" onClick={insertImage}>
          <ImagePlus className="size-4" />
        </Btn>

        <span className="mx-1 h-5 w-px bg-navy-900/10" />

        <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </Btn>
        <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="size-4" />
        </Btn>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
