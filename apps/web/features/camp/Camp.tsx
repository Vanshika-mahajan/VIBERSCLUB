import Image from "next/image";
import s from "./camp.module.css";

/**
 * Where the door opens to (ARPIT, 2026-11-18): their sunset hilltop camp over the valley, with the
 * Vibers Club sign, the tent, the lanterns and the seats. Step 1 is the picture alone, filling the
 * screen; ARPIT adds the pieces on it one step at a time.
 */
export function Camp() {
  return (
    <section className={s.camp} aria-label="Vibers Club camp">
      <h1 className={s.title}>Vibers Club</h1>
      <Image
        className={s.picture}
        src="/camp/sunset.webp"
        alt="A hilltop camp at sunset above a river valley: the Vibers Club sign, a tent, lanterns and seats on the grass."
        fill
        priority
        sizes="100vw"
      />
    </section>
  );
}
