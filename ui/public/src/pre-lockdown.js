/* eslint-env node */
/* global repairIntrinsics */
import 'ses/dist/ses.umd.js';
 // adds lockdown, harden, and Compartment
const errorTaming = process.env.NODE_ENV === 'development' ? 'unsafe' : 'safe';

// Help lock down the JS environment.  The start compartment (current evaluation context)
// can still access powerful globals, but this start compartment can use `new Compartment(...)`
// to evaluate code with stricter confinement.
repairIntrinsics({
  errorTaming,
  overrideTaming: 'severe',
});

Error.stackTraceLimit = Infinity;
