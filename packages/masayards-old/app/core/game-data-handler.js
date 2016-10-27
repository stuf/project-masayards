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
type TransformerActionMap = { [key: string]: any };

type RequestId = string;

type RequestObject = {
  path: string,
  request: any,
  response: any,
  errors: Array<any>
};

type RequestMap = Immutable.Map<string, Object>;

type ParseResponse = {
  body: ?any,
  postBody: ?any
};
//endregion

const PROTOCOL_VERSION: string = '1.1';

let firstGameLoad: boolean = true;
let debuggerAttached: boolean = false;
let req: ?RequestMap = Map();

let _wc = null;
let _ws = null;
let _transformerActions: ?TransformerActionMap = null;

//region Utility functions
const processPath = (url: string): string => url.replace(config.pathPrefix, '');

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
const onBeforeRequestHandler = (details, callback): void => {
  const cancel = config.gameSwfPrefix.test(details.url) && firstGameLoad;
  callback({ cancel });

  if (!!cancel) {
    console.log(`Found game SWF at URL ${details.url}`);
    firstGameLoad = false;
    _wc.loadURL(details.url);
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

//region Network event handlers and application
//region Network.REQUEST_WILL_BE_SENT handler
const requestWillBeSent = (requestId: RequestId, method: string, params: any): void => {
  const url: string = getUrl(params);
  if (config.pathPrefix.test(url)) {
    console.log('requestWillBeSent', method, url);
    req = req.update(requestId,
      it => ({
        ...it,
        request: getRequest(params),
        path: processPath(url)
      })
    );
  }
};
//endregion

//region Network.RESPONSE_RECEIVED handler
const responseReceived = (requestId: RequestId, method: string, params: any): void => {
  const url: string = getUrl(params);
  if (config.pathPrefix.test(url)) {
    req = req.update(requestId, it => ({ ...it, response: getResponse(response) }));
  }
};
//endregion

//region Network.LOADING_FINISHED handler
const loadingFinished = (requestId: RequestId, method: string, params: any): void => {
  if (req.has(requestId)) {
    console.log('loadingFinished for requestId %s', requestId);

    const { path, request, response } = req.get(requestId);
    const debuggerPayload = { requestId };
    req = req.delete(requestId);

    const getResponseBodyHandlerFn = (err, result): void => {
      // const { body, postBody } = parseResponse(result);
      console.log('getResponseBodyHandlerFn', { err, result });
      // console.log('parsed:', { body, postBody });
      const eventToHandle = findEvent(path);
      const handler = _transformerActions[eventToHandle];
      const res = { body, postBody, request, response };

      if (eventToHandle && handler) {
        console.log(`${requestId}: Network.getResponseBody done = ${path}\t%o`, JSON.parse(JSON.stringify({ ...res })));
        handler(res);
      }
    };

    _wc.debugger.sendCommand(Network.GET_RESPONSE_BODY, debuggerPayload, getResponseBodyHandlerFn);
  }
};
//endregion
//endregion

//region onDebuggerDetach
const onDebuggerDetach = () => {
  console.log('onDebuggerDetach', _wc);
  debuggerAttached = false;
  return debuggerAttached;
};
//endregion

const messageHandler = R.cond([
  [R.equals(Network.REQUEST_WILL_BE_SENT), R.always(requestWillBeSent)],
  [R.equals(Network.RESPONSE_RECEIVED), R.always(responseReceived)],
  [R.equals(Network.LOADING_FINISHED), R.always(loadingFinished)],
  [R.T, R.always((...args) => console.warn('Unhandled method with arguments:', args))]
]);

//region onDebuggerMessage
const onDebuggerMessage = (event, method, params): void => {
  if (config.pathPrefix.test(getUrl(params))) {
    messageHandler(method)(getRequestId(params), method, params);
  }
};
//endregion

export const handleGameView = (transformerActions: TransformerActionMap): void => (e): void => {
  const view = e.target;
  _wc = view.getWebContents();
  _ws = _wc.session;
  _transformerActions = transformerActions;

  view.addEventListener('close', () => {
    console.info('Closing, disable debugger.');
    _wc.debugger.sendCommand(Network.DISABLE);
  });

  if (!debuggerAttached) {
    console.info('Debugger not attached, trying to attach it.');
    try {
      _wc.debugger.attach(PROTOCOL_VERSION);
      debuggerAttached = true;
    }
    catch (err) {
      console.error('Failed to attach debugger; ', e.message);
    }

    const cookies = getCookies();
    console.log('Setting cookies:\n%s', cookies);
    _wc.executeJavaScript(cookies);
    _wc.debugger.on('detach', onDebuggerDetach);
    _wc.debugger.on('message', onDebuggerMessage);
    _wc.debugger.sendCommand(Network.ENABLE);
    _ws.webRequest.onBeforeRequest(onBeforeRequestHandler);
  }
};
