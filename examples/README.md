# Offline synthetic examples

All names, contacts and boundaries are fictitious. The 2030 timestamps are questionnaire data, not release or commit dates. Use a fresh output directory whose parent already exists.

```sh
node bin/rules-of-engagement-builder.mjs --input examples/complete/questionnaire.json --out-dir drafts/
```

Expected: exit 0, pass JSON, zero findings, five unsigned draft files.

```sh
node bin/rules-of-engagement-builder.mjs --input examples/missing-emergency/questionnaire.json --out-dir incomplete-drafts/
```

Expected: exit 2, incomplete JSON with emergency-contact-missing, no output directory or documents.

```sh
node bin/rules-of-engagement-builder.mjs --input examples/contradictory-methods/questionnaire.json --out-dir conflicting-drafts/
```

Expected: exit 1, fail JSON with method-policy-conflict, no output directory or documents. Never treat an example draft or unsigned candidate as signed authorization.
