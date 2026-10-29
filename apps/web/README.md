# FANOVA Local MVP

**Status: LOCAL prototype.** This is a browser-local workflow, not a deployed or authenticated product.

## Run
Requires Node.js 20 or newer. From this directory:

```sh
npm test
npm start
```

Open `http://127.0.0.1:4173`.

## Included flow
1. Creator publishes an original story with explicit permitted-use rules.
2. Fan submits a contribution and acknowledges those rules.
3. Submission references the source story ID/version and the acknowledged permission version.
4. Creator approves or rejects; the domain layer rejects unauthorized review, stale permission versions, and duplicate decisions.
5. A fan-role failure-path action demonstrates the unauthorized-review rejection.

## Limitations
- State is stored in this browser's localStorage; there is no server or shared database.
- Demo identities are fixed. Role switching is for demonstration and is not authentication.
- Six domain tests exist. They have been run in an isolated local harness based on the fetched repository snapshot, not yet through a clean repository checkout.
- No wallet connection, contract, or Soneium transaction is implemented. Mainnet integration remains PLANNED.
- Local hashes/IDs do not establish legal ownership or licensing rights.
- Use original pilot content or material with documented permission.
