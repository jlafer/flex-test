# ixngen

`ixngen` is a CLI app that acts as the server and coordinator of `flex-test`. It processes a suite of test cases and communicates with the clients, which act as the participants in the tests. Those clients include `ixngen-cust` and the `plugin-insights-testing` Flex plugin.

## Installation

    npm install

## Configuration

A test suite definition file, named `testSuite.json` can be placed in any folder. The `--indir` command-line argument should specify the folder. See `testSuite.json` in the project root folder for an example.

The JSON document consists of an array of "command" objects. The only required property of each command is an `id` for unique identification. A `name` property can provide a human-readable string for easier identification of test results and log messages.

A command includes standardized "party" properties which instruct participants in the test system to take the steps needed to complete the command. The valid party keys are `cust`, `agt1`, `agt2` and `agt3`. Each `party` property is an array of `step` objects, which indicate what that party should do in support of a test case or, more broadly, the test suite.

A step object must include an `action` property, which is a string value containing the action name. For each action there is a set of associated parameters. There are standard parameters that can apply to any action. Those are the following:

Here are the valid `action` names and the valid parameters for each:

#### Standard Parameters
- `wait` - specifies the number of seconds to wait, after a preceding event has been triggered, before executing the step. By default, 
- `after` - this parameter specifies the party and event that acts as the start of the waiting period for the `wait` parameter. If not specified, the wait starts when the immediately preceding step for the party completes (or when the command starts, for the first step). This parameter takes the form of `<party>.<event>`. If the party identity is not specified, the current party is assumed. The valid events are: `dialed`, `alerted`, `accepted`, `canceled`, `rejected`, `rescinded`, `held`, `retrieved`, `transfer-started`, `consult-started`, `conference-started`, `transfer-canceled`, `ended`, `completed`.

### activity
Change the worker activity. For agent parties only.

#### Parameters
- `name` - one of the valid activity names in the test workspace: `Available`, `Busy`, `Break`, `Lunch`, etc.

### dial
Dial a phone number.

#### Parameters
- `to` - the number to dial
- `from` - the dialed-from number
- `twiml` - a TwiML string that should be submitted with call-creation and executed when the call is first answered
- `data` - an object containing attributes to merge into the Task's `Attributes` object

### release
Release a phone call.

### accept
Accept a task or answer a phone call.

### hold
Put a phone call on hold.

### unhold
Retrieve a phone call from hold.

### attach
Attach attributes to a task.

#### Parameters
- `data` - an object containing the attributes to merge into the Task's `Attributes` object

### transfer
Transfer a call to another agent or a queue.

#### Parameters
- `targetType` - either `queue` or `agent`
- `targetName` - the queue name or agent name (i.e., `agt1`,  `agt2` or `agt3`)
- `mode` - either `WARM` or `COLD`

### twiml
Respond with TwiML to HTTP requests at /ixngen/twiml. This is useful for passing data to non-Flex clients, such as Studio flows used in a test case.

#### Parameters
- `request` - the sequence number of the TwiML request within the current command
- `response` - the TwiML string to be returned

### complete
Complete a task that is in wrapup.

## Phone Number Setup
For handling inbound phone calls, phone numbers should be handled by an application that issues a `gather` step with a 20-second timeout value. It should send the call into Flex when the "caller" presses a key. The phone number's Call Status Change callback should point to the URL of the `ixngen-cust` endpoint. See the README document for that program for instructions.

## Sync Map
A Sync map is used for communication between `ixngen`, `ixngen-cust` and the Flex client (i.e., `plugin-insights-testing`). This map has the name `TestSteps` and, if not present, is created by the first of the three programs that is started.

There is a Serverless helper function, `readSyncMapKey`, located in `dev/twilio/syncmap-fns`. It can be called with parameters `map=TestSteps` and `key=all` to get the `command` object for the current test case, which it should pass to Flex Insights for identifying the task in the database. It does this by setting the `conversation_attribute_1` Task attribute with the command ID, like so:

```json
"conversations": {
  "conversation_attribute_1": "<command.id>"
}
```

 This serverless function can be built into your project's Serverless service and called from your apps that simulate the customer and interact with the `ixngen-cust` client. For example, it can be called from a Studio flow prior to routing a call to the Flex client.

## Execution
    ./bin/ixngen run <cmd-filename> -a <account sid> -A <auth token> -w <studio flow sid> -i <indir> -o <outdir>
