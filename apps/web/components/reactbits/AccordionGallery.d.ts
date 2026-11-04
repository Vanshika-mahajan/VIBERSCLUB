// Types for the JavaScript component next to this file (React Bits, see its header).
import type { JSX } from "react";

export type AccordionGalleryItem = {
  image: string;
  label?: string;
  link?: string;
  alt?: string;
  /** Vibers Club: shown instead when `image` fails */
  fallback?: string;
};
export type AccordionGalleryProps = {
  items?: AccordionGalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  grayscale?: boolean;
  showLabels?: boolean;
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: "hover" | "click";
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  orientation?: "horizontal" | "vertical";
  /** Vibers Club: called when a panel opens */
  onChange?: (index: number) => void;
  className?: string;
  /** Vibers Club: accessible name of the list */
  ariaLabel?: string;
};
export default function AccordionGallery(props: AccordionGalleryProps): JSX.Element;
