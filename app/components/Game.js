// @flow
import React, { Component, PropTypes } from 'react';
import GameView from './game/GameView';
import GameUI from './game/GameUI';

class Game extends Component {
  static propTypes = {
    transformerActions: PropTypes.object.isRequired
  };

  render() {
    return (
      <div>
        <GameView transformers={this.props.transformerActions} />
        <GameUI />
      </div>
    );
  }
}

export default Game;
