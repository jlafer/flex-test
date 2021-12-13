import * as R from 'ramda';

export const getCmdPartiesReducer = (idsAccum, command) => {
  const cmdIds = command.parties.map(R.prop('identity'));
  return cmdIds.reduce(
    (accum, id) => R.includes(id, accum) ? accum : [...accum, id],
    idsAccum
  );
};

const addSelfAsSourcePartyIfMissing = R.curry((self, after) => {
  return (after)
    ? R.includes('.', after) ? after : `${self}.${after}`
    : undefined;
});
const addOtherDefaultsToStep = R.curry((party, step) =>
  R.over(
    R.lensProp('after'),
    addSelfAsSourcePartyIfMissing(party.identity),
    step
  )
);
const addOtherDefaultsToParty = (party) => {
  return {...party, steps: R.map(addOtherDefaultsToStep(party), party.steps)};
};
const addOtherDefaultsToCmd = (cmd) => {
  return {...cmd, parties: R.map(addOtherDefaultsToParty, cmd.parties)};
};
export const addOtherDefaults = (cmds) => R.map(addOtherDefaultsToCmd, cmds);
