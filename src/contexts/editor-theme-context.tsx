import type { CSSProperties } from "react";
import { createContext, useContext } from "react";

const EditorThemeContext = createContext<{
  themeVars: CSSProperties;
  hasCustomization: boolean;
}>({ themeVars: {}, hasCustomization: false });

export const EditorThemeProvider = EditorThemeContext.Provider;
export const useEditorTheme = () => useContext(EditorThemeContext);
