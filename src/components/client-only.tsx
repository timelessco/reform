import { type ReactElement, type ReactNode, useEffect, useState } from "react";

interface ClientOnlyProps {
  children: ReactElement | ReactNode | (() => ReactElement | ReactNode);
  fallback?: ReactNode;
}

function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
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
}

export { ClientOnly };
