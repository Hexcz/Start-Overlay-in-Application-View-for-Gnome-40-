import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Overview from 'resource:///org/gnome/shell/ui/overview.js';

export default class StartOverlayInAppViewExtension extends Extension {
    originalToggle;

    constructor(metadata) {
        super(metadata);

        this.originalToggle = Overview.Overview.prototype.toggle;
    }

    enable() {
        Overview.Overview.prototype.toggle = function () {
            if (this.isDummy)
                return;

            if (this._visible)
                this.hide();
            else
                this.showApps();
        };
        
        if (Main.layoutManager._startingUp){
            Main.layoutManager.connectObject('startup-complete', () => Main.overview.showApps(), this);
        }
    }

    disable() {
        Overview.Overview.prototype.toggle = this.originalToggle;
    }
}
