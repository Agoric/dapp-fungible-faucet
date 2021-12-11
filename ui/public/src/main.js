/* eslint-disable import/no-extraneous-dependencies */
// @ts-check
/* globals document mdc */
import './install-ses-lockdown.js';
import { E } from '@agoric/eventual-send';
import { observeNotifier } from '@agoric/notifier';
import dappConstants from '../lib/constants.js';
import '@agoric/wallet-connection/agoric-wallet-connection.js';

const {
  INVITE_BRAND_BOARD_ID,
  INSTANCE_BOARD_ID,
  INSTALLATION_BOARD_ID,
  INVITATION_ISSUER_BOARD_ID,
  issuerBoardIds: { Token: TOKEN_ISSUER_BOARD_ID },
  brandBoardIds: { Token: TOKEN_BRAND_BOARD_ID },
} = dappConstants;

export default async function main() {
  let zoeInvitationDepositFacetId;
  let tokenPursePetname = ['FungibleFaucet', 'Token'];
  let walletP;
  let publicFacet;
  let board;
  let invitationIssuer;
  const offers = new Set();

  const $mintFungible = /** @type {HTMLInputElement} */ (document.getElementById(
    'mintFungible',
  ));

  const $walletStatus = /** @type {HTMLInputElement} */ (document.getElementById(
    'wallet-status',
  ));

  const enableButtons = () => {
    $mintFungible.removeAttribute('disabled');
    $mintFungible.addEventListener('click', async () => {
      const offer = {
        // JSONable ID for this offer.  This is scoped to the origin.
        id: Date.now(),

        proposalTemplate: {
          want: {
            Token: {
              pursePetname: tokenPursePetname,
              value: 1000,
            },
          },
        },

        // Tell the wallet that we're handling the offer result.
        dappContext: true,
      };

      const depositFacet = E(board).getValue(zoeInvitationDepositFacetId);
      const invitation = await E(publicFacet).makeInvitation();
      const invitationAmount = await E(invitationIssuer).getAmountOf(
        invitation,
      );
      const {
        value: [{ handle }],
      } = invitationAmount;
      const invitationHandleBoardId = await E(board).getId(handle);
      const updatedOffer = { ...offer, invitationHandleBoardId };

      // We need to wait for the invitation to be
      // received, or we will possibly win the race of
      // proposing the offer before the invitation is ready.
      // TODO: We should make this process more robust.
      await E(depositFacet).receive(invitation);
      addOffer(updatedOffer);
    });
  };

  const approveOfferSB = mdc.snackbar.MDCSnackbar.attachTo(
    document.querySelector('#approve-offer'),
  );

  approveOfferSB.timeoutMs = 4000;

  const gotPaymentSB = mdc.snackbar.MDCSnackbar.attachTo(
    document.querySelector('#got-payment'),
  );

  const approveDappDialog = mdc.dialog.MDCDialog.attachTo(
    document.querySelector('#open-wallet'),
  );

  const addOffer = async (offer) => {
    const offerId = await E(walletP).addOffer(offer);
    approveOfferSB.open();
    offers.add(offerId);
  };

  // Gets the petname for the token purse that holds our token brand for use in offers.
  const updateTokenPursePetname = (purses) => {
    const tokenPurse = purses.find(
      // Does the purse's brand match our token brand?
      ({ brandBoardId }) => brandBoardId === TOKEN_BRAND_BOARD_ID,
    );
    if (tokenPurse && tokenPurse.pursePetname) {
      // If we got a petname for that purse, use it in the offers we create.
      tokenPursePetname = tokenPurse.pursePetname;
    }
  };

  const getDepositFacetId = async () => {
    zoeInvitationDepositFacetId = await E(walletP).getDepositFacetId(
      INVITE_BRAND_BOARD_ID,
    );
  };

  const updateOfferSnackbars = (walletOffers) => {
    for (const offerId of offers) {
      const walletOffer = walletOffers.find((offer) => offer.id === offerId);

      if (walletOffer && walletOffer.status === 'accept') {
        gotPaymentSB.open();
        offers.delete(offerId);
      }
    }
  };

  const setWalletP = async (bridge) => {
    if (walletP) {
      return;
    }
    walletP = bridge;

    observeNotifier(E(walletP).getPursesNotifier(), {
      updateState: updateTokenPursePetname,
    });

    observeNotifier(E(walletP).getOffersNotifier(), {
      updateState: updateOfferSnackbars,
    });

    getDepositFacetId();

    E(walletP).suggestInstallation('Installation', INSTALLATION_BOARD_ID);
    E(walletP).suggestInstance('Instance', INSTANCE_BOARD_ID);
    E(walletP).suggestIssuer('Token', TOKEN_ISSUER_BOARD_ID);

    const zoe = E(walletP).getZoe();
    board = E(walletP).getBoard();
    invitationIssuer = E(board).getValue(INVITATION_ISSUER_BOARD_ID);
    const instance = await E(board).getValue(INSTANCE_BOARD_ID);
    publicFacet = E(zoe).getPublicFacet(instance);
    enableButtons();
  };

  const onWalletState = (ev) => {
    const { walletConnection, state } = ev.detail;
    $walletStatus.innerText = state;
    switch (state) {
      case 'idle': {
        setWalletP(E(walletConnection).getScopedBridge('FungibleFaucet'));
        break;
      }
      case 'approving': {
        approveDappDialog.open();
        break;
      }
      case 'error': {
        console.log('error', ev.detail);
        // In case of an error, reset to 'idle'.
        // Backoff or other retry strategies would go here instead of immediate reset.
        E(walletConnection).reset();
        break;
      }
      default:
    }
  };

  const awc = document.querySelector('agoric-wallet-connection');
  awc.addEventListener('state', onWalletState);
}

main();
