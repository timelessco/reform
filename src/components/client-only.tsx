import { useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactElement | ReactNode | (() => ReactElement | ReactNode);
  fallback?: ReactNode;
}

export const ClientOnly = ({ children, fallback = null }: ClientOnlyProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  if (typeof children === "function") {
    return <>{children()}</>;
  }

  return <>{children}</>;
};
