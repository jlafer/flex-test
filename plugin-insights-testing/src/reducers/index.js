import { combineReducers } from 'redux';
import { reduce as customStoreReducer } from './customStoreReducer';

export default combineReducers({
  testingData: customStoreReducer
});
