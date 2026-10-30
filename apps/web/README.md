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
- A read-only browser check calls the public Soneium RPC for chain ID and deployed bytecode at the known FANOVA contract address. It links to Blockscout and reports RPC errors honestly. It does not prove source equivalence.
- A wallet-driven onchain workflow is implemented in the browser for Soneium Mainnet (chain ID 1868): register the local source story, register the latest local contribution from a different wallet, then record the local creator decision from the story-creator wallet. Every write requires explicit wallet confirmation and costs ETH gas. The app checks for the expected contract event in each successful receipt.
- Ethers is loaded from jsDelivr only when the wallet workflow is used. A network/CDN failure prevents those wallet actions but does not prevent the local demo from loading.
- Story and contribution text remain offchain. The app can export a JSON evidence bundle containing local source text, canonical hash inputs, IDs, and recorded transaction hashes. Keep that export safe; it contains the full text.
- The read-only evidence verifier accepts an exported bundle, recomputes the source, permission, contribution, and decision-reason hashes, checks the creator-bound story ID, reads the story/version/contribution records from contract storage, and fetches recorded receipts from the configured Soneium RPC to match expected contract events. It never requests wallet access or submits transactions. It currently requires at least one onchain contribution record and an accessible RPC/CDN; it is a practical verification aid, not a full independent audit or proof of legal rights.
- The complete Mainnet story → contribution → decision flow has not yet been independently demonstrated. Do not claim the end-to-end onchain milestone complete until real receipts/events are checked from outside the app.
- Local hashes/IDs do not establish legal ownership or licensing rights.
- Use original pilot content or material with documented permission.
