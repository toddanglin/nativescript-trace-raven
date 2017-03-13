import { Observable, EventData } from 'data/observable';
import Raven = require("raven-js");
import * as trace from "trace";
import { Button } from "ui/button";

export class HelloWorldModel extends Observable {

  constructor() {
    super();
  }

  public btnLog() {
    this.writeMessage(`A test log from the demo app. Random number: ${ Math.random().toString() }`, trace.categories.Debug, trace.messageType.log);
  }
  
  public btnError() {
    this.writeMessage(`A test ERROR log from the demo app. Random number: ${ Math.random().toString() }`, trace.categories.Error, trace.messageType.error);
  }

  public btnLogWithCrumb(args: EventData) {
    let btn = <Button>args.object;
    Raven.captureBreadcrumb({
      message: `Button tapped`,
      category: "action",
      data: {
        id: btn.id,
        text: btn.text
      },
      level: "info"
    });
    this.writeMessage(`A test log with a CRUMB`, trace.categories.Debug, trace.messageType.warn);
  }

  public btnException() {
    try {
      throw new Error("A text EXCEPTION from the demo app");
    } catch (error) {
      Raven.captureException(error);
    }
  }

  private writeMessage(message: string, category: string, type: number) {
    trace.write(message, category, type);
  }

}