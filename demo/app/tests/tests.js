var TraceRaven = require("nativescript-trace-raven").TraceRaven;
var traceRaven = new TraceRaven();

// TODO replace 'functionname' with an acual function name of your plugin class and run with 'npm test <platform>'
describe("functionname", function() {
  it("exists", function() {
    expect(traceRaven.functionname).toBeDefined();
  });

  it("returns a promise", function() {
    expect(traceRaven.functionname()).toEqual(jasmine.any(Promise));
  });
});