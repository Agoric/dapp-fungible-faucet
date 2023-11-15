/* global hardenIntrinsics */
/* eslint-disable import/no-extraneous-dependencies */
import './pre-lockdown.js';
import '@endo/eventual-send/shim'; // adds support needed by E

hardenIntrinsics();
