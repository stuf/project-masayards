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
//endregion

const PROTOCOL_VERSION = '1.1';

let firstGameLoad = true;
let debuggerAttached = false;

//region Utility functions
const shouldCancel = url => (config.pathPrefix.test(url) && firstGameLoad);

const isGamePath = url => config.pathPrefix.test(url) ? S.Just(url) : S.Nothing();

const processPath = S.Just((url) => url.replace(config.pathPrefix, ''));

const wrapWith = R.curry((wc, fs, fn) => fn(wc, fs));

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
function onBeforeRequestHandler(wc, transformerActions) {
  return (details, callback) => {
    const cancel = shouldCancel(details.url);
    callback({ cancel });

    if (!!cancel) {
      console.log(`Found game SWF at URL ${details.url}`);
      firstGameLoad = false;
      wc.loadURL(details.url);
    }
  }
}
//endregion

//region onDebuggerDetach
function onDebuggerDetach(wc) {
  return () => {
    console.log('onDebuggerDetach', wc);
    debuggerAttached = false;
    return debuggerAttached;
  };
}
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

type ParseResponse = {
  body: ?any,
  postBody: ?any
};

const parseResponse = (result): ParseResponse => ({
  body: intoEither(parseJson, result.body),
  postBody: intoEither(parseQs, result.postData)
});
//endregion

//region onDebuggerMessage
function onDebuggerMessage(wc, transformerActions) {
  return (event, method, params) => {
    const url = R.pathOr('', ['request', 'url'], params);
    if (isGamePath(url).isJust) {
      return handleNetworkMessage(params.requestId, transformerActions)(wc, method, params);
    }
  };
}
//endregion

//region Network event handlers and application
//region Network.REQUEST_WILL_BE_SENT handler
const requestWillBeSent = (requestId, transformerActions) => R.curry((wc, method, params) => {
  // console.log('handler.requestWillBeSent', { wc, method, params });
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
const responseReceived = (requestId, transformerActions) => R.curry((wc, method, params) => {
  // console.log('handler.responseReceived', { wc, method, params });
  if (!config.pathPrefix.test(params.request.url)) {
    return;
  }

  req = req.update(requestId,
    it => ({ ...it, response: params.response }));
});
//endregion

//region Network.LOADING_FINISHED handler
const loadingFinished = (requestId, transformerActions) => R.curry((wc, method, params) => {
  // console.log('handler.loadingFinished', { wc, method, params });
  if (!req.has(requestId)) {
    return;
  }

  const { path, request, response } = req.get(requestId);
  const debuggerPayload = { requestId };
  req = req.delete(requestId);

  const getResponseBodyHandlerFn = (err, result) => {
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
function handleNetworkMessage(requestId, transformerActions) {
  return (wc, method, params) => {
    const fn = R.cond([
      [R.equals(Network.REQUEST_WILL_BE_SENT), R.identity(requestWillBeSent)],
      [R.equals(Network.RESPONSE_RECEIVED), R.identity(responseReceived)],
      [R.equals(Network.LOADING_FINISHED), R.identity(loadingFinished)],
      [R.T, R.always((...args) => args)]
    ]);
    if (fn == null) return;
    return fn(wc, method, params);
  }
}
//endregion

export function handleGameView(transformerActions) {
  return (e) => {
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
}

