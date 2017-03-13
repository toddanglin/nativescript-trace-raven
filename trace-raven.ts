import Raven = require("raven-js");
import * as http from "http";
import * as platform from "platform";
import * as trace from "trace";
import * as app from "application";
import * as utils from "utils/utils";
import { DeviceOrientation } from "ui/enums";
import { Page, ShownModallyData } from "ui/page";
import { EventData } from "data/observable";
let page = require("ui/page").Page; // Needed for global events
let appversion = require("nativescript-appversion");
let orientation = require('nativescript-orientation');
require("nativescript-globalevents");

export class TraceRaven {
  private batteryPercent: number;

  constructor(dsn: string, environment = "debug", enableAppBreadcrumbs = true) {
    if (dsn === undefined || dsn === "") {
      throw new Error("Sentry DSN string required to configure Raven TraceWriter");
    }
    this.initRaven(dsn, environment, enableAppBreadcrumbs);
  }

  public write(message: string, category: string, type?: number): void {
    if (typeof(Raven) === "undefined") return; // Do not process if Raven plugin not loaded

    // Sentry only recognizes 'info', 'warning' and 'error' ('error' is default)
    let level = "error";
    if (type === trace.messageType.log || type === trace.messageType.info) { 
      level = "info";
    } else if (type === trace.messageType.warn) { 
      level = "warning"
    }

    // Add category as a tag for log
    Raven.captureMessage(message, { level: level, tags: { trace_category: category } });
  }

  private initRaven(dsn: string, environment: string, enableAppBreadcrumbs: boolean) {
    Raven
      .config(dsn, {
        logger: 'nativescript',
        environment: environment,
        serverName: platform.device.uuid,
        tags: {
          device_type: platform.device.deviceType,
          device_lang: platform.device.language,
        },
        dataCallback: (data) => {
          // Enrich with additional context
          data.contexts = {
            device: {
              family: platform.device.manufacturer,
              model: platform.device.model,
              orientation: DeviceOrientation[orientation.getOrientation()],
              battery_level: this.batteryPercent
            },
            os: {
              name: platform.device.os,
              version: platform.device.osVersion
            },
            runtime: {
              name: 'nativescript',
              version: global.__runtimeVersion
            }
          }

          return data;
        },
        transport: (options) => {
          let url = `${options.url}?sentry_version=${encodeURIComponent(options.auth.sentry_version)}` +
            `&sentry_client=${encodeURIComponent(options.auth.sentry_client)}` +
            `&sentry_key=${encodeURIComponent(options.auth.sentry_key)}`;

          http.request({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Origin": "nativescript://"
            },
            url: url,
            timeout: 2000,
            content: JSON.stringify(options.data)
          })
            .then((result) => {
              if (result.statusCode !== 200) {
                throw new Error(`Unexpcted HTTP status code (${result.statusCode})`);
              }
              options.onSuccess();
            })
            .catch((err) => {
              let msg = `Raven Transport Error: ${err}`;
              console.warn(msg);
              options.onFailure();
            });
        },
      })
      .install();

      if (enableAppBreadcrumbs) {
        this.initAutoCrumbs();
      }

      this.initAppVersion();
      this.initBatteryStatus();
  }

  private initAutoCrumbs() {
    // Loaded
    page.on(Page.loadedEvent, (args: EventData) => {
      let p = <Page>args.object;
      Raven.captureBreadcrumb({
        message: `Page loaded`,
        category: "debug",
        data: {
          binding_context: p.bindingContext
        },
        level: "info"
      });
    });

    // NavigatedTo
    page.on(Page.navigatedToEvent, (args: EventData) => {
      let p = <Page>args.object;
      Raven.captureBreadcrumb({
        message: `App navigated to new page`,
        category: "navigation",
        data: {
          binding_context: p.bindingContext,
          nav_context: p.navigationContext
        },
        level: "info"
      })
    });

    //Shown Modally
    page.on(Page.shownModallyEvent, (args: ShownModallyData) => {
      let p = <Page>args.object;
      Raven.captureBreadcrumb({
        message: `Page shown modally`,
        category: "navigation",
        data: {
          binding_context: p.bindingContext,
          nav_context: args.context
        },
        level: "info"
      })
    });
  }

  private initAppVersion() {
    // Add app version tag (async)
    appversion.getVersionName()
      .then((version) => {
        Raven.setTagsContext({ app_version: version });
        Raven.setRelease(version);
    });
  }

  private initBatteryStatus() {
    if (platform.isAndroid) {
      app.android.registerBroadcastReceiver(android.content.Intent.ACTION_BATTERY_CHANGED,
        (context: android.content.Context, intent: android.content.Intent) => {
            let level = intent.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1);
            let scale = intent.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1);
            this.batteryPercent = (level / scale) * 100.0;
        });
    } else {
      app.ios.addNotificationObserver(UIDeviceBatteryLevelDidChangeNotification,
        (notification: NSNotification) => {
            this.batteryPercent = utils.ios.getter(UIDevice, UIDevice.currentDevice).batteryLevel * 100;
        });
    }
  }
}
