const Overview = imports.ui.overview;

let originalToggle;

function init() {
    originalToggle = Overview.Overview.prototype.toggle;
}

function enable() {
    Overview.Overview.prototype.toggle = function () {
        if (this.isDummy)
            return;

        if (this._visible)
            this.hide();
        else
            this.showApps();
    };
}

function disable() {
    Overview.Overview.prototype.toggle = originalToggle;
}
