// @flow
import { HandlerContext } from '../_types';

const onBeforeRequest = (context: HandlerContext) => () => {
  // Handler function body
  console.log('onBeforeRequest');
};

export default onBeforeRequest;
