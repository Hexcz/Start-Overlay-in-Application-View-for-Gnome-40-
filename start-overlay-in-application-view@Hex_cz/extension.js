
// ......................................................................... //
// imports
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Overview = imports.ui.overview;
const OverviewControls = imports.ui.overviewControls;

// ......................................................................... //
// extension scoped variable used to hold the original toggle function so we
// can assign it back on extension disable step
let originalToggleFunction;


// ......................................................................... //
function init() {
    // on intialization set the original toggle holding variable to null
    originalToggleFunction = null;
}


// ......................................................................... //
function enable() {

    // save the existing toggle function so we can use it to restore bits later
    originalToggleFunction = Overview.Overview.prototype['toggle'];

    /*
    this is a copy of an existing toggle function but where we
    show apps and hide the whole Overview.
    TODO: currently we do not trigger animation. This is a problem for the case
          where the app icons have started to appear and before the appearing
          animation is complete, the overview is toggled (can be toggled by other
          apps like dash-to-dock). So then, the hiding of the Overview happens
          before the appearing animation is complete with weird results. So we
          either need to run the animation or if we do not use it, we do the same
          tricks dash-to-dock does where it hides the Overview, does speedy
          animation and unhides. We need to look into "_animateVisible".
    */
    Overview.Overview.prototype['toggle'] = 
        function startOverlayInApplicationViewToggle() {
            if (this.isDummy) {
                return;
            }

            if (this.visible) {
                this.hide();
            }
            else {
                this.show(OverviewControls.ControlsState.APP_GRID);
            }
        };

    /*
    "re"-bind 'panel-main-menu' to our monkeypatched function. Needed because 
    of race conditions. Specifically, during the login or Gnome Shell
    restart the extension is enabled before the keybind is bound to the function
    by a call from "_sessionUpdated()" in main.js and all works well. 

    However, when Gnome Shell Screen Lock is activated it disables the 
    extension as part of the normal process. Hence unpatching the toggle
    prototype back to the original function. Then when the Screen Lock is
    deactivated, it looks like _sessionUpdated is run before extension enabling
    and monkeypatching happens. In this case, our toggle function is not binded.

    So we manually bind it ourselves.
    */
    Main.wm.setCustomKeybindingHandler(
        'panel-main-menu',
        Shell.ActionMode.NORMAL |
        Shell.ActionMode.OVERVIEW,
        Main.sessionMode.hasOverview ? 
            Main.overview.toggle.bind(Main.overview) : null
    );
}


// ......................................................................... //
function disable() {

    /* 
    if we have the original function, put it back and re-bind the
    'panel-main-menu' to original toggle again. (See explanation in enable
    function)
    */
    if (originalToggleFunction !== null) {
        // put the original back
        Overview.Overview.prototype['toggle'] = originalToggleFunction;
        // "re"-bind 'panel-main-menu' to our monkeypatched function 
        Main.wm.setCustomKeybindingHandler(
            'panel-main-menu',
            Shell.ActionMode.NORMAL |
            Shell.ActionMode.OVERVIEW,
            Main.sessionMode.hasOverview ? 
                Main.overview.toggle.bind(Main.overview) : null
      );
    }
}
