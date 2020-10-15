// @ts-check
import 'regenerator-runtime/runtime';
import dappConstants from '../lib/constants.js';
import { connect } from './connect.js';

const { 
  INVITE_BRAND_BOARD_ID, 
  INSTANCE_BOARD_ID, 
  INSTALLATION_BOARD_ID,
  issuerBoardIds: {
    Token: TOKEN_ISSUER_BOARD_ID,
  },
} = dappConstants;


export default async function main() {
  let zoeInvitationDepositFacetId;
  
  /**
   * @param {{ type: string; data: any; walletURL: string }} obj
   */
  const walletRecv = obj => {
    switch (obj.type) {
      case 'walletDepositFacetIdResponse': {
        zoeInvitationDepositFacetId = obj.data;
      }
    }
  };

  /**
   * @param {{ type: string; data: any; }} obj
   */
  const apiRecv = obj => {
    switch (obj.type) {
      case 'fungibleFaucet/sendInvitationResponse': {
        // Once the invitation has been sent to the user, we update the
        // offer to include the invitationBoardId. Then we make a
        // request to the user's wallet to send the proposed offer for
        // acceptance/rejection.
        const { offer } = obj.data;
        walletSend({
          type: 'walletAddOffer',
          data: offer,
        });
        break;
      }
    }
  };

  const $mintFungible = /** @type {HTMLInputElement} */ (document.getElementById('mintFungible'));
  
  // All the "suggest" messages below are backward-compatible:
  // the new wallet will confirm them with the user, but the old
  // wallet will just ignore the messages and allow access immediately.
  const walletSend = await connect('wallet', walletRecv, '?suggestedDappPetname=FungibleFaucet').then(walletSend => {
    walletSend({ type: 'walletGetPurses'});
    walletSend({ type: 'walletGetDepositFacetId', brandBoardId: INVITE_BRAND_BOARD_ID });
    walletSend({
      type: 'walletSuggestInstallation',
      petname: 'Installation',
      boardId: INSTALLATION_BOARD_ID,
    });
    walletSend({
      type: 'walletSuggestInstance',
      petname: 'Instance',
      boardId: INSTANCE_BOARD_ID,
    });
    walletSend({
      type: 'walletSuggestIssuer',
      petname: 'Token',
      boardId: TOKEN_ISSUER_BOARD_ID,
    });
    return walletSend;
  });

  const apiSend = await connect('api', apiRecv).then(apiSend => {
    $mintFungible.removeAttribute('disabled');
    $mintFungible.addEventListener('click', () => {
        const offer = {
          // JSONable ID for this offer.  This is scoped to the origin.
          id: Date.now(),
      
          proposalTemplate: {
            want: {
              Token: {
                pursePetname: ["FungibleFaucet","Token"],
                value: 1000,
              },
            },
          },
        };
        apiSend({
          type: 'fungibleFaucet/sendInvitation',
          data: {
            depositFacetId: zoeInvitationDepositFacetId,
            offer,
          },
        });
    });
    
    return apiSend;
  });
}

main();
