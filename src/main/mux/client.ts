import Mux from '@mux/mux-node';
import { MUX_TOKEN_ID, MUX_TOKEN_SECRET } from '../config';

let mux: Mux | null = null;

export function getMux() {
  if (!mux) {
    mux = new Mux({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });
  }
  return mux;
}
