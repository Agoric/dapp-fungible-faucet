// @ts-check

// Agoric Dapp api deployment script

import fs from 'fs';
import { E } from '@agoric/eventual-send';
import '@agoric/zoe/exported.js';

import installationConstants from '../ui/public/conf/installationConstants.js';

// deploy.js runs in an ephemeral Node.js outside of swingset. The
// spawner runs within ag-solo, so is persistent.  Once the deploy.js
// script ends, connections to any of its objects are severed.

/**
 * @typedef {Object} DeployPowers The special powers that `agoric deploy` gives us
 * @property {(path: string) => Promise<{ moduleFormat: string, source: string }>} bundleSource
 * @property {(path: string) => string} pathResolve
 * @property {(path: string, opts?: any) => Promise<any>} installUnsafePlugin
 *
 * @typedef {Object} Board
 * @property {(id: string) => any} getValue
 * @property {(value: any) => string} getId
 * @property {(value: any) => boolean} has
 * @property {() => [string]} ids
 */

/**
 * @typedef {{ zoe: ZoeService, board: Board, spawner, wallet, uploads, http }} Home
 * @param {Promise<Home>} homePromise
 * A promise for the references available from REPL home
 * @param {DeployPowers} powers
 */
export default async function deployApi(homePromise, { pathResolve }) {
  // Let's wait for the promise to resolve.
  const home = await homePromise;

  // Unpack the references.
  const {
    // Zoe lives on-chain and is shared by everyone who has access to
    // the chain. In this demo, that's just you, but on our testnet,
    // everyone has access to the same Zoe.
    zoe,

    // The board is an on-chain object that is used to make private
    // on-chain objects public to everyone else on-chain. These
    // objects get assigned a unique string id. Given the id, other
    // people can access the object through the board. Ids and values
    // have a one-to-one bidirectional mapping. If a value is added a
    // second time, the original id is just returned.
    board,
  } = home;

  // To get the backend of our dapp up and running, first we need to
  // grab the installation that our contract deploy script put
  // in the public board.
  const { INSTALLATION_BOARD_ID, CONTRACT_NAME } = installationConstants;
  const installation = await E(board).getValue(INSTALLATION_BOARD_ID);

  // Second, we can use the installation to create a new instance of
  // our contract code on Zoe. A contract instance is a running
  // program that can take offers through Zoe. Making an instance will
  // give us a `creatorFacet` that will let us make invitations we can
  // send to users.
  const { instance, publicFacet } = await E(zoe).startInstance(installation);

  console.log('- SUCCESS! contract instance is running on Zoe');

  console.log('Retrieving Board IDs for issuers and brands');
  const invitationIssuerP = E(zoe).getInvitationIssuer();
  const invitationBrandP = E(invitationIssuerP).getBrand();
  const tokenIssuer = await E(publicFacet).getTokenIssuer();
  const tokenBrand = await E(tokenIssuer).getBrand();
  const invitationIssuer = await invitationIssuerP;

  const [
    INSTANCE_BOARD_ID,
    TOKEN_BRAND_BOARD_ID,
    TOKEN_ISSUER_BOARD_ID,
    INVITATION_ISSUER_BOARD_ID,
  ] = await Promise.all([
    E(board).getId(instance),
    E(board).getId(tokenBrand),
    E(board).getId(tokenIssuer),
    E(board).getId(invitationIssuer),
  ]);

  console.log(`-- Contract Name: ${CONTRACT_NAME}`);
  console.log(`-- INSTANCE_BOARD_ID: ${INSTANCE_BOARD_ID}`);
  console.log(`-- TOKEN_ISSUER_BOARD_ID: ${TOKEN_ISSUER_BOARD_ID}`);
  console.log(`-- TOKEN_BRAND_BOARD_ID: ${TOKEN_BRAND_BOARD_ID}`);

  const invitationBrand = await invitationBrandP;
  const INVITE_BRAND_BOARD_ID = await E(board).getId(invitationBrand);

  // Re-save the constants somewhere where the UI and api can find it.
  const dappConstants = {
    INSTANCE_BOARD_ID,
    INSTALLATION_BOARD_ID,
    INVITE_BRAND_BOARD_ID,
    INVITATION_ISSUER_BOARD_ID,
    // BRIDGE_URL: 'agoric-lookup:https://local.agoric.com?append=/bridge',
    brandBoardIds: {
      Token: TOKEN_BRAND_BOARD_ID,
    },
    issuerBoardIds: { Token: TOKEN_ISSUER_BOARD_ID },
  };
  const defaultsFile = pathResolve(`../ui/public/conf/defaults.js`);
  console.log('writing', defaultsFile);
  const defaultsContents = `\
// GENERATED FROM ${pathResolve('./deploy.js')}
export default ${JSON.stringify(dappConstants, undefined, 2)};
`;
  await fs.promises.writeFile(defaultsFile, defaultsContents);
}
