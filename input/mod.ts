import { WindowKeyboardEvent } from "https://deno.land/x/dwm@0.3.6/mod.ts";

export type KeyboardEvent = WindowKeyboardEvent;

/** @see {@link https://developer.mozilla.org/en-US/docs/web/api/ui_events/keyboard_event_key_values} */
export const enum KeyboardKey {
  /** The user agent wasn't able to map the event's virtual keycode to a specific key value. */
  unidentified = "Unidentified",
  arrowDown = "ArrowDown",
  arrowLeft = "ArrowLeft",
  arrowRight = "ArrowRight",
  arrowUp = "ArrowUp",
  end ="End",
  home = "Home",
  pageDown = "PageDown",
  pageUp = "PageUp",
  backspace = "Backspace",
  copy = "Copy",
  cut = "Cut",
  delete_ = "Delete",
  insert = "Insert",
  paste = "Paste",
  redo = "Redo",
  undo = "Undo",
  contextMenu = "ContextMenu",
  escape = "Escape",
  find = "Find",
  help = "Help",
  pause = "MediaPause",
  play = "MediaPlay",
  zoomIn = "ZoomIn",
  zoomOut = "ZoomOut",
  printScreen = "PrintScreen",
  playPause = "MediaPlayPause",
  record = "MediaRecord",
  rewind = "MediaRewind",
  mediaStop = "MediaStop",
  trackNext = "MediaTrackNext",
  tractPrevious = "MediaTrackPrevious",
  back = "BrowserBack",
  favorites = "BrowserFavorites",
  forward = "BrowserForward",
  browserHome = "BrowserHome",
  refresh = "BrowserRefresh",
  search = "BrowserSearch",
  browserStop = "BrowserStop",
  // TODO: Numeric keypad keys (https://developer.mozilla.org/en-US/docs/web/api/ui_events/keyboard_event_key_values#numeric_keypad_keys)
}

export class Input {
  readonly map = Object.seal(new InputMap(this));
}

export class InputMap {
  constructor (private input: Input) {}

  bind(action: string) {
    return new InputMapBuilder(this.input);
  }
}

export class InputMapBuilder {
  constructor (private input: Input) {}

  keyboardPressed(key: KeyboardKey) {}
  keyboardHeld(key: KeyboardKey) {}
  keyboardReleased(key: KeyboardKey) {}
}
