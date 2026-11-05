"use client";

import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { HoldDragGesture } from "@/lib/hold-drag";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ProjectionContext = createContext<{ current: google.maps.MapCanvasProjection | null }>({ current: null });

/** One projection overlay shared by all dashboard pins. */
export function MarkerDragProvider({ children }: { children: ReactNode }) {
  const map = useMap();
  const projection = useRef<google.maps.MapCanvasProjection | null>(null);
  useEffect(() => {
    if (!map) return;
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {};
    overlay.draw = () => { projection.current = overlay.getProjection(); };
    overlay.onRemove = () => { projection.current = null; };
    overlay.setMap(map);
    return () => { overlay.setMap(null); };
  }, [map]);
  return <ProjectionContext.Provider value={projection}>{children}</ProjectionContext.Provider>;
}

type Position = { lat: number; lng: number };
export function HoldToDragMarker({ position, zIndex, children, onClick, onDragStart, onDragEnd }: {
  position: Position; zIndex?: number; children: ReactNode;
  onClick?: () => void; onDragStart?: () => void; onDragEnd: (position: Position) => void;
}) {
  const map = useMap();
  const projection = useContext(ProjectionContext);
  const { language } = useLanguage();
  const [preview, setPreview] = useState<Position | null>(null);
  const [armed, setArmed] = useState(false);
  const latest = useRef({ onClick, onDragStart, onDragEnd });
  useEffect(() => { latest.current = { onClick, onDragStart, onDragEnd }; }, [onClick, onDragStart, onDragEnd]);
  const previewRef = useRef<Position | null>(null);
  const originPixel = useRef<google.maps.Point | null>(null);
  const restoreGestures = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const gesture = useRef<HoldDragGesture | null>(null);
  useEffect(() => { gesture.current = new HoldDragGesture({
    arm: () => { suppressClick.current = true; setArmed(true); latest.current.onDragStart?.(); },
    move: delta => {
      if (!originPixel.current || !projection.current) return;
      const point = projection.current.fromContainerPixelToLatLng(new google.maps.Point(originPixel.current.x + delta.x, originPixel.current.y + delta.y));
      if (!point) return;
      const next = { lat: point.lat(), lng: point.lng() };
      if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return;
      previewRef.current = next; setPreview(next);
    },
    finish: result => {
      restoreGestures.current?.(); restoreGestures.current = null;
      setArmed(false);
      if (result.cancelled) suppressClick.current = true;
      if (!result.cancelled && !result.armed) { latest.current.onClick?.(); suppressClick.current = true; }
      if (!result.cancelled && result.armed && result.moved && previewRef.current) {
        latest.current.onDragEnd(previewRef.current);
      } else { setPreview(null); }
      previewRef.current = null;
    },
  });
    return () => { gesture.current?.cancel(); restoreGestures.current?.(); gesture.current = null; };
  }, [projection]);
  useEffect(() => { setPreview(null); }, [position.lat, position.lng]);
  return (
    <AdvancedMarker position={preview || position} zIndex={armed ? 99999 : zIndex} draggable={false} clickable={true}>
      <div role="button" tabIndex={0}
        aria-label={language === "es" ? "Mantén pulsado 2 segundos para mover el pin" : "Hold for 2 seconds to move the pin"}
        title={language === "es" ? "Mantén pulsado 2 segundos para mover" : "Hold for 2 seconds to drag"}
        className={armed ? "ring-4 ring-[#fabf13] rounded-full cursor-grabbing" : "cursor-grab"}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || !projection.current || !map) return;
          event.preventDefault(); event.stopPropagation();
          originPixel.current = projection.current.fromLatLngToContainerPixel(new google.maps.LatLng(position));
          if (!originPixel.current) return;
          gesture.current?.cancel();
          suppressClick.current = false; previewRef.current = null;
          const previous = map.get("gestureHandling");
          map.setOptions({ gestureHandling: "none" });
          restoreGestures.current = () => map.setOptions({ gestureHandling: previous || "auto" });
          event.currentTarget.setPointerCapture(event.pointerId);
          gesture.current?.start(event.pointerId, { x: event.clientX, y: event.clientY });
        }}
        onPointerMove={event => { event.stopPropagation(); gesture.current?.move(event.pointerId, { x: event.clientX, y: event.clientY }); }}
        onPointerUp={event => { event.stopPropagation(); gesture.current?.end(event.pointerId); }}
        onPointerCancel={() => gesture.current?.cancel()}
        onLostPointerCapture={() => gesture.current?.cancel()}
        onMouseDown={event => event.stopPropagation()}
        onTouchStart={event => event.stopPropagation()}
        onContextMenu={event => event.preventDefault()}
        onClickCapture={event => { event.preventDefault(); event.stopPropagation(); if (!suppressClick.current) { onClick?.(); suppressClick.current = true; } }}
        onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick?.(); } }}>
        {children}
      </div>
    </AdvancedMarker>
  );
}
