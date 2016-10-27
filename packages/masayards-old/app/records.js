// @flow
import { Record, Set, fromJS } from 'immutable';
import pkg from '../package.json';
import S from 'sanctuary';

const ApiHandler = Record({
  path: undefined,
  event: undefined,
  handler: undefined,
  flags: Set()
});

const ApiAction = Record({
  body: S.Nothing(),
  postBody: S.Nothing(),
  path: S.Nothing(),
  error: S.Nothing()
});

export const Internal = { ApiHandler, ApiAction };
