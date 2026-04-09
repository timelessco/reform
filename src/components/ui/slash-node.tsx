import {
  Code2,
  Columns3Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  LightbulbIcon,
  PilcrowIcon,
  Quote,
  Square,
  Table,
  TextCursorInputIcon,
} from "lucide-react";
import {
  AlignLeftIcon,
  AtSignIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  FileIcon,
  HashIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  PhoneIcon,
  CheckCheckIcon,
  SmileIcon,
  SquareCheckIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { KEYS } from "platejs";
import type { TComboboxInputElement } from "platejs";
import type { PlateEditor, PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import type * as React from "react";

import { insertBlock, insertInlineElement } from "@/components/editor/transforms";

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from "./inline-combobox";

type Group = {
  group: string;
  items: {
    icon: React.ReactNode;
    value: string;
    onSelect: (editor: PlateEditor, value: string) => void;
    className?: string;
    focusEditor?: boolean;
    keywords?: string[];
    label?: string;
  }[];
};

const groups: Group[] = [
  {
    group: "Basic blocks",
    items: [
      {
        icon: <PilcrowIcon />,
        keywords: ["paragraph"],
        label: "Text",
        value: KEYS.p,
      },
      {
        icon: <Heading1Icon />,
        keywords: ["title", "h1"],
        label: "Heading 1",
        value: KEYS.h1,
      },
      {
        icon: <Heading2Icon />,
        keywords: ["subtitle", "h2"],
        label: "Heading 2",
        value: KEYS.h2,
      },
      {
        icon: <Heading3Icon />,
        keywords: ["subtitle", "h3"],
        label: "Heading 3",
        value: KEYS.h3,
      },
      {
        icon: <ListIcon />,
        keywords: ["unordered", "ul", "-"],
        label: "Bulleted list",
        value: KEYS.ul,
      },
      {
        icon: <ListOrderedIcon />,
        keywords: ["ordered", "ol", "1"],
        label: "Numbered list",
        value: KEYS.ol,
      },
      {
        icon: <Square />,
        keywords: ["checklist", "task", "checkbox", "[]"],
        label: "To-do list",
        value: KEYS.listTodo,
      },
      {
        icon: <ChevronRightIcon />,
        keywords: ["collapsible", "expandable"],
        label: "Toggle",
        value: KEYS.toggle,
      },
      {
        icon: <Code2 />,
        keywords: ["```"],
        label: "Code Block",
        value: KEYS.codeBlock,
      },
      {
        icon: <Table />,
        label: "Table",
        value: KEYS.table,
      },
      {
        icon: <Quote />,
        keywords: ["citation", "blockquote", "quote", ">"],
        label: "Blockquote",
        value: KEYS.blockquote,
      },
      {
        description: "Insert a highlighted block.",
        icon: <LightbulbIcon />,
        keywords: ["note"],
        label: "Callout",
        value: KEYS.callout,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: "Advanced blocks",
    items: [
      // {
      // 	icon: <TableOfContentsIcon />,
      // 	keywords: ["toc"],
      // 	label: "Table of contents",
      // 	value: KEYS.toc,
      // },
      {
        icon: <Columns3Icon />,
        label: "3 columns",
        value: "action_three_columns",
      },
      // {
      // 	focusEditor: false,
      // 	icon: <RadicalIcon />,
      // 	label: "Equation",
      // 	value: KEYS.equation,
      // },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: "Inline",
    items: [
      {
        focusEditor: true,
        icon: <CalendarIcon />,
        keywords: ["time"],
        label: "Date",
        value: KEYS.date,
      },
      // ``
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertInlineElement(editor, value);
      },
    })),
  },
  {
    group: "Layout blocks",
    items: [
      {
        icon: <FileIcon />,
        keywords: ["page"],
        label: "New page",
        value: "pageBreak",
      },
      {
        icon: <SmileIcon />,
        keywords: ["thankyou"],
        label: "'Thank you' page",
        value: "pageBreakThankYou",
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: "Form blocks",
    items: [
      {
        icon: <TextCursorInputIcon />,
        keywords: ["form", "input", "text", "field", "question"],
        label: "Text Input",
        value: "formInput",
      },
      {
        icon: <AlignLeftIcon />,
        keywords: ["form", "textarea", "multiline", "long", "paragraph", "description"],
        label: "Text Area",
        value: "formTextarea",
      },
      {
        icon: <AtSignIcon />,
        keywords: ["form", "email", "address", "mail"],
        label: "Email",
        value: "formEmail",
      },
      {
        icon: <PhoneIcon />,
        keywords: ["form", "phone", "telephone", "number", "call", "mobile"],
        label: "Phone number",
        value: "formPhone",
      },
      {
        icon: <HashIcon />,
        keywords: ["form", "number", "numeric", "integer", "amount"],
        label: "Number",
        value: "formNumber",
      },
      {
        icon: <LinkIcon />,
        keywords: ["form", "link", "url", "website", "href"],
        label: "Link",
        value: "formLink",
      },
      {
        icon: <CalendarIcon />,
        keywords: ["form", "date", "calendar", "day", "month", "year"],
        label: "Date",
        value: "formDate",
      },
      {
        icon: <ClockIcon />,
        keywords: ["form", "time", "clock", "hour", "minute"],
        label: "Time",
        value: "formTime",
      },
      {
        icon: <UploadIcon />,
        keywords: ["form", "file", "upload", "attachment", "document"],
        label: "File upload",
        value: "formFileUpload",
      },
      {
        icon: <SquareCheckIcon />,
        keywords: ["form", "checkbox", "check", "option", "multiple", "select"],
        label: "Checkbox",
        value: "formCheckbox",
      },
      {
        icon: <SquareCheckIcon />,
        keywords: ["form", "multi", "choice", "radio", "single", "select", "option"],
        label: "Multi Choice",
        value: "formMultiChoice",
      },
      {
        icon: <CheckCheckIcon />,
        keywords: ["form", "multi", "select", "dropdown", "tag", "option"],
        label: "Multi Select",
        value: "formMultiSelect",
      },
      // {
      //   icon: <ChevronsUpDownIcon />,
      //   keywords: ["form", "ranking", "rank", "order", "sort", "priority"],
      //   label: "Ranking",
      //   value: "formRanking",
      // },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
];

export const SlashInputElement = (props: PlateElementProps<TComboboxInputElement>) => {
  const { editor, element } = props;

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox element={element} trigger="/">
        <InlineComboboxInput />

        <InlineComboboxContent>
          <InlineComboboxEmpty>No results</InlineComboboxEmpty>

          {groups.map(({ group, items }) => (
            <InlineComboboxGroup key={group}>
              <InlineComboboxGroupLabel>{group}</InlineComboboxGroupLabel>

              {items.map(({ focusEditor, icon, keywords, label, value, onSelect }) => (
                <InlineComboboxItem
                  key={value}
                  value={value}
                  onClick={() => onSelect(editor, value)}
                  label={label}
                  focusEditor={focusEditor}
                  group={group}
                  keywords={keywords}
                >
                  <div className="mr-2 text-muted-foreground">{icon}</div>
                  {label ?? value}
                </InlineComboboxItem>
              ))}
            </InlineComboboxGroup>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
};
