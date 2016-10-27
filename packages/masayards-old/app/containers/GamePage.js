// @flow
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { actionHandlers } from '../actions/api-actions';
import * as applicationActions from '../actions/application';
import Game from '../components/Game';

const mapStateToProps = state => state;

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(applicationActions, dispatch),
  transformerActions: bindActionCreators(actionHandlers.toJS(), dispatch)
});

export default connect(mapStateToProps, mapDispatchToProps)(Game);
