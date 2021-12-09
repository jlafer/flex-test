import {callApiFormEncoded} from 'jlafer-flex-util';

export const getSyncToken = (url, manager, identity) => {
  const flexState = manager.store.getState().flex;
  const token = flexState.session.ssoTokenPayload.token;
  
  const data = {Identity: identity, Token: token};
  return callApiFormEncoded(url, 'post', data);
};
