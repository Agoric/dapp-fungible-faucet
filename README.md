# Faucet Dapp

TL;DR:
```sh
# Start the Agoric platform
agoric install && agoric start --reset
# In another terminal, deploy this contract
agoric deploy contract/deploy.js
# Start the API server
agoric deploy api/deploy.js
```
Then navigate to http://localhost:3000/.

The Fungible Faucet Dapp is the simplest [Agoric
Dapp](https://agoric.com/documentation/dapps/). It
demonstrates the three important parts of
a dapp and how they should be connected:
1. the browser UI (the frontend)
2. the API server (the backend)
3. the on-chain contract

This dapp starts a local
blockchain on your computer, and deploys a basic contract to that
blockchain. It does not currently deploy or connect to the Agoric testnet.

This particular dapp UI is written in vanilla JS for simplicity (as
opposed to using a framework).

## Functionality

The Fungible Faucet Dapp:

1. Accesses the user's Agoric wallet
2. At the user's request, mints new Tokens and sends them to the user's wallet.

To learn more about how to build Agoric Dapps, please see the [Dapp Guide](https://agoric.com/documentation/dapps/).

See the [Dapp Deployment Guide](https://github.com/Agoric/agoric-sdk/wiki/Dapp-Deployment-Guide) for how to deploy this Dapp on a public website, such as https://fungiblefaucet.testnet.agoric.com/
