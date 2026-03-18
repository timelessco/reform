/**
 * Step splitting on pageBreak nodes and thank-you page extraction.
 */
import type { Value } from "platejs";
import type { PreviewSegment, StepData, TransformedElement } from "./types";
import { createSegments } from "./parse-nodes";

/**
 * Result of splitting elements into steps (flat element form)
 */
type StepSplitResult = {
  /** Array of steps, each containing elements for that step */
  steps: TransformedElement[][];
  /** Content to show after form submission (from thank you page break) */
  thankYouContent: TransformedElement[] | null;
};

/**
 * Splits transformed elements into steps based on PageBreak elements.
 * - Regular PageBreak = step divider
 * - PageBreak with isThankYouPage = marks content after it as thank you content
 *
 * @param elements - Array of transformed elements
 * @returns Object with steps array and optional thankYouContent
 */
export const splitElementsIntoSteps = (elements: TransformedElement[]): StepSplitResult => {
  const steps: TransformedElement[][] = [];
  let currentStep: TransformedElement[] = [];
  let thankYouContent: TransformedElement[] | null = null;
  let isCollectingThankYou = false;

  for (const element of elements) {
    // Check if this is a PageBreak
    if ("static" in element && element.fieldType === "PageBreak") {
      // Save current step if it has content
      if (currentStep.length > 0) {
        steps.push(currentStep);
        currentStep = [];
      }

      // If this is a thank you page break, start collecting thank you content
      if (element.isThankYouPage) {
        isCollectingThankYou = true;
      }
      // Don't add the PageBreak element itself to any step
      continue;
    }

    // Add element to appropriate collection
    if (isCollectingThankYou) {
      if (!thankYouContent) {
        thankYouContent = [];
      }
      thankYouContent.push(element);
    } else {
      currentStep.push(element);
    }
  }

  // Don't forget the last step (if not collecting thank you content)
  if (currentStep.length > 0 && !isCollectingThankYou) {
    steps.push(currentStep);
  }

  // If no steps were created but we have content, it's a single step
  if (steps.length === 0 && currentStep.length > 0) {
    steps.push(currentStep);
  }

  return { steps, thankYouContent };
};

/**
 * Splits raw Plate nodes into steps on pageBreak boundaries,
 * then converts each step into preview segments.
 *
 * Handles multi-step splitting on pageBreak nodes and
 * thank-you page extraction (isThankYouPage pageBreak).
 */
export const splitNodesIntoStepSegments = (nodes: Value): StepData => {
  // Split nodes on pageBreak into raw step arrays
  const rawSteps: Value[] = [];
  let thankYouNodes: Value | null = null;
  let currentChunk: Value = [];
  let collectingThankYou = false;

  for (const node of nodes) {
    if (node.type === "pageBreak") {
      // Flush current chunk as a step
      if (currentChunk.length > 0 && !collectingThankYou) {
        rawSteps.push(currentChunk);
        currentChunk = [];
      }

      if (node.isThankYouPage) {
        collectingThankYou = true;
      }
      continue;
    }

    if (collectingThankYou) {
      if (!thankYouNodes) thankYouNodes = [];
      thankYouNodes.push(node);
    } else {
      currentChunk.push(node);
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0 && !collectingThankYou) {
    rawSteps.push(currentChunk);
  }

  // If no steps were created but we have content, it's a single step
  if (rawSteps.length === 0 && currentChunk.length > 0) {
    rawSteps.push(currentChunk);
  }

  // Convert each raw step into segments
  const steps: PreviewSegment[][] = rawSteps.map((stepNodes) => createSegments(stepNodes));

  return { steps, thankYouNodes };
};
