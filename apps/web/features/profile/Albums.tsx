"use client";

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon, Delete02Icon, PencilEdit01Icon, StarIcon } from "@hugeicons/core-free-icons";
import { toast } from "@/components/ui";
import { PHOTO_TYPES, shrinkPhotos } from "@/lib/demo/photos";
import { actions, lastChangeKept, useDemo, type Album, type AlbumPhoto } from "@/lib/demo/store";
import s from "./profile.module.css";

const STEP_MS = 4500;
const glyph = (icon: typeof Add01Icon, size = 18) => <HugeiconsIcon icon={icon} size={size} strokeWidth={1.8} />;
const cover = (a: Album) => (a.photos.find((p) => p.id === a.coverId) ?? a.photos[0])?.url;

/**
 * Dialogs close when their page is hidden (Next keeps it alive), or they would block the next page.
 * Their onClose ignores a close event that arrives after they opened again (StrictMode runs effects twice).
 */
function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal?.();
    return () => d?.close();
  }, [open]);
  return ref;
}

/**
 * Albums: round covers under the profile, like highlights. Tap one to watch it full screen; the
 * first circle makes a new one. Albums are public: other Vibers see them on your profile.
 */
export function Albums() {
  const albums = useDemo((st) => st.albums);
  const [viewing, setViewing] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const open = albums.find((a) => a.id === viewing);
  const edit = editing === "new" ? null : albums.find((a) => a.id === editing);

  return (
    <section aria-labelledby="albums-title" className={s.albums}>
      <div className={s.albumsHead}>
        <h2 id="albums-title" className={s.kicker}>
          Albums
        </h2>
        <span className={s.public}>Public</span>
      </div>
      <ul className={s.ring}>
        <li>
          <button type="button" className={s.bubble} onClick={() => setEditing("new")}>
            <span className={`${s.disc} ${s.discNew}`}>{glyph(Add01Icon, 24)}</span>
            <span className={s.bubbleLabel}>New</span>
          </button>
        </li>
        {albums.map((a) => (
          <li key={a.id}>
            <button type="button" className={s.bubble} onClick={() => setViewing(a.id)} aria-label={`${a.title}, ${a.photos.length} ${a.photos.length === 1 ? "photo" : "photos"}`}>
              <span className={s.disc}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a photo kept in this browser */}
                <img src={cover(a)} alt="" />
              </span>
              <span className={s.bubbleLabel}>{a.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {!albums.length && <p className={s.hint}>Collect your best moments in albums. Everyone who opens your profile can see them.</p>}

      {open && (
        <AlbumViewer
          key={open.id}
          album={open}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setViewing(null);
            setEditing(open.id);
          }}
        />
      )}
      {editing && <AlbumEditor key={editing} album={edit ?? null} onClose={() => setEditing(null)} />}
    </section>
  );
}

/** One album full screen: a bar per photo fills while it shows; tap the sides, swipe, or use the arrows. */
export function AlbumViewer({ album, onClose, onEdit }: { album: Album; onClose: () => void; onEdit?: () => void }) {
  const ref = useModal(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [dy, setDy] = useState(0);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const count = album.photos.length;
  const photo = album.photos[Math.min(index, count - 1)];
  const close = () => ref.current?.close();
  const go = (n: number) => {
    if (n >= count) return close();
    setIndex(Math.max(0, n));
  };

  // the photo moves on by itself, unless paused or the person prefers less motion
  useEffect(() => {
    if (paused || reduced) return;
    const t = window.setTimeout(() => (index + 1 >= count ? ref.current?.close() : setIndex(index + 1)), STEP_MS);
    return () => window.clearTimeout(t);
  }, [index, paused, reduced, count, ref]);

  const down = (e: RPointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    setPaused(true);
  };
  const up = (e: RPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setPaused(false);
    setDy(0);
    if (!d) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (my > 90) return close();
    if (Math.abs(mx) > 50) return go(index + (mx < 0 ? 1 : -1));
    if (Math.abs(mx) < 8 && Math.abs(my) < 8) {
      const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
      go(index + (e.clientX - box.left < box.width / 3 ? -1 : 1));
    }
  };

  return (
    <dialog
      ref={ref}
      className={s.viewer}
      aria-label={`${album.title}, photo ${index + 1} of ${count}`}
      onClose={(e) => !e.currentTarget.open && onClose()}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === " ") {
          e.preventDefault();
          setPaused((p) => !p);
        }
      }}
    >
      <div className={s.stage} style={dy ? { transform: `translateY(${dy}px)`, opacity: 1 - dy / 400 } : undefined}>
        <div className={s.bars} aria-hidden="true">
          {album.photos.map((p, i) => (
            <span key={p.id} className={s.bar}>
              <i
                data-state={i < index ? "done" : i === index ? (paused || reduced ? "held" : "run") : "todo"}
                style={i === index ? { animationDuration: `${STEP_MS}ms` } : undefined}
              />
            </span>
          ))}
        </div>
        <header className={s.viewerTop}>
          <p className={s.viewerTitle}>{album.title}</p>
          <span className={s.viewerCount}>
            {index + 1} / {count}
          </span>
          {onEdit && (
            <button type="button" className={s.iconBtn} aria-label="Edit album" onClick={onEdit}>
              {glyph(PencilEdit01Icon)}
            </button>
          )}
          <button type="button" className={s.iconBtn} aria-label="Close album" onClick={close}>
            {glyph(Cancel01Icon)}
          </button>
        </header>
        <div
          className={s.shot}
          onPointerDown={down}
          onPointerMove={(e) => drag.current && setDy(Math.max(0, e.clientY - drag.current.y))}
          onPointerUp={up}
          onPointerCancel={() => {
            drag.current = null;
            setPaused(false);
            setDy(0);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a photo kept in this browser */}
          <img key={photo.id} src={photo.url} alt={`${album.title}, photo ${index + 1}`} draggable={false} />
        </div>
        <div className={s.viewerNav}>
          <button type="button" className={s.iconBtn} aria-label="Previous photo" disabled={index === 0} onClick={() => go(index - 1)}>
            {glyph(ArrowLeft01Icon)}
          </button>
          <button type="button" className={s.iconBtn} aria-label="Next photo" onClick={() => go(index + 1)}>
            {glyph(ArrowRight01Icon)}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Make an album, or change one: title, photos (add, remove, reorder), the cover, or delete it. */
function AlbumEditor({ album, onClose }: { album: Album | null; onClose: () => void }) {
  const ref = useModal(true);
  const [title, setTitle] = useState(album?.title ?? "");
  const [photos, setPhotos] = useState<AlbumPhoto[]>(album?.photos ?? []);
  const [coverId, setCoverId] = useState(album?.coverId ?? "");
  const [busy, setBusy] = useState(false);
  const close = () => ref.current?.close();

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const { urls, errors } = await shrinkPhotos(Array.from(files));
    setBusy(false);
    if (errors.length) toast(errors[0]);
    setPhotos((ps) => [...ps, ...urls.map((url) => ({ id: crypto.randomUUID(), url }))]);
  };
  const move = (i: number, by: number) =>
    setPhotos((ps) => {
      const next = [...ps];
      const j = i + by;
      if (j < 0 || j >= next.length) return ps;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const cov = photos.some((p) => p.id === coverId) ? coverId : photos[0]?.id;

  const save = () => {
    if (!title.trim()) return toast("Give the album a name.");
    if (!photos.length) return toast("Add at least one photo.");
    if (album) actions.updateAlbum(album.id, { title, photos, coverId: cov });
    else {
      const made = actions.createAlbum(title, photos.map((p) => p.url));
      // the new album has its own photo ids: point the cover at the same position
      if (made) actions.updateAlbum(made.id, { coverId: made.photos[photos.findIndex((p) => p.id === cov)]?.id });
    }
    toast(lastChangeKept() ? (album ? "Album saved." : `"${title.trim()}" is on your profile.`) : "Saved for now, but this browser is out of room: it will be gone after a reload.");
    close();
  };

  return (
    <dialog ref={ref} className={s.editor} aria-labelledby="album-editor-title" onClose={(e) => !e.currentTarget.open && onClose()}>
      <div className={s.editorCard}>
        <header className={s.editorHead}>
          <h2 id="album-editor-title" className={s.editorTitle}>
            {album ? "Edit album" : "New album"}
          </h2>
          <button type="button" className={s.iconBtn} aria-label="Close" onClick={close}>
            {glyph(Cancel01Icon)}
          </button>
        </header>
        <label className={s.field}>
          <span>Name</span>
          <input className="field" value={title} maxLength={40} placeholder="Hampta, July" onChange={(e) => setTitle(e.target.value)} />
        </label>
        <ul className={s.thumbs} aria-label="Photos in this album">
          {photos.map((p, i) => (
            <li key={p.id} className={s.thumb} data-cover={p.id === cov || undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a photo kept in this browser */}
              <img src={p.url} alt={`Photo ${i + 1}`} />
              {p.id === cov && <span className={s.coverTag}>Cover</span>}
              <div className={s.thumbTools}>
                <button type="button" aria-label={`Move photo ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, -1)}>
                  {glyph(ArrowLeft01Icon, 16)}
                </button>
                <button type="button" aria-label={`Make photo ${i + 1} the cover`} aria-pressed={p.id === cov} onClick={() => setCoverId(p.id)}>
                  {glyph(StarIcon, 16)}
                </button>
                <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}>
                  {glyph(Delete02Icon, 16)}
                </button>
                <button type="button" aria-label={`Move photo ${i + 1} later`} disabled={i === photos.length - 1} onClick={() => move(i, 1)}>
                  {glyph(ArrowRight01Icon, 16)}
                </button>
              </div>
            </li>
          ))}
          <li>
            <label className={s.addThumb}>
              {glyph(Add01Icon, 22)}
              <span>{busy ? "Adding…" : "Add photos"}</span>
              <input
                type="file"
                accept={PHOTO_TYPES}
                multiple
                className="sr-only"
                aria-label="Add photos"
                onChange={(e) => {
                  void add(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </li>
        </ul>
        <div className={s.editorActions}>
          {album && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                if (!window.confirm(`Delete "${album.title}"? This can't be undone.`)) return;
                actions.deleteAlbum(album.id);
                toast("Album deleted.");
                close();
              }}
            >
              Delete album
            </button>
          )}
          <button type="button" className="btn" disabled={busy} onClick={save}>
            {album ? "Save album" : "Add to profile"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
