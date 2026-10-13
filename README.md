# Rules of Engagement Builder

Generate a rules-of-engagement draft, a client authorization-letter draft, and an unsigned scope candidate from one local JSON questionnaire. Markdown and selectable-text PDFs share the same validated content. Drafts grant no permission, verify no identity, collect no signatures, and start no testing.

Every document carries **DRAFT — NOT AUTHORIZED UNTIL SIGNED**. A typed signature placeholder never changes that status.

## Run locally

Requires Node 22 or newer. No package installation, dependencies, DNS, network, provider accounts or remote fonts are needed.

```sh
node bin/rules-of-engagement-builder.mjs --input examples/complete/questionnaire.json --out-dir drafts/ --human
node bin/rules-of-engagement-builder.mjs --help
```

The output directory's parent must already exist. The tool may create only the final output directory. Five files are generated: `rules-of-engagement.md`, `authorization-letter.md`, their matching `.pdf` files, and `scope-candidate.json`. Existing final files are refused; choose a fresh directory for another run. Inputs are preserved. New documents have mode 0600; newly created output/staging directories have mode 0700, subject to the operating system's permission semantics.

To confine output to an existing directory, add `--output-root /path/to/permitted-root`. Real parents must remain inside it. Without that option, the caller names an unconfined output destination and symlinked ancestors are followed. The output directory itself and final output files may never be symlinks. Hard links to the questionnaire or bundled font are refused.

## Inputs and policy

See [questionnaire schema](docs/questionnaire.schema.json) and the [complete synthetic example](examples/complete/questionnaire.json). All shown fields are required, all object keys are closed, and duplicate decoded JSON keys are refused. Explicit empty exclusions are valid. At least one allowed target, explicit test window, permitted method, prohibited method, emergency contact and critical-finding contact are required.

UTC timestamps are exact `YYYY-MM-DDTHH:mm:ssZ` calendar seconds. Window boundaries are inclusive; overlapping/touching valid windows merge. Reversed or out-of-engagement intervals and permitted/prohibited method conflicts are policy failures. Domain boundaries explicitly specify exact-name or subdomain matching. Names normalize to ASCII lowercase without DNS lookup. CIDRs require literal canonical network addresses with no host bits. Exclusions always override allowances; fully excluded targets are a policy failure. No live assets are looked up.

Retention is an explicit nonnegative integer number of days; zero means immediate disposal. Contacts are private document content; their format does not prove identity or reachability. Known credential patterns refuse the entire generation operation. Detection is conservative and incomplete: review input and generated private documents yourself. No truncation or secret removal is used to make an incomplete questionnaire look complete. Required text is checked in its actual rendered form. Identity/boundary controls are refused; descriptive controls are stripped only before presence validation. Missing font glyphs, lone surrogates and combining/complex-script shaping are unsupported and refused before either format is written. Precomposed supported accented characters work.

## Reports and exit codes

stdout contains one JSON report followed by a newline. `--human` adds a fixed nonprivate summary to stderr; help is also on stderr. Report files/pointers use logical source roles `@questionnaire`, `@output` and `@runtime`, referring to the exact file/directory named at invocation or bundled runtime asset. Unknown keys and duplicate members use the safe parent pointer plus member ordinal. Findings never echo input values, private contacts, arbitrary keys, filenames, parser exception snippets or absolute host paths.

| Exit | Meaning | stdout |
| --- | --- | --- |
| 0 | Five complete unsigned drafts generated | pass report |
| 1 | Complete questionnaire has policy contradictions | fail report; no draft files |
| 2 | Missing/malformed evidence, exceeded limit, unsupported input or generation failure | incomplete report |
| 2 | Invalid CLI options/configuration | empty; fixed stderr diagnostic |

The report lists exactly the successfully published files. Failed generation has no complete file list. If rollback cannot remove an owned partial file, `retainedFiles` names incomplete destinations and an `output-cleanup-failed` finding is emitted. Consult [rules](docs/rules.md) and [report schema](docs/report.schema.json).

## Limits and deterministic behavior

Input <=1,048,576 bytes; allowed domains+CIDRs <=500; excluded domains+CIDRs <=100; windows <=100; contacts <=20; each method list <=100. JSON depth <=10 (root depth 1), value nodes <=20,000. Text <=4,096 UTF-16 units; IDs <=128 ASCII units. Each artifact <=8 MiB and each PDF <=1,024 pages. Evaluation uses an injected monotonic deadline of 5,000 ms: exact equality is allowed and exceeding it is incomplete. Checks are cooperative around bounded CPU/I/O steps; it is not a hard cancellation guarantee for a stalled kernel filesystem operation.

All limits are inclusive. No truncated input passes. Identical inputs produce byte-identical reports and artifacts; ordering uses UTF-16 code units, never locale collation. No PDF timestamp, random ID or ambient authorization-time inference is added.

## Scope candidate and authority

`scope-candidate.json` is a distinct **unsigned-scope-candidate**, has `authorization: "not-authorized"` and `requiresClientSignature: true`, and omits all personal contacts, representative/provider information, handling prose and cryptographic material. It is not a final Scope Guard schema or a signed scope. Its boundary fields are a starting point: prepare the complete guard scope, including its independently required contact fields, review it with the client, and obtain an independent client-controlled signature outside this builder. Scope Guard must refuse an unsigned candidate. The builder cannot verify that any later signature is genuine and does not hold signing keys.

## Library

```js
import {buildDrafts} from 'rules-of-engagement-builder';
const report = await buildDrafts({inputPath:'questionnaire.json',outDir:'drafts'});
```

`buildDrafts` resolves local assets relative to the installed package. `evaluateBytes(bytes, {font, fontBytes, now})` is a no-write preparation interface for advanced callers with an explicitly supplied bundled font; it does not claim publication. Default generation uses a monotonic clock; neither interface infers consent from wall-clock time. Optional injected filesystem/clock seams are library testing controls, never questionnaire options.

## Verify offline

Have Node, local pnpm or npm, `tar`, and Poppler (`pdfinfo`, `pdffonts`, `pdftotext`, `pdftoppm`) already installed. Tests never fetch prerequisites or contact a target. PDF checks require the independent parser and fail if it is missing.

```sh
pnpm run lint
pnpm run test
pnpm run check
pnpm run pack:check
```

Scripts have equivalent npm names where npm is installed. `check` runs lint, tests and passing/incomplete/contradictory examples. `pack:check` makes an offline local tarball and tests its extracted CLI; it does not publish or install anything. Font embedding, field text extraction, output boundaries, rollback, exact limits and a network-denial preload are tested.

## Boundaries and non-goals

Use a private trusted output directory. Staging and no-replace promotion protect existing files; catchable failures roll back only owned file identities. Five files in an existing directory cannot be committed as a crash-atomic set with portable Node built-ins. Sudden kill/power loss may leave partial drafts with no success report; continuously hostile ancestor-directory mutation is outside portable path-based protections. See [security boundaries](docs/security-boundaries.md).

No legal opinion, jurisdiction-specific guarantees, client identity verification, signature service, authorization grant, live lookup, scanner, testing execution, network, provider adapter, analytics, telemetry or publication of client data. Source is MIT; the unmodified embedded font has separate retained terms in [third-party notices](THIRD_PARTY_NOTICES.md).
