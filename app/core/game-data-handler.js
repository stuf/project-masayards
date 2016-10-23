// @flow
import qs from 'querystring';
import { Map } from 'immutable';
import * as L from 'partial.lenses';
import * as R from 'ramda';
import * as S from 'sanctuary';

import config from '../config';
import { findEvent } from '../actions/api-actions';

type RequestResponse = {
  body: ?any,
  postData: ?string
};

const Network = {
  REQUEST_WILL_BE_SENT: 'Network.requestWillBeSent',
  RESPONSE_RECEIVED: 'Network.responseReceived',
  LOADING_FINISHED: 'Network.loadingFinished',
  DETACH: 'Network.detach',
  ENABLE: 'Network.enable',
  DISABLE: 'Network.disable',
  GET_RESPONSE_BODY: 'Network.getResponseBody'
};

const PROTOCOL_VERSION = '1.1';

let req = Map();
let firstGameLoad = true;
let debuggerAttached = false;

//region Utility functions
const shouldCancel = url => (config.pathPrefix.test(url) && firstGameLoad);

const processPath = S.Just((url, prefix) => url.replace(prefix, ''));

const getCookies = () => [
  'document.cookie = "cklg=welcome;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/";',
  'document.cookie = "cklg=welcome;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/netgame/";',
  'document.cookie = "cklg=welcome;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/netgame_s/";',
  'document.cookie = "ckcy=1;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/";',
  'document.cookie = "ckcy=1;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/netgame/";',
  'document.cookie = "ckcy=1;expires=Sun, 09 Feb 2019 09:00:09 GMT;domain=.dmm.com;path=/netgame_s/";'
].join('\n');
//endregion

function onBeforeRequestHandler (details, callback) {
  const cancel = shouldCancel(details.url);
  callback({ cancel });

  if (!!cancel) {
    console.log(`Found game SWF at URL ${details.url}`);
    firstGameLoad = false;
    wc.loadURL(details.url);
  }
}

function onDebuggerDetach () {
  debuggerAttached = false;
  return debuggerAttached;
}

function handleNetworkMessage(wc, method, params) {
  const fn = R.cond([
    [R.equals(Network.REQUEST_WILL_BE_SENT), () => console.log('REQUEST_WILL_BE_SENT')],
    [R.equals(Network.RESPONSE_RECEIVED), () => console.log('RESPONSE_RECEIVED')],
    [R.equals(Network.LOADING_FINISHED), () => console.log('LOADING_FINISHED')]
  ]);
}


function onDebuggerMessage(wc) {
  console.log('Handle this message');
  return (event, method, params) => {
    const pathPrefix = config.pathPrefix;
    const requestId = params.requestId;
    const url = S.toMaybe(R.path(['request', 'url']));

    return handleNetworkMessage(wc, method, params);
    // switch (method) {
    //   case Network.REQUEST_WILL_BE_SENT:
    //     if (pathPrefix.test(params.request.url)) {
    //       req = req.update(requestId,
    //         it => ({
    //           ...it,
    //           request: params.request,
    //           path: processPath.ap(url)
    //         })
    //       );
    //     }
    //     break;
    //   case Network.RESPONSE_RECEIVED:
    //     if (pathPrefix.test(params.request.url)) {
    //       req = req.update(requestId,
    //         it => ({ ...it, response: params.response }));
    //     }
    //     break;
    //   case Network.LOADING_FINISHED:
    //     if (req.has(requestId)) {
    //       const { path, request, response } = req.get(requestId);
    //       const debuggerPayload = { requestId };
    //       req = req.delete(requestId);
    //       wc.debugger.sendCommand(Network.GET_RESPONSE_BODY, debuggerPayload, handleGetResponseBody(path, request, response));
    //     }
    //     break;
    // }
  };
}

/**
 * Encase the operation into an `Either` that will contain the
 * resulting error in `Left`, or the result of the successful operation in `Right`.
 * @type {S.encaseEither}
 */
const intoEither = S.encaseEither(S.I);

const parseJson = R.compose(JSON.parse, R.replace(config.apiDataPrefix, ''));

const parseQs = R.unary(qs.parse);

const parseResponse = result => ({
  body: intoEither(parseJson, result.body),
  postBody: intoEither(parseQs, result.postData)
});

// Dispatch the appropriate event
function handleGetResponseBody (path, request, response) {
  return (err, result: RequestResponse) => {
    const _result = parseResponse(result);
    const eventToHandler = findEvent(path);
  };
}

// ----------------------------------------------

export function handleGameView (transformerActions) {
  return (e) => {
    const view = e.target;
    const wc = view.getWebContents();
    const ws = wc.session;

    view.addEventListener('close', () => {
      wc.debugger.sendCommand(Network.DISABLE);
    });

    if (!debuggerAttached) {
      // TODO Extract into S.encaseEither
      try {
        wc.debugger.attach(PROTOCOL_VERSION);
        debuggerAttached = true;
      }
      catch (err) {
        console.error('Failed to attach debugger; ', e.message);
      }

      wc.debugger.on('detach', onDebuggerDetach);
      wc.debugger.on('message', onDebuggerMessage);
      wc.debugger.sendMessage(Network.ENABLE);
      ws.webRequest.onBeforeRequest(onBeforeRequestHandler);
      wc.executeJavaScript(getCookies());
    }
  };
}
