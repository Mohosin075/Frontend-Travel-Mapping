export type DragPoint = { x: number; y: number };
export class HoldDragGesture {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pointer: number | null = null;
  private origin: DragPoint = { x: 0, y: 0 };
  private armed = false;
  private moved = false;
  constructor(private callbacks: {
    arm: () => void;
    move: (delta: DragPoint) => void;
    finish: (result: { cancelled: boolean; armed: boolean; moved: boolean }) => void;
  }) {}
  start(pointer: number, point: DragPoint) {
    this.cancel();
    this.pointer = pointer; this.origin = point; this.armed = false; this.moved = false;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.pointer === null) return;
      this.armed = true; this.callbacks.arm();
    }, 2000);
  }
  move(pointer: number, point: DragPoint) {
    if (this.pointer !== pointer) return;
    const delta = { x: point.x - this.origin.x, y: point.y - this.origin.y };
    if (!this.armed) {
      if (Math.hypot(delta.x, delta.y) > 8) this.cancel();
      return;
    }
    if (Math.hypot(delta.x, delta.y) > 1) this.moved = true;
    this.callbacks.move(delta);
  }
  end(pointer: number) { if (this.pointer === pointer) this.finish(false); }
  cancel() { this.finish(true); }
  private finish(cancelled: boolean) {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.pointer === null) return;
    this.pointer = null;
    this.callbacks.finish({ cancelled, armed: this.armed, moved: this.moved });
    this.armed = false; this.moved = false;
  }
}
