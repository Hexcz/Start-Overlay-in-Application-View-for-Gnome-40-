// extension.js
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Overview from 'resource:///org/gnome/shell/ui/overview.js';
import GLib from 'gi://GLib';

export default class StartOverlayInAppViewExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._origToggle = null;
    this._startupHandlerId = 0;
    this._patched = false;
  }

  // Small helper: only touch overview when it's *not* visible or transitioning.
  _safeShowApps() {
    const ov = Main.overview;
    try {
      // GNOME 46 has a stable .visible; the underscored ones are internal but useful guards.
      const visible = !!ov?.visible || !!ov?._visible;
      const busy =
        !!ov?._showing || !!ov?._hiding || !!ov?._animationsRunning || !!ov?._inModeChange;

      if (!ov) return;

      if (!visible && !busy) {
        // We're closed and idle → go straight to Apps view.
        ov.showApps();
      } else if (visible) {
        // Already in overview; ensure apps grid is the active page
        // (idempotent: calling twice is fine).
        ov.showApps();
      } else {
        // We're transitioning; defer a bit and try once.
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
          try { ov.showApps(); } catch (e) { logError(e, 'start-overlay: deferred showApps'); }
          return GLib.SOURCE_REMOVE;
        });
      }
    } catch (e) {
      logError(e, 'start-overlay: _safeShowApps failed');
    }
  }

  enable() {
    if (!this._patched) {
      this._origToggle = Overview.Overview.prototype.toggle;

      // Patch toggle with guards so we don't force an invalid transition.
      Overview.Overview.prototype.toggle = function () {
        if (this.isDummy) return;

        // If already visible, hide as usual; if not, prefer Apps view.
        try {
          if (this._visible) {
            this.hide();
          } else {
            // If another extension is also poking overview, do it on idle to avoid SHOWING→SHOWING.
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
              try { Main.overview.showApps(); } catch (e) { logError(e, 'start-overlay: toggle showApps'); }
              return GLib.SOURCE_REMOVE;
            });
          }
        } catch (e) {
          // Always fall back to original if something goes sideways.
          logError(e, 'start-overlay: toggle wrapper failed; calling original');
          return this._extension?._origToggle?.apply(this, arguments);
        }
      };

      this._patched = true;
    }
    //This section refers to enable Apps Overview on startup, but there's some issues related that will be worked on later
    /*// On cold login: wait for GNOME to finish startup, then show Apps.
    if (Main.layoutManager._startingUp) {
      // connectObject lets us cleanly disconnect on disable().
      this._startupHandlerId = Main.layoutManager.connectObject(
        'startup-complete',
        () => {
          // Give Mutter a breath to settle other extensions (tilers, dash, etc.)
          GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._safeShowApps();
            return GLib.SOURCE_REMOVE;
          });
        },
        this
      );
    } else {
      // Already running (enabled at runtime) → do it on idle to avoid races.
      GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
        this._safeShowApps();
        return GLib.SOURCE_REMOVE;
      });
    }*/
  }

  disable() {
    // Restore original toggle safely.
    if (this._patched && this._origToggle) {
      try {
        Overview.Overview.prototype.toggle = this._origToggle;
      } catch (e) {
        logError(e, 'start-overlay: failed to restore original toggle');
      }
    }
    this._patched = false;

    // Disconnect startup handler if we set it.
    try {
      if (this._startupHandlerId) {
        Main.layoutManager.disconnectObject(this);
        this._startupHandlerId = 0;
      }
    } catch (e) {
      logError(e, 'start-overlay: disconnectObject failed');
    }
  }
}
