# Rules

All findings have error severity. Incomplete rules produce exit 2; fully evidenced contradictions produce exit 1. Locations use logical roles @questionnaire, @output, @runtime, with fixed-schema JSON pointers. No raw input is copied into diagnostics.

| Rule | Result | Meaning |
| --- | --- | --- |
| input-unreadable | incomplete | The named input could not be read as a stable regular file. |
| input-too-large | incomplete | Input exceeds the 1 MiB byte limit. |
| input-invalid-utf8 | incomplete | Input is not valid UTF-8. |
| input-invalid-json | incomplete | Input is not valid JSON. |
| input-duplicate-key | incomplete | An object contains a duplicate decoded member name. |
| input-depth-limit | incomplete | JSON exceeds depth 10. |
| input-node-limit | incomplete | JSON exceeds 20000 value nodes. |
| evaluation-deadline | incomplete | Evaluation exceeds the 5000 ms deadline. |
| unsupported-schema-version | incomplete | Schema version must be the string 1. |
| input-shape-invalid | incomplete | A field has an unsupported type or value. |
| unknown-field | incomplete | An object has an unsupported member. |
| required-field-missing | incomplete | A required field is absent. |
| required-text-unusable | incomplete | A required field has no usable rendered text. |
| text-limit | incomplete | A text field exceeds its documented character limit. |
| unsafe-boundary-text | incomplete | An identity or boundary contains invisible or control characters. |
| secret-like-content | incomplete | A field contains a recognizable credential pattern; no draft was generated. |
| unsupported-pdf-character | incomplete | Text contains an unsupported font character or shaping requirement. |
| target-limit | incomplete | Allowed targets exceed 500 records. |
| exclusion-limit | incomplete | Exclusions exceed 100 records. |
| window-limit | incomplete | Test windows exceed 100 records. |
| contact-limit | incomplete | Contacts exceed 20 records. |
| method-limit | incomplete | A method list exceeds 100 records. |
| allowed-targets-empty | incomplete | At least one allowed target is required. |
| window-list-empty | incomplete | At least one explicit test window is required. |
| method-list-empty | incomplete | Permitted and prohibited methods must be explicit nonempty lists. |
| emergency-contact-missing | incomplete | A complete emergency contact is required. |
| critical-contact-missing | incomplete | A complete critical-finding contact is required. |
| contact-invalid | incomplete | A contact or escalation channel is incomplete or malformed. |
| retention-invalid | incomplete | Retention days must be a nonnegative safe integer. |
| method-id-duplicate | incomplete | A method ID is repeated in a list. |
| timestamp-invalid | incomplete | A timestamp is not an exact valid UTC second. |
| domain-invalid | incomplete | A domain boundary is unsupported or malformed. |
| cidr-invalid | incomplete | An IP CIDR boundary is unsupported or noncanonical. |
| engagement-interval-invalid | fail | Engagement end must follow its start. |
| window-interval-invalid | fail | A window end must follow its start. |
| window-outside-engagement | fail | A window extends outside engagement validity. |
| method-policy-conflict | fail | A method is both permitted and prohibited. |
| all-targets-excluded | fail | Explicit exclusions cover every allowed target. |
| output-destination-symlink | incomplete | A destination or output directory is a symbolic link. |
| output-parent-escape | incomplete | A destination resolves outside the declared output root. |
| output-input-alias | incomplete | A destination shares a file identity with an input or asset. |
| output-exists | incomplete | An output destination already exists. |
| output-directory-invalid | incomplete | The output directory or its existing parent is unavailable. |
| output-write-failed | incomplete | Output staging, publication or durability failed. |
| output-cleanup-failed | incomplete | Partial draft cleanup failed; retained names identify incomplete files. |
| output-limit | incomplete | An artifact exceeds the page or byte limit. |
| runtime-resource-unavailable | incomplete | A required bundled resource or generation operation is unavailable. |
