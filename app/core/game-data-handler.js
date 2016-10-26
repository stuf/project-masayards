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
//endregion

const PROTOCOL_VERSION: string = '1.1';

let firstGameLoad: boolean = true;
let debuggerAttached: boolean = false;
let req: ?RequestMap = null;

let _wc: ?Object = null;
let _transformerActions: ?TransformerActionMap = null;

//region Utility functions
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

//region `params` utilities
const getUrl = R.pathOr('', ['request', 'url']);

const getRequest = R.prop('request');

const getResponse = R.prop('response');

const getRequestId = R.prop('requestId');
//endregion

//region onBeforeRequestHandler
const onBeforeRequestHandler = ({ wc, transformerActions }:WcHandlerContext): void => (details, callback): void => {
  const cancel = config.gameSwfPrefix.test(details.url) && firstGameLoad;
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
const onDebuggerDetach = () => {
  console.log('onDebuggerDetach', _wc);
  debuggerAttached = false;
  return debuggerAttached;
};
//endregion

//region onDebuggerMessage
const onDebuggerMessage = (event, method, params): void => {
  console.log('request ID %s -> %s (url: %s)', getRequestId(params), method, getUrl(params));

  if (method == Network.LOADING_FAILED) {
    console.warn('Loading failed:', params);
  }

  if (config.pathPrefix.test(getUrl(params)) && !firstGameLoad) {
    let handlerFn;
    switch (method) {
      case Network.REQUEST_WILL_BE_SENT:
        handlerFn = requestWillBeSent;
        break;
      case Network.RESPONSE_RECEIVED:
        handlerFn = responseReceived;
        break;
      case Network.LOADING_FINISHED:
        handlerFn = loadingFinished;
        break;
    }
    if (!!handlerFn) {
      handlerFn(requestId, method, params);
    }
  }
};
//endregion

//region Network event handlers and application
//region Network.REQUEST_WILL_BE_SENT handler
const requestWillBeSent = (requestId: RequestId, method: string, params: any): void => {
  console.log('requestWillBeSent', { params });
  if (!config.pathPrefix.test(getUrl(params))) {
    return;
  }

  console.log('request will be sent:', method, getUrl(params));
  req = req.update(requestId,
    it => ({
      ...it,
      request: getRequest(params),
      path: processPath
    })
  );
};
//endregion

//region Network.RESPONSE_RECEIVED handler
const responseReceived = (requestId: RequestId, method: string, params: any): void => {
  console.log('handler.responseReceived', { params });
  if (!config.pathPrefix.test(getUrl(params))) {
    return;
  }

  req = req.update(requestId,
    it => ({ ...it, response: getResponse(response) }));
};
//endregion

//region Network.LOADING_FINISHED handler
const loadingFinished = (requestId: RequestId, method: string, params: any): void => {
  if (!req.has(requestId)) {
    return;
  }

  console.log('loadingFinished for requestId %s', requestId);

  const { path, request, response } = req.get(requestId);
  const debuggerPayload = { requestId };
  req = req.delete(requestId);

  const getResponseBodyHandlerFn = (err, result): void => {
    console.log('getResponseBodyHandlerFn', { err, result });
    const { body, postBody } = parseResponse(result);
    console.log('parsed:', { body, postBody });
    const eventToHandle = findEvent(path);
    const handler = transformerActions[eventToHandle];
    const res = { body, postBody, request, response };

    if (eventToHandle && handler) {
      console.log(`${requestId}: Network.getResponseBody done = ${path}\t%o`, JSON.parse(JSON.stringify({ ...res })));
      handler(res);
    }
  };

  wc.debugger.sendCommand(Network.GET_RESPONSE_BODY, debuggerPayload, getResponseBodyHandlerFn);
};
//endregion
//endregion

export const handleGameView = (transformerActions: TransformerActionMap): void => (e): void => {
  const view = e.target;
  const wc = view.getWebContents();
  const ws = wc.session;

  if (!req) {
    req = Map();
    console.log('RequestMap =>', req);
  }

  view.addEventListener('close', () => {
    console.info('Closing, disable debugger.');
    wc.debugger.sendCommand(Network.DISABLE);
  });

  if (!debuggerAttached) {
    console.info('Debugger not attached, trying to attach it.');
    try {
      wc.debugger.attach(PROTOCOL_VERSION);
      debuggerAttached = true;
    }
    catch (err) {
      console.error('Failed to attach debugger; ', e.message);
    }

    const cookies = getCookies();
    console.log('Setting cookies:\n%s', cookies);
    wc.executeJavaScript(cookies);
    wc.debugger.on('detach', onDebuggerDetach);
    wc.debugger.on('message', onDebuggerMessage);
    wc.debugger.sendCommand(Network.ENABLE);
    ws.webRequest.onBeforeRequest(onBeforeRequestHandler);
  }
};
