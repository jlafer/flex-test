/*
  actions

  constants for the step.action strings used in the JSON test files
  used by all parties, though some are specific to each party type
*/
export const ACTION_ACCEPT = 'accept';
export const ACTION_ACTIVITY = 'activity';
export const ACTION_ATTACH = 'attach';
export const ACTION_COMPLETE = 'complete';
export const ACTION_DIAL = 'dial';
export const ACTION_END = 'end';
export const ACTION_HOLD = 'hold';
export const ACTION_RELEASE = 'release';
export const ACTION_TRANSFER = 'transfer';
export const ACTION_TWIML = 'twiml';
export const ACTION_UNHOLD = 'unhold';

/*
  state changes

  only used by ixngen to communicate state chgs from getChangeToState()
  to state updating step and respondToClientMsg()
*/

export const CHG_CHANNEL_STATUS = 'CHANNEL_STATUS';
export const CHG_CLIENT_READY = 'CLIENT_READY';
export const CHG_END_COMMAND = 'END_COMMAND';
export const CHG_END_PARTY = 'END_PARTY';
export const CHG_END_TEST = 'END_TEST';
export const CHG_START_TEST = 'START_TEST';
export const CHG_STATS = 'CHG_STATS';

// operations

// sent by parties when ready to run test
export const OP_PARTY_READY = 'PARTY_READY';
// sent by ixngen to parties, to run a test command
export const OP_COMMAND = 'COMMAND';
// sent by Flex party to other parties, indicating change of device or ixn status
// other parties may need to wait for, or set timers on, these status changes
export const OP_CHANNEL_STATUS = 'CHANNEL_STATUS';
// sent by parties, indicating command progress (currently only command completion)
export const OP_PROGRESS = 'PROGRESS';
// sent by ixngen to parties, indicating changes in TEST_STATUS
export const OP_TEST_STATUS = 'TEST_STATUS';
// sent by Flex party to ixngen, providing stats from previous command
export const OP_PARTY_STATS = 'PARTY_STATS';
// currently not used
export const OP_NONE = 'NONE';
// looks like I meant for this to be sent by parties to ixngen if they need to end the test early
// TODO parties aren't sending it
export const OP_END = 'END';

/*
  test status

  These are used in two ways:
  1) sent by ixngen in OP_TEST_STATUS msgs to all clients
  2) ixngen uses it to manage the state of the test run
*/
// set when ixngen starts up; waiting for all parties to indicate readiness
export const TEST_STATUS_PENDING = 'PENDING';   
// set when ixngen determines all parties have indicated readiness
export const TEST_STATUS_STARTED = 'STARTED';
// set when ixngen determines last command in test has ended for all parties
export const TEST_STATUS_ENDED = 'ENDED';

/*
  party status

  only used by ixngen to track state
  tracks the status of each party
*/
// waiting on party to indicate readiness
export const PARTY_STATUS_PENDING = 'PENDING';
// party has indicated readiness
export const PARTY_STATUS_READY = 'READY';
// party has sent OP_PROGRESS msg, indicating its completion of the current command
// reset to READY when next command is started by ixngen
export const PARTY_STATUS_ENDED = 'ENDED';

/*
  command status

  only used by ixngen-cust to track state
  tracks whether current command has reached end of last step
*/
// command has been started by ixngen-cust
export const CMD_STATUS_STARTED = 'STARTED';
// last step in command has been completed by ixngen-cust
// reset to STARTED when next command is started by ixngen-cust
export const CMD_STATUS_ENDED = 'ENDED';

/*
  step status

  only used by ixngen-cust to track state
  tracks the status of the current command step
*/
// the current command step is ready to be executed
export const STEP_STATUS_READY = 'READY';
// the current command step has begun execution
export const STEP_STATUS_STARTED = 'STARTED';
// the current command step has completed execution
export const STEP_STATUS_ENDED = 'ENDED';
