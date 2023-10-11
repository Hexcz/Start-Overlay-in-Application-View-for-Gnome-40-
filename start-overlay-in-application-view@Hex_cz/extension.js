import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
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
    }

    disable() {
        Overview.Overview.prototype.toggle = this.originalToggle;
    }
}
