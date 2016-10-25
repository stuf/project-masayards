// @flow
import { Map } from 'immutable';
import R from 'ramda';
import S from 'sanctuary';
import { Network } from '../../constants';
import config from '../../config';

let req = Map();

const processPath = S.Just((url, prefix) => url.replace(prefix, ''));

