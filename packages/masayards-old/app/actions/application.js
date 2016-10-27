// @flow
import { createAction } from 'redux-actions';
import { ipcRenderer, remote as electronRemote } from 'electron';

export const registerGameView = createAction('REGISTER_GAME_VIEW',
  /**
   * Game view registration action creator
   */
  webview => webview
);
