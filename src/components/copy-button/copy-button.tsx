"use client";

import { CheckIcon, CircleXIcon, CopyIcon } from "@/components/ui/icons";
import type { HTMLMotionProps, Variants } from "motion/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback } from "react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import type { CopyState } from "@/hooks/use-copy-to-clipboard";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

export const motionIconVariants: Variants = {
  initial: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
};

export const motionIconProps: HTMLMotionProps<"span"> = {
  variants: motionIconVariants,
  initial: "initial",
  animate: "animate",
  exit: "exit",
  transition: { type: "spring", duration: 0.4, bounce: 0 },
};

export const CopyStateIcon = ({ state }: { state: CopyState }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    {state === "idle" ? (
      <motion.span key="idle" {...motionIconProps}>
        <CopyIcon />
      </motion.span>
    ) : state === "done" ? (
      <motion.span key="done" {...motionIconProps}>
        <CheckIcon strokeWidth={3} />
      </motion.span>
    ) : state === "error" ? (
      <motion.span key="error" {...motionIconProps}>
        <CircleXIcon />
      </motion.span>
    ) : null}
  </AnimatePresence>
);

export type CopyButtonProps = ComponentProps<typeof Button> & {
  /** The text to copy, or a function that returns the text. */
  text: string | (() => string);
  /** Called with the copied text on successful copy. */
  onCopySuccess?: (text: string) => void;
  /** Called with the error if the copy operation fails. */
  onCopyError?: (error: Error) => void;
};

export const CopyButton = ({
  size = "icon",
  children,
  text,
  onCopySuccess,
  onCopyError,
  onClick,
  ...props
}: CopyButtonProps) => {
  const { state, copy } = useCopyToClipboard({
    onCopySuccess,
    onCopyError,
  });

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      copy(text);
      onClick?.(e);
    },
    [copy, text, onClick],
  );

  return (
    <Button
      size={size}
      onClick={handleClick}
      prefix={<CopyStateIcon state={state} />}
      aria-label="Copy"
      {...props}
    >
      {children}
    </Button>
  );
};
