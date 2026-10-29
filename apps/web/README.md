# FANOVA Local MVP

**Status: LOCAL prototype.** This is a browser-local workflow, not a deployed or authenticated product.

## Run
Requires Node.js 20 or newer. From this directory:

```sh
npm test
npm start
```

Open `http://127.0.0.1:4173`.

For the real-browser end-to-end test, install Playwright and Chromium, then run:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:e2e
```

GitHub Actions runs this browser test on a clean checkout.

## Included flow
1. Creator publishes an original story with explicit permitted-use rules.
2. Fan submits a contribution and acknowledges those rules.
3. Submission references the source story ID/version and the acknowledged permission version.
4. Creator approves or rejects; the domain layer rejects unauthorized review, stale permission versions, and duplicate decisions.
5. A fan-role failure-path action demonstrates the unauthorized-review rejection.

## Limitations
- State is stored in this browser's localStorage; there is no server or shared database.
- Demo identities are fixed. Role switching is for demonstration and is not authentication.
- Eleven domain tests, JavaScript syntax checks, and the Playwright Chromium browser flow pass in GitHub Actions on a clean checkout. The browser test covers publication, contribution submission, unauthorized-review rejection, creator approval, and creator rejection.
- A read-only browser check calls the public Soneium RPC for chain ID and deployed bytecode at the known FANOVA contract address. It links to Blockscout and reports RPC errors honestly. It does not submit transactions, prove source equivalence, or anchor the local story workflow.
- Wallet connection and onchain story/contribution writes are not implemented. Those remain PLANNED.
- Local hashes/IDs do not establish legal ownership or licensing rights.
- Use original pilot content or material with documented permission.
