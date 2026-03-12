import type { BaysideAPI } from '../shared/types';

declare global {
  interface Window {
    baysideAPI: BaysideAPI;
  }
}

