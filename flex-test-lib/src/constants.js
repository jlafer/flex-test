// actions
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

// state changes
export const CHG_CHANNEL_STATUS = 'CHANNEL_STATUS';
export const CHG_CLIENT_READY = 'CLIENT_READY';
export const CHG_END_COMMAND = 'END_COMMAND';
export const CHG_END_PARTY = 'END_PARTY';
export const CHG_END_TEST = 'END_TEST';
export const CHG_START_TEST = 'START_TEST';
export const CHG_STATS = 'CHG_STATS';

// operations
export const OP_START = 'START';
export const OP_COMMAND = 'COMMAND';
export const OP_CHANNEL_STATUS = 'CHANNEL_STATUS';
export const OP_PROGRESS = 'PROGRESS';
export const OP_STATUS = 'STATUS';
export const OP_STATS = 'STATS';
export const OP_NONE = 'NONE';
export const OP_END = 'END';

// command status
export const CMD_STATUS_STARTED = 'STARTED';
export const CMD_STATUS_ENDED = 'ENDED';

// party status
export const PARTY_STATUS_PENDING = 'PENDING';
export const PARTY_STATUS_STARTED = 'STARTED';
export const PARTY_STATUS_ENDED = 'ENDED';

// step status
export const STEP_STATUS_READY = 'READY';
export const STEP_STATUS_STARTED = 'STARTED';
export const STEP_STATUS_ENDED = 'ENDED';

// test status
export const TEST_STATUS_PENDING = 'PENDING';
export const TEST_STATUS_READY = 'READY';
export const TEST_STATUS_STARTED = 'STARTED';
export const TEST_STATUS_ENDED = 'ENDED';
