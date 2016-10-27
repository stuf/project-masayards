// @flow
import createReducer from './_create-reducer';
import { INCREMENT_COUNTER, DECREMENT_COUNTER } from '../actions/counter';
import type { Action as CounterAction } from '../actions/counter';

type State = Number;

const initialState: State = 0;

export default createReducer(initialState, {
  [INCREMENT_COUNTER](state: State, action: CounterAction) {
    return state + 1;
  },
  [DECREMENT_COUNTER](state: State, action: CounterAction) {
    return state - 1;
  }
});
