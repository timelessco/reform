// Hook-free RSC icon. Uses per-icon endpoint /api/icons/{name} (~1 kB) not the ~40 kB sprite, so SSR'd public form fetches one glyph. Editor still uses bundled sprite (better for many distinct icons per session).
// NB: no `.svg` suffix — the dev server intercepts extension'd paths as static assets (404s before the route); the handler strips an optional `.svg` but the request must reach it.
export const ServerFormIcon = ({
  iconName,
  iconSize = "48",
  size = "100",
}: {
  iconName: string;
  iconSize?: string;
  size?: string;
}) => (
  <div
    // Form logo card (Figma 25408:8959): surface circle + soft shadow + foreground glyph,
    // matching the editor's IconPickerPreview useThemeColor branch.
    // oxlint-disable-next-line shadcn/no-arbitrary-values -- no shadow token for Figma 0/1/8/0 soft shadow; needs design decision
    className="flex size-(--form-icon-size) items-center justify-center rounded-full bg-card text-foreground shadow-[0px_1px_8px_0px_rgba(0,0,0,0.1)]"
    style={{ "--form-icon-size": `${size}px` } as React.CSSProperties}
  >
    <svg height={iconSize} className="text-current" viewBox="0 0 18 18" width={iconSize}>
      <use href={`/api/icons/${iconName}#${iconName}`} />
    </svg>
  </div>
);
