// @ts-check
import { E } from '@agoric/eventual-send';

const spawnHandler = (
  { creatorFacet, board, invitationIssuer },
  _invitationMaker,
) =>
  harden({
    // This creates the commandHandler for the http service to handle inbound
    // websocket requests.
    getCommandHandler() {
      const handler = {
        // Executed upon an error in handling the websocket.
        onError(obj, _meta) {
          console.error('Have error', obj);
        },

        // These hooks are run when the websocket is opened or closed.
        onOpen(_obj, { _channelHandle }) {},
        onClose(_obj, { _channelHandle }) {},

        // This hook is run for every JSON object received over the websocket.
        async onMessage(obj, { _channelHandle }) {
          switch (obj.type) {
            case 'fungibleFaucet/sendInvitation': {
              const { depositFacetId, offer } = obj.data;
              const depositFacet = E(board).getValue(depositFacetId);
              const invitation = await E(creatorFacet).makeInvitation();
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

              return harden({
                type: 'fungibleFaucet/sendInvitationResponse',
                data: { offer: updatedOffer },
              });
            }

            default:
              return undefined;
          }
        },
      };
      return harden(handler);
    },
  });

export default harden(spawnHandler);
