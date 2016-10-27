// @flow
import { Seq, Map } from 'immutable';
import { createAction } from 'redux-actions';
import { ApiEventPaths } from '../constants';
import { Internal } from '../records';

export const handlers = Seq.Keyed(ApiEventPaths)
                           .flatMap((path, event) =>
                             Map.of(event, new Internal.ApiHandler({ path, event, handler: null })));

// TODO Replace with S.toMaybe
export const findEvent = (findPath) => {
  const pathRegex = new RegExp(`^${findPath}$`);
  return ApiEventPaths.findKey(path => pathRegex.test(path));
};

export const actionHandlers = Seq.Keyed(handlers)
                                .flatMap((handlerRecord, event) =>
                                  Map.of(event, createAction(event, handlerRecord.handler)));
