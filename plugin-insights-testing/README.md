# Flex Insights Testing Plugin

This project is a Flex plugin that supports Flex UI and Insights testing. It provides the client side of a tool for executing a suite of Flex test cases. The server side of the tool (`ixngen`) is a server app that executes the test suite, sending inbound tasks to this and other Flex clients.

While the test cases are owned and managed by ixngen, the suite execution must be initiated by a request from the Flex UI clients. This plugin provides a button by which the tester can manually start the test suite. This is the only manual step required for test suite execution.

This server and the client(s) communicate and coordinate the execution of the test suite via a Sync map. This allows the clients, for example, to let ixngen know when they put a call on hold or when an agent has changed state. Conversely, ixngen uses the Sync map to pass test case definitions to the clients and instruct them to take actions, such as to change agent-state.

Every client must indicate their readiness to start the test suite by sending the `start` operation message. Once all clients have indicated their readiness, `ixngen` will start the testing. The server and clients exchange syncmap updates to advance through the test cases.

The definition of the test cases and the required instructions to clients are specified in server-side JSON files.

Following test suite execution, expected results are posted to a file. Actual results include both the observed behavior of the clients and actual results data written to Flex Insights. The xxxxxxxxxxxxxxx report can be used to generate a CSV file of actual results for comparison with the expected results.

## Installation

    Clone or download this repo into a new folder.
    npm install

## Configuration


## Development

In order to develop locally, you can use the Webpack Dev Server by running:

```bash
npm start
```

This will automatically start up the Webpack Dev Server and open the browser for you. Your app will run on `http://localhost:8080`. If you want to change that you can do this by setting the `PORT` environment variable:

```bash
PORT=3000 npm start
```

When you make changes to your code, the browser window will be automatically refreshed.

## Deploy

Once you are happy with your plugin, you have to bundle it in order to deploy it to Twilio Flex.

Run the following command to start the bundling:

```bash
npm run build
```

Afterwards, you'll find in your project a `build/` folder that contains a file with the name of your plugin project. For example, `plugin-example.js`. Take this file and upload it into the Assets part of your Twilio Runtime.

Note: Common packages like `React`, `ReactDOM`, `Redux` and `ReactRedux` are not bundled with the build because they are treated as external dependencies so the plugin will depend on Flex to provide them globally.