// @flow

const onDebuggerDetach = (context) => () => {
  // Handler function body
  console.log('onDebuggerDetach');
};

export default onDebuggerDetach;
