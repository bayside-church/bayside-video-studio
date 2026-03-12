import Mux from '@mux/mux-node';
import { getMuxTokenId, getMuxTokenSecret } from '../settings';

let mux: Mux | null = null;
let lastTokenId = '';
let lastTokenSecret = '';

export function getMux() {
  const tokenId = getMuxTokenId();
  const tokenSecret = getMuxTokenSecret();

  // Recreate client if credentials changed
  if (!mux || tokenId !== lastTokenId || tokenSecret !== lastTokenSecret) {
    mux = new Mux({ tokenId, tokenSecret });
    lastTokenId = tokenId;
    lastTokenSecret = tokenSecret;
  }
  return mux;
}
