// @flow
import React, { Component, PropTypes } from 'react';
import GameView from './game/GameView';
import GameUI from './game/GameUI';

class Game extends Component {
  static propTypes = {
    actions: PropTypes.object.isRequired,
    transformerActions: PropTypes.object.isRequired
  };

  render() {
    return (
      <div>
        <GameView actions={this.props.actions} transformerActions={this.props.transformerActions} />
        <GameUI />
      </div>
    );
  }
}

export default Game;
