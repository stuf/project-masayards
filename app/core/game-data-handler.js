// @flow
import qs from 'querystring';
import { Map, List } from 'immutable';
import * as L from 'partial.lenses';
import * as R from 'ramda';
import * as S from 'sanctuary';

import config from '../config';
import { Network } from '../constants';
import { findEvent } from '../actions/api-actions';

//region Type definitions
type RequestResponse = {
  body: ?any,
  postData: ?string
};

type TransformerActionMap = { [key: string]: any };

type RequestId = string;

type RequestObject = {
  path: string,
  request: any,
  response: any,
  errors: Array<any>
};

type RequestMap = Immutable.Map<string, Object>;

type HandlerContext = {
  requestId: string,
  transformerActions: TransformerActionMap
};

type WcHandlerContext = {
  wc: any,
  transformerActions: TransformerActionMap
};

type ParseResponse = {
  body: ?any,
  postBody: ?any
};

interface NetworkEventHandler {

}
//endregion

const PROTOCOL_VERSION = '1.1';

let firstGameLoad: boolean = true;
let debuggerAttached: boolean = false;
let req: RequestMap = Map();

//region Utility functions
const shouldCancel = (url: string): boolean => (config.pathPrefix.test(url) && firstGameLoad);

const isGamePath = (url: string): boolean => config.pathPrefix.test(url) ? S.Just(url) : S.Nothing();

const processPath = S.Just((url: string): string => url.replace(config.pathPrefix, ''));

const wrapWith = R.curry((wc, transformerActions, fn) => fn({ wc, transformerActions }));

const getCookies = () => [
  'document.cookie = "cklg=welcome;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/";',
  'document.cookie = "cklg=welcome;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/netgame/";',
  'document.cookie = "cklg=welcome;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/netgame_s/";',
  'document.cookie = "ckcy=1;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/";',
  'document.cookie = "ckcy=1;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/netgame/";',
  'document.cookie = "ckcy=1;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/netgame_s/";'
].join('\n');
//endregion

//region onBeforeRequestHandler
const onBeforeRequestHandler = ({ wc, transformerActions }:WcHandlerContext): void => (details, callback): void => {
  const cancel = shouldCancel(details.url);
  callback({ cancel });

  if (!!cancel) {
    console.log(`Found game SWF at URL ${details.url}`);
    firstGameLoad = false;
    wc.loadURL(details.url);
  }
};
//endregion

//region Parsing bodies
/**
 * Encase the operation into an `Either` that will contain the
 * resulting error in `Left`, or the result of the successful operation in `Right`.
 * @type {S.encaseEither}
 */
const intoEither = S.encaseEither(S.I);

const parseJson = R.compose(JSON.parse, R.replace(config.apiDataPrefix, ''));

const parseQs = R.unary(qs.parse);

const parseResponse = (result): ParseResponse => ({
  body: intoEither(parseJson, result.body),
  postBody: intoEither(parseQs, result.postData)
});
//endregion

//region onDebuggerDetach
const onDebuggerDetach = ({ wc, transformerActions }:WcHandlerContext): void => {
  return () => {
    console.log('onDebuggerDetach', wc);
    debuggerAttached = false;
    return debuggerAttached;
  };
};
//endregion

//region onDebuggerMessage
const onDebuggerMessage = ({ wc, transformerActions }:WcHandlerContext): void => (event, method, params) => {
  const url = R.pathOr('', ['request', 'url'], params);
  if (isGamePath(url).isJust) {
    return handleNetworkMessage({ requestId: params.requestId, transformerActions })(wc, method, params);
  }
};
//endregion

//region Network event handlers and application
//region Network.REQUEST_WILL_BE_SENT handler
const requestWillBeSent = ({ requestId, transformerActions }:HandlerContext): void => R.curry((wc, method, params) => {
  if (!config.pathPrefix.test(params.request.url)) {
    return;
  }

  req = req.update(requestId,
    it => ({
      ...it,
      request: params.request,
      path: processPath
    })
  );
});
//endregion

//region Network.RESPONSE_RECEIVED handler
const responseReceived = ({ requestId, transformerActions }:HandlerContext): void => R.curry((wc, method, params) => {
  // console.log('handler.responseReceived', { wc, method, params });
  if (!config.pathPrefix.test(params.request.url)) {
    return;
  }

  req = req.update(requestId,
    it => ({ ...it, response: params.response }));
});
//endregion

//region Network.LOADING_FINISHED handler
const loadingFinished = ({ requestId, transformerActions }:HandlerContext): void => R.curry((wc, method, params) => {
  if (!req.has(requestId)) {
    return;
  }

  const { path, request, response } = req.get(requestId);
  const debuggerPayload = { requestId };
  req = req.delete(requestId);

  const getResponseBodyHandlerFn = (err, result): void => {
    const { body, postBody } = parseResponse(result);
    const eventToHandle = findEvent(path);
    const handler = transformerActions[eventToHandle];
    const res = { body, postBody, request, response };

    if (eventToHandle && handler) {
      console.log(`${requestId}: Network.getResponseBody done = ${path}\t%o`, JSON.parse(JSON.stringify({ ...res })));
      handler(res);
    }
  };

  wc.debugger.sendCommand(Network.GET_RESPONSE_BODY, debuggerPayload, getResponseBodyHandlerFn);
});
//endregion
//endregion

//region handleNetworkMessage
const handleNetworkMessage = ({ requestId, transformerActions }:HandlerContext): void => {
  return (wc, method, params) => {
    const fn = R.cond([
      [R.equals(Network.REQUEST_WILL_BE_SENT), R.identity(requestWillBeSent)],
      [R.equals(Network.RESPONSE_RECEIVED), R.identity(responseReceived)],
      [R.equals(Network.LOADING_FINISHED), R.identity(loadingFinished)],
      [R.T, R.always((...args) => args)]  // fallback, remove me
    ]);
    if (fn == null) return;
    return fn({ requestId, transformerActions })(wc, method, params);
  }
};
//endregion

export const handleGameView = (transformerActions: TransformerActionMap): void => (e): void => {
  const view = e.target;
  const wc = view.getWebContents();
  const ws = wc.session;
  const withWc = wrapWith(wc, transformerActions);

  view.addEventListener('close', () => {
    console.info('Closing, disable debugger.');
    wc.debugger.sendCommand(Network.DISABLE);
  });

  if (!debuggerAttached) {
    try {
      wc.debugger.attach(PROTOCOL_VERSION);
      debuggerAttached = true;
    }
    catch (err) {
      console.error('Failed to attach debugger; ', e.message);
    }

    const cookies = getCookies();
    console.log('Setting cookies: ', cookies);
    wc.executeJavaScript(cookies);
    wc.debugger.on('detach', withWc(onDebuggerDetach));
    wc.debugger.on('message', withWc(onDebuggerMessage));
    wc.debugger.sendCommand(Network.ENABLE);
    ws.webRequest.onBeforeRequest(withWc(onBeforeRequestHandler));
  }
};
