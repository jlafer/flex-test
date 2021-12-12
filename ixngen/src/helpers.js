import * as R from 'ramda';

export const getCmdPartiesReducer = (idsAccum, command) => {
  const cmdIds = command.parties.map(R.prop('identity'));
  return cmdIds.reduce(
    (accum, id) => R.contains(id, accum) ? accum : [...accum, id],
    idsAccum
  );
};

const addSourceIfMissing = R.curry((source, after) => {
  return (after)
    ? R.includes('.', after) ? after : `${source}.${after}`
    : undefined;
});
const addManualDefaultsToStep = R.curry((party, step) =>
  R.over(
    R.lensProp('after'),
    addSourceIfMissing(party.identity),
    step
  )
);
const addManualDefaultsToParty = (party) => {
  return {...party, steps: R.map(addManualDefaultsToStep(party), party.steps)};
};
const addManualDefaultsToCmd = (cmd) => {
  return {...cmd, parties: R.map(addManualDefaultsToParty, cmd.parties)};
};
export const addManualDefaults = (cmds) => R.map(addManualDefaultsToCmd, cmds);
