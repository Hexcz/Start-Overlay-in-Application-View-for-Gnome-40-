import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Overview from 'resource:///org/gnome/shell/ui/overview.js';
import GLib from 'gi://GLib';

export default class StartOverlayInAppViewExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._origToggle = null;
    this._startupHandlerId = 0;
  }

  _safeShowApps() {
    const ov = Main.overview;
    const visible = !!ov?.visible || !!ov?._visible;
    const busy =
     !!ov?._showing || !!ov?._hiding || !!ov?._animationsRunning || !!ov?._inModeChange;

    if (!ov) return;
    ov.showApps();
    return GLib.SOURCE_REMOVE;
  }

  enable() {
      this._origToggle = Overview.Overview.prototype.toggle;
      Overview.Overview.prototype.toggle = function () {
        if (this.isDummy) return;
        if (this._visible) {
          this.hide();
        } else {
          GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
              Main.overview.showApps();
              return GLib.SOURCE_REMOVE;
          });
        }
      } 
  }

  disable() {
    if (this._origToggle) {
        Overview.Overview.prototype.toggle = this._origToggle;
       }
    if (this._startupHandlerId) {
        Main.layoutManager.disconnectObject(this);
        this._startupHandlerId = 0;
    }
  }
}
