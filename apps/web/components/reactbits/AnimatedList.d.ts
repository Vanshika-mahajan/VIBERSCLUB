// Types for the JavaScript component next to this file (React Bits, see its header).
import type { CSSProperties, JSX, ReactNode } from "react";

export type AnimatedListItem =
  | string
  | { id?: string; icon?: ReactNode; image?: string; title: ReactNode; description?: ReactNode; meta?: ReactNode };

export type AnimatedListProps<T extends AnimatedListItem = AnimatedListItem> = {
  items?: T[];
  onItemSelect?: (item: T, index: number) => void;
  renderItem?: (item: T, index: number, selected: boolean) => ReactNode;
  initialSelectedIndex?: number;
  selectOnHover?: boolean;
  enableArrowNavigation?: boolean;
  loop?: boolean;
  animation?: "pop" | "slide" | "fade" | "none";
  animateOnce?: boolean;
  stagger?: number;
  showGradients?: boolean;
  fadeSize?: number;
  displayScrollbar?: boolean;
  frame?: boolean;
  /** Vibers Club: "winewood" is the club palette */
  theme?: "dark" | "light" | "winewood";
  accentColor?: string;
  radius?: number;
  gap?: number;
  width?: number | string;
  maxHeight?: number | string;
  className?: string;
  itemClassName?: string;
  /** Vibers Club: accessible name of the listbox */
  ariaLabel?: string;
  style?: CSSProperties;
};
export default function AnimatedList<T extends AnimatedListItem>(props: AnimatedListProps<T>): JSX.Element;
