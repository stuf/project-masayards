// @flow
import React, { Component, PropTypes } from 'react';
import { findDOMNode } from 'react-dom';
import { handleGameView } from '../../core/game-data-handler';
import config from '../../config';

class GameView extends Component {
  static propTypes = {
    actions: PropTypes.object.isRequired,
    transformerActions: PropTypes.object.isRequired
  };

  componentDidMount() {
    const webView = Object.assign(document.createElement('webview'), {
      nodeintegration: true,
      plugins: true,
      partition: `persist:${config.partitionName}`,
      src: config.gameUrl
    });

    webView.addEventListener('dom-ready', handleGameView(this.props.transformerActions));

    findDOMNode(this.refs.gameViewHolder).appendChild(webView);
  }

  render() {
    return (
      <div className="dbg">
        <div ref="gameViewHolder" id="game-view-holder"></div>
      </div>
    )
  }
}

export default GameView;
