// Types for the JavaScript component next to this file (React Bits, see its header).
import type { CSSProperties, JSX } from "react";

export type CircularCarouselItem = {
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  /** Vibers Club: shown instead when `src` fails */
  fallback?: string;
};
export type CircularCarouselProps = {
  items?: CircularCarouselItem[];
  preset?: "cylinder" | "orbit" | "wheel" | "panorama";
  intro?: "assemble" | "rise" | "spin" | "none";
  cardWidth?: number;
  aspectRatio?: number;
  gap?: number;
  curve?: number;
  tilt?: number;
  perspective?: number;
  autoplay?: "drift" | "step" | "off";
  speed?: number;
  interval?: number;
  direction?: "left" | "right";
  draggable?: boolean;
  momentum?: number;
  snap?: boolean;
  pauseOnHover?: boolean;
  focusOnClick?: boolean;
  parallax?: number;
  stretch?: number;
  depthFade?: number;
  fadeColor?: string;
  innerShade?: number;
  cornerRadius?: number;
  captions?: boolean;
  onChange?: (index: number) => void;
  onItemClick?: (item: CircularCarouselItem, index: number) => void;
  className?: string;
  style?: CSSProperties;
  /** Vibers Club: accessible name */
  ariaLabel?: string;
};
export default function CircularCarousel(props: CircularCarouselProps): JSX.Element;
