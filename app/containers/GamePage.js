// @flow
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { actionHandlers } from '../actions/api-actions';
import Game from '../components/Game';

const mapStateToProps = state => state;

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(null, dispatch),
  transformerActions: bindActionCreators(actionHandlers.toJS(), dispatch)
});

export default connect(mapStateToProps, mapDispatchToProps)(Game);
