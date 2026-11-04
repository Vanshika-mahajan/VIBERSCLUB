/** Vanta ships no types. Each effect is a function that takes options and returns an object with destroy(). */
declare module "vanta/dist/*" {
  type VantaEffect = { destroy: () => void; setOptions?: (o: Record<string, unknown>) => void; resize?: () => void };
  const create: (options: Record<string, unknown>) => VantaEffect;
  export default create;
}
