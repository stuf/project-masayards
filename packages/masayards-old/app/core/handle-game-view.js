// @flow
import R from 'ramda';
import { Record } from 'immutable';
import { cookies } from './cookies';
import { onDebuggerDetach, onDebuggerMessage, onBeforeRequest } from './handlers';
import { HandlerContext } from './records';
import { transformerActionMap } from './transformer-action-map';

const PROTOCOL_VERSION: string = '1.1';

/**
 * @export
 * @param {TransformerActionMap} transformerActions
 * @returns {void}
 */
export function handleGameView(transformerActions: TransformerActionMap): void {
  console.info('handleGameView; transformers=%O', transformerActions);
  let debuggerAttached = false;

  return (event): void => {
    const view = event.target;
    const wc = view.getWebContents();
    const ws = wc.session;

    view.addEventListeners('close', (e) => {
      console.log('Closing; disabling debugger.');
      wc.debugger.sendCommand('Network.disable');
    });

    const context = new HandlerContext({
      webContents: wc
    });

    if (!debuggerAttached) {
      try {
        wc.debugger.attach(PROTOCOL_VERSION);
        debuggerAttached = true;
      }
      catch (err) {
        console.error('An error has occurred:', err);
      }

      // Set our event listeners
      wc.executeJavascript(cookies);
      wc.debugger.on('detach', onDebuggerDetach);
      wc.debugger.on('message', onDebuggerMessage);
      wc.debugger.sendCommand('Network.enable');
      ws.webRequest.onBeforeRequest(onBeforeRequest);
    }
  }
}
