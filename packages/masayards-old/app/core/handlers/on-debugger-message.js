// @flow

const onDebuggerMessage = (context) => () => {
  // Handler function body
  console.log('onDebuggerMessage');
};

export default onDebuggerMessage;
