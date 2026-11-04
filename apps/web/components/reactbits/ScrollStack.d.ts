// Types for the JavaScript component next to this file (React Bits, see its header).
import type { CSSProperties, JSX, ReactNode } from "react";

export type ScrollStackProps = {
  children?: ReactNode;
  itemDistance?: number;
  itemStackDistance?: number;
  stackPosition?: number | string;
  itemScale?: number;
  baseScale?: number;
  dimAmount?: number;
  blurAmount?: number;
  tiltAmount?: number;
  rotationAmount?: number;
  holdDistance?: number;
  smoothScroll?: boolean;
  snap?: boolean;
  useWindowScroll?: boolean;
  onStackComplete?: () => void;
  className?: string;
};
export function ScrollStackItem(props: {
  children?: ReactNode;
  itemClassName?: string;
  style?: CSSProperties;
}): JSX.Element;
export default function ScrollStack(props: ScrollStackProps): JSX.Element;
