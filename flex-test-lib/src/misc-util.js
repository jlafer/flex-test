import {findObjByKeyVal} from 'jlafer-lib';

export const getParty = findObjByKeyVal('identity');

export function terminateProcess(message, code) {
  console.log(message);
  process.exit(code);
}