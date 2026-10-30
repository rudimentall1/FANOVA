# Sony Application Evidence Map

**Source reviewed:** official six-page PDF, “Application Form · Question List” (24 questions in 22 sections): https://onchain-entertainment.sony.com/assets/pdf/application_question_list.pdf  
**Program page:** https://onchain-entertainment.sony.com/en/incubation-program/  
**Status:** Questionnaire has been visually reviewed page-by-page. This is an evidence map, not a submitted application. Founder-specific legal, financial, and contact answers remain unverified and must not be guessed.

## Exact question map

| # | Official question / field | Honest current position | Evidence / action needed |
|---:|---|---|---|
| 1 | What would you like to do? | Select “Apply for the Program” if submitting an application. | This project is intended for the program, not an inquiry. |
| 2 | Please provide the name of your project. | FANOVA | Public repository: https://github.com/rudimentall1/FANOVA |
| 3 | Select the category that best describes your project. | Likely “IP/Media” | Product is about creator-authorized fan derivative works; confirm the current form's options. |
| 4 | What is the current stage of your project development? | Early-stage application prototype with a completed user-approved Story registration, Contribution registration, and Creator decision sequence on Soneium Mainnet. FANOVA's read-only verifier returned `VERIFIED` for the records included in the exported evidence bundle. The original verifier did not enumerate the full contract event history. A later code change adds event-history scanning and bundle reconciliation; live Mainnet validation of that new path remains pending. The smoke test used placeholder content (`Story title`); it is not a creator pilot or proof of product-market fit. | Evidence: CI run https://github.com/rudimentall1/FANOVA/actions/runs/41002055409; contract address and deployment transaction in README. Confirm the form's stage definitions before choosing the label. |
| 5 | If you have a website, demo, or any relevant links, please provide them below. | Public GitHub repository and deployed browser demo are available. The browser wallet workflow has completed one Soneium Mainnet smoke test; label it as an early-stage demo, not a production application or creator pilot. | Provide the repository and a clearly labelled prototype/demo URL. One complete Mainnet smoke test is documented in `docs/DEMO_AND_EVIDENCE.md`; an original-IP pilot and production use remain outstanding. |
| 6 | Please select the range that best represents your current user base. | Unknown; do not infer from repository visitors or test identities. | Count real product users, not demo identities. Confirm whether zero users fits the “0–1,000” option. |
| 7 | Please indicate your project's current level of blockchain integration. | A minimal provenance contract is deployed on Soneium Mainnet (chain ID 1868). One user-approved live sequence completed: `registerStoryVersion` (block 30105304), `registerContribution` (block 30105412), and `decideContribution` (block 30105502). FANOVA's original read-only evidence-bundle verifier returned `VERIFIED` for the included records. A later code change adds event-history scanning and bundle reconciliation; live Mainnet validation remains pending. See `docs/DEMO_AND_EVIDENCE.md` for transaction links and limits. | Contract: `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880`; deployment tx: `0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff9f9f8f102cf9e34c`. Blockscout reports a partial source match; do not claim full source verification. |
| 8 | Tell us about the composition of your core team. | Likely “Founder only”, subject to founder confirmation. | Confirm who is actively working on the project and which functions are genuinely covered. |
| 9 | Please select the option that best reflects your company's current organizational status. | Unknown. | Founder must confirm incorporation and full-time employee count. |
| 10 | Where is your company or project primarily based? | Unknown. | Founder must choose the truthful geography option based on the actual company/project base, not inferred IP location. |
| 11 | Please indicate the total amount of funding raised to date. | Unknown; do not infer. | Confirm actual external funding raised. |
| 12 | Please select the category that best describes your current investors or backers. | Unknown; likely “None” only if founder confirms there are no investors/backers. | Confirm investor/backer status. |
| 13 | Based on your current resources, how much operational runway does your team have? | Unknown. | Founder must calculate runway from actual available resources and burn. |
| 14 | Select the experience that best represents the founder's background. | Unknown which form option best fits. | Choose based on verifiable founder history, not aspirational positioning. |
| 15 | Please confirm your organization's compliance status. | Requires explicit founder confirmation. | Do not make a legal/compliance attestation on assumption. |
| 16 | What is the current status of your project's token issuance? | Not issued. The user has selected FANOVA as the token name, but issuance is not approved. Whether the application requires a defined token concept remains an eligibility question, not permission to launch. | Confirm the current official eligibility wording, then define a justified utility/distribution concept only if required. Do not deploy or promote a token without explicit approval. Do not confuse a FANOVA token with Soneium's separate ecosystem token. |
| 17 | Please indicate your project's plans regarding an Initial Exchange Offering (IEO). | “No IEO plans” under the current scope. | No token sale or IEO is planned for this MVP. Reconfirm before submitting. |
| 18 | Please describe your current plans for building or launching on Soneium. | Soneium Mainnet integration is implemented for the minimal provenance workflow, and one Story registration, Contribution registration, and Creator decision sequence has completed onchain. The original project verifier returned `VERIFIED` for the included records; the new event-history scanner is implemented locally but has not yet been validated against this live bundle. | Describe this as a successful early-stage Mainnet workflow, not a production launch. See `docs/DEMO_AND_EVIDENCE.md`; the test content is still placeholder data. |
| 19 | Please describe your current plans for building or launching on Soneium. | Likely “IP inflow” as intended ecosystem contribution, not a result already achieved. | Explain that FANOVA aims to bring creator-authorized original IP and derivative relationships; do not claim actual IP partners/users yet. |
| 20 | What value do you expect your project to bring to the Soneium ecosystem? | Likely “IP / content”. | Position FANOVA as a workflow for permissioned fan contributions, attribution, and creator review that may increase creator/IP activity on Soneium. |
| 21 | Have you previously spoken with or been in contact with any Sony representative regarding this program? | Unknown; founder must answer. | Confirm whether any direct Sony representative contact occurred. |
| 22 | If yes, please provide the name(s) of the Sony representative(s) you have spoken with. | Only answer if Q21 is Yes. | Use actual names; never invent a contact. |
| 23 | Contact Email Address (if you would like a response) | Founder input required. | Provide an address the founder controls. |
| 24 | Inquiry Details | Only relevant if using inquiry flow rather than applying. | For an application, follow the application route rather than substituting an inquiry. |

## Product claims that can be made now

- FANOVA is an early-stage project with a public repository, a CI-verified local browser workflow, and one minimal provenance contract deployed on Soneium Mainnet.
- Its intended workflow is creator publishes a story and permission rules, a fan submits a contribution, the creator approves or rejects it, and the provenance record remains inspectable.
- The deployed contract is at `0x3A302Cbb8570a76E8e7E1Dc15A763552A3c40880`; deployment transaction: `0xb2086bd26326b428f4806e9a93a202631528ec8bffe4ff9f9f8f102cf9e34c`.
- One complete user-approved Soneium Mainnet Story registration, Contribution registration, and Creator decision sequence has been executed. The original read-only verifier returned `VERIFIED` for the included records; the new event-history scanner is implemented locally and CI-tested, but live Mainnet validation is pending. This is not a third-party audit or external certification.
- Soneium Mainnet is the target network (chain ID 1868); Minato is optional, not a required milestone.
- No FANOVA token has been issued, and no verified creator partner, real user base, or product revenue has been established by the current evidence.

## Must not claim yet

- A third-party audit or external evaluator's independent reproduction of the evidence check. The original project verifier returned `VERIFIED` for the included records. The new full-history scan has not yet been independently reproduced or validated against the live Mainnet bundle.
- Legal ownership or licensing rights established solely by hashes or onchain records.
- Sony endorsement, partnership, contact, or selection.
- User traction, creator demand, revenue, funding, or runway without founder-supplied evidence.
- A production-ready, authenticated, server-persisted application. The demonstrated flow is an early-stage browser workflow with local content state and wallet-approved contract writes; production identity management and server-backed persistence are not established.

## Official program context

The Soneium-hosted announcement for Sony's program says applications are accepted through December 2026 and identifies originality of entertainment experience, use of IP, community building, business scalability, track record, and competitive landscape among evaluation factors. This aligns the near-term work with real creator validation, a verifiable user flow, and evidence-backed positioning-not feature count.

## Remaining founder inputs

Before final submission, confirm Q6 and Q8–15, Q21–23. Those answers cannot be determined safely from the public repository. Everything else should be refreshed against implementation evidence immediately before submitting.

## Eligibility discrepancy requiring confirmation (2026-10-29)

Sony's Japanese-language official press release appears to list having a token issuance concept/plan among the program's eligibility conditions: https://www.sony.com/ja/SonyInfo/News/Press/202610/26-024/ . The English-language Sony announcement and the questionnaire reviewed for this map do not make that requirement equally explicit. Treat this as an unresolved discrepancy, not as permission to invent a token plan.

- Before submitting, confirm the latest eligibility wording with the official program instructions or a program contact.
- The current MVP decision remains: no token issued and no IEO planned.
- Do not deploy, promote, or claim a FANOVA token. If a token concept is confirmed to be mandatory, request explicit founder approval to revise ADR-003 and define a narrowly scoped, utility-led concept separately from any issuance decision.
