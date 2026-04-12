const SkeletonBar = ({
  width = "w-full",
  className = "",
}: {
  width?: string;
  className?: string;
}) => <div className={`h-2 rounded-full bg-muted-foreground/20 ${width} ${className}`} />;

export const TextPreview = () => (
  <div className="flex h-[130px] flex-col justify-center gap-2.5 px-3">
    <SkeletonBar width="w-full" className="h-[5px]" />
    <SkeletonBar width="w-[90%]" className="h-[5px]" />
    <SkeletonBar width="w-[75%]" className="h-[5px]" />
  </div>
);

export const Heading1Preview = () => (
  <div className="flex h-[130px] flex-col justify-center gap-3 px-3">
    <div className="font-heading text-lg font-bold leading-tight">Heading 1</div>
    <SkeletonBar width="w-full" className="h-[5px]" />
    <SkeletonBar width="w-[80%]" className="h-[5px]" />
  </div>
);

export const Heading2Preview = () => (
  <div className="flex h-[130px] flex-col justify-center gap-3 px-3">
    <div className="font-heading text-base font-semibold leading-tight">Heading 2</div>
    <SkeletonBar width="w-full" className="h-[5px]" />
    <SkeletonBar width="w-[85%]" className="h-[5px]" />
  </div>
);

export const Heading3Preview = () => (
  <div className="flex h-[130px] flex-col justify-center gap-3 px-3">
    <div className="font-heading text-sm font-semibold leading-tight">Heading 3</div>
    <SkeletonBar width="w-full" className="h-[5px]" />
    <SkeletonBar width="w-[70%]" className="h-[5px]" />
  </div>
);

export const BulletedListPreview = () => (
  <div className="flex h-[130px] flex-col justify-center gap-3 px-3">
    {(["w-[85%]", "w-[70%]", "w-[60%]"] as const).map((w) => (
      <div key={w} className="flex items-center gap-2">
        <div className="size-1.5 shrink-0 rounded-full bg-foreground" />
        <SkeletonBar width={w} className="h-[5px]" />
      </div>
    ))}
  </div>
);

export const NumberedListPreview = () => (
  <div className="flex h-[130px] flex-col justify-center gap-3 px-3">
    {[1, 2, 3].map((n) => (
      <div key={n} className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">{n}.</span>
        <SkeletonBar
          width={n === 1 ? "w-[85%]" : n === 2 ? "w-[70%]" : "w-[60%]"}
          className="h-[5px]"
        />
      </div>
    ))}
  </div>
);

const todoItems = [
  { width: "w-[80%]" as const, checked: true },
  { width: "w-[65%]" as const, checked: false },
  { width: "w-[75%]" as const, checked: false },
];

export const TodoListPreview = () => (
  <div className="flex h-[130px] flex-col justify-center gap-3 px-3">
    {todoItems.map(({ width, checked }) => (
      <div key={width} className="flex items-center gap-2">
        <div
          className={`size-3 shrink-0 rounded-[3px] border border-input ${checked ? "bg-primary" : ""}`}
        />
        <SkeletonBar width={width} className="h-[5px]" />
      </div>
    ))}
  </div>
);

export const TogglePreview = () => (
  <div className="flex h-[130px] flex-col justify-center gap-2.5 px-3">
    <div className="flex items-center gap-1.5">
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        className="shrink-0 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4.5 2.5L8 6L4.5 9.5" />
      </svg>
      <SkeletonBar width="w-[70%]" className="h-[6px]" />
    </div>
    <div className="pl-5">
      <SkeletonBar width="w-[90%]" className="h-[5px]" />
      <SkeletonBar width="w-[60%]" className="mt-2 h-[5px]" />
    </div>
  </div>
);

export const CodeBlockPreview = () => (
  <div className="flex h-[130px] flex-col justify-center px-3">
    <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-3">
      <SkeletonBar width="w-[60%]" className="h-[4px] bg-muted-foreground/15" />
      <SkeletonBar width="w-[80%]" className="h-[4px] bg-muted-foreground/15" />
      <SkeletonBar width="w-[45%]" className="h-[4px] bg-muted-foreground/15" />
      <SkeletonBar width="w-[70%]" className="h-[4px] bg-muted-foreground/15" />
    </div>
  </div>
);

export const TablePreview = () => (
  <div className="flex h-[130px] flex-col justify-center px-3">
    <div className="overflow-hidden rounded-sm border">
      {[0, 1, 2].map((row) => (
        <div key={row} className={`flex ${row > 0 ? "border-t" : ""}`}>
          {[0, 1, 2].map((col) => (
            <div key={col} className={`flex-1 px-2 py-1.5 ${col > 0 ? "border-l" : ""}`}>
              <SkeletonBar
                width={row === 0 ? "w-[70%]" : "w-[50%]"}
                className={`h-[4px] ${row === 0 ? "bg-muted-foreground/30" : ""}`}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const BlockquotePreview = () => (
  <div className="flex h-[130px] flex-col justify-center px-3">
    <div className="border-l-2 border-foreground/30 pl-4">
      <SkeletonBar width="w-full" className="h-[5px]" />
      <SkeletonBar width="w-[85%]" className="mt-2.5 h-[5px]" />
      <SkeletonBar width="w-[60%]" className="mt-2.5 h-[5px]" />
    </div>
  </div>
);

export const CalloutPreview = () => (
  <div className="flex h-[130px] flex-col justify-center px-3">
    <div className="flex gap-2.5 rounded-sm bg-muted p-3">
      <span className="shrink-0 text-sm">💡</span>
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonBar width="w-full" className="h-[5px]" />
        <SkeletonBar width="w-[75%]" className="h-[5px]" />
      </div>
    </div>
  </div>
);
