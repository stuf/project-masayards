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

const processPath = S.Just((url, prefix) => url.replace(prefix, ''));

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
function onBeforeRequestHandler(details, callback) {
  const cancel = shouldCancel(details.url);
  callback({ cancel });

  if (!!cancel) {
    console.log(`Found game SWF at URL ${details.url}`);
    firstGameLoad = false;
    wc.loadURL(details.url);
  }
}
//endregion

//region onDebuggerDetach
function onDebuggerDetach(wc) {
  console.log('onDebuggerDetach', wc);
  return () => {
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

const removeApiToken = S.Just(d => { d.api_token = null; return d; });

type ParseResponse = {
  body: ?any,
  postBody: ?any
};

const parseResponse = (result):ParseResponse => ({
  body: intoEither(parseJson, result.body),
  postBody: intoEither(parseQs, result.postData)
});

//region onDebuggerMessage
function onDebuggerMessage(wc) {
  console.log('onDebuggerMessage:create', wc);
  return (event, method, params) => {
    console.log('onDebuggerMessage', event, method, params);
    const pathPrefix = config.pathPrefix;
    const requestId = params.requestId;
    const url = S.toMaybe(R.path(['request', 'url']));

    return handleNetworkMessage(wc, method, params);
  };
}
//endregion

//region Network event handlers and application
//region Network.REQUEST_WILL_BE_SENT handler
const requestWillBeSent = (requestId, transformerActions) => R.curry((wc, method, params) => {
  console.log('handler.requestWillBeSent', { wc, method, params });
  if (!config.pathPrefix.test(params.request.url))
    return;

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
  console.log('handler.responseReceived', { wc, method, params });
  if (!config.pathPrefix.test(params.request.url))
    return;

  req = req.update(requestId,
    it => ({ ...it, response: params.response }));
});
//endregion

//region Network.LOADING_FINISHED handler
const loadingFinished = (requestId, transformerActions) => R.curry((wc, method, params) => {
  console.log('handler.loadingFinished', { wc, method, params });
  if (!req.has(requestId))
    return;

  const { path, request, response } = req.get(requestId);
  const debuggerPayload = { requestId };
  req = req.delete(requestId);

  const getResponseBodyHandlerFn = (err, result) => {
    const { body, postBody } = parseResponse(result);

    // TODO Replace with S.toMaybe
    const eventToHandle = findEvent(path);

    // TODO Replace with S.toMaybe
    const handler = transformerActions[eventToHandle];

    const res = { body, postBody };

    if (eventToHandle && handler) {
      console.log(`${requestId}: Network.getResponseBody done = ${path}\t%o`,
        JSON.parse(JSON.stringify({ ...res })));
      // TODO Replace with Maybe
      // handler.ap(res);
      handler(res);
    }
  };

  // wc.debugger.sendCommand(Network.GET_RESPONSE_BODY, debuggerPayload, handleGetResponseBody(path, request, response));
  wc.debugger.sendCommand(Network.GET_RESPONSE_BODY, debuggerPayload, getResponseBodyHandlerFn);
});
//endregion

function handleNetworkMessage(wc, method, params) {
  console.log(`handleNetworkMessage: '${method}'`);
  const fn = R.cond([
    [R.equals(Network.REQUEST_WILL_BE_SENT), R.identity(requestWillBeSent)],
    [R.equals(Network.RESPONSE_RECEIVED), R.identity(responseReceived)],
    [R.equals(Network.LOADING_FINISHED), R.identity(loadingFinished)]
  ]);
  if (fn == null) return;
  //const a = R.apply(S.lift3, R.map(S.toMaybe, [fn, wc, method, params]));
  return fn(wc, method, params);
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

      wc.debugger.on('detach', withWc(onDebuggerDetach));
      wc.debugger.on('message', withWc(onDebuggerMessage));
      wc.debugger.sendCommand(Network.ENABLE);
      ws.webRequest.onBeforeRequest(withWc(onBeforeRequestHandler));
      wc.executeJavaScript(getCookies());
    }
  };
}

