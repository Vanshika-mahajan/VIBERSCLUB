/**
 * Where the open doorway is on screen, shared by the door (EntryDoor writes it every frame) and the
 * camp behind it (Camp reads it): the camp is drawn at the size and place of the world seen through the
 * doorway, and grows with it as the camera goes through (ARPIT: "as the door opens the world that
 * awaits on the other side unveils"). Fractions of the screen; null when there is no door.
 */
export type PortalRect = { cx: number; cy: number; h: number; push: number };
export const portal: { rect: PortalRect | null } = { rect: null };
