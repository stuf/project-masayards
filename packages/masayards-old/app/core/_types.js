// @flow
import type 'immutable';

/**
 * The `HandlerContext` specifies references to some core resources, that are
 * required for handling data.
 */
export type HandlerContext = {
  wc: any,
  requestMap: any
};
