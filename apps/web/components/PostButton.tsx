"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { PostTab } from "@/features/club/PostTab";
import club from "@/features/club/club.module.css";

const OPEN = "vc:post";
/** open the posting sheet from anywhere (the Home card, a link with #ignite) */
export const openPost = () => window.dispatchEvent(new Event(OPEN));

/** + Post in the top line: IGNITE THE VIBE (a thread or a photo), from any screen. */
export function PostButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN, show);
    // old links to the composer (/profile#ignite) open the sheet
    if (window.location.hash === "#ignite") queueMicrotask(show);
    return () => window.removeEventListener(OPEN, show);
  }, []);
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal?.();
    // a page you leave stays mounted but hidden, so close on the way out
    return () => d?.close();
  }, [open]);
  return (
    <>
      <button type="button" className="vc-plus" aria-label="Post: ignite the vibe" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
        <span aria-hidden="true">Post</span>
      </button>
      {open && (
        <dialog
          ref={ref}
          className="vc-sheet"
          aria-label="Ignite the vibe"
          onClose={(e) => {
            if (!e.currentTarget.open) setOpen(false);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) ref.current?.close();
          }}
        >
          <div className={`${club.club} vc-sheet__body`}>
            <button type="button" className="vc-sheet__close" aria-label="Close" onClick={() => ref.current?.close()}>
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </button>
            <PostTab
              title="IGNITE THE VIBE"
              onSeeCommunity={() => {
                ref.current?.close();
                router.push("/discover#community");
              }}
            />
          </div>
        </dialog>
      )}
    </>
  );
}
