// @ts-check
import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

const spawnHandler = (
  { creatorFacet, board, invitationIssuer },
  _invitationMaker,
) =>
  harden({
    // eslint-disable-next-line no-use-before-define
    getCommandHandler: makeLegacyCommandHandler({
      creatorFacet,
      board,
      invitationIssuer,
    }),
  });

export default harden(spawnHandler);

const makeLegacyCommandHandler = ({
  creatorFacet,
  board,
  invitationIssuer,
}) => {
  // Here's how you could implement a notification-based
  // publish/subscribe.
  const subChannelHandles = new Set();

  return function getCommandHandler() {
    const handler = {
      onError(obj, _meta) {
        console.error('Have error', obj);
      },

      // The following is to manage the subscribers map.
      onOpen(_obj, { channelHandle }) {
        subChannelHandles.add(channelHandle);
      },
      onClose(_obj, { channelHandle }) {
        subChannelHandles.delete(channelHandle);
      },

      async onMessage(obj, { _channelHandle }) {
        // These are messages we receive from either POST or WebSocket.
        switch (obj.type) {
          case 'faucet/sendInvitation': {
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
              type: 'faucet/sendInvitationResponse',
              data: { offer: updatedOffer },
            });
          }

          default:
            return undefined;
        }
      },
    };
    return harden(handler);
  };
};
