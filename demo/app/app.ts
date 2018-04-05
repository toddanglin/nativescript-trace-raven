import * as app from 'application';
import * as trace from 'trace';
import Raven = require("raven-js");
import { TraceRaven } from 'nativescript-trace-raven';
import { alert } from 'ui/dialogs';

app.on(app.launchEvent, (args: app.ApplicationEventData) => {
    let sentryDsn = "[YOUR SENTRY.IO DSN KEY]";

    if (sentryDsn === "[YOUR SENTRY.IO DSN KEY]") {
        let msg = "You must provide your own Sentry.io DSN key in app.ts to initialize this demo. Visit Sentry.io to get a key.";
        throw new Error(msg);
    }
    
    trace.setCategories(trace.categories.concat(trace.categories.Error, trace.categories.Debug));
    // Uncomment the line below to remove `console` TraceWriter before adding new Raven TraceWriter
    // NOTE: It's okay to keep console writer. Will just additional breadcrumbs in Raven logs.
    // trace.clearWriters();
    trace.addWriter(new TraceRaven(sentryDsn, "demo"));
    trace.enable();
});

app.on(app.uncaughtErrorEvent, (args: app.ApplicationEventData) => {
    if (app.android) {
        console.log("** Android Error Detected **");
        // For Android applications, args.android is an NativeScriptError.
        Raven.captureException(args.android);
    } else if (app.ios) {
        console.log("** iOS Error Detected **");
        // For iOS applications, args.ios is NativeScriptError.
        Raven.captureException(args.ios);
    }
});

app.start({ moduleName: "main-page" });
