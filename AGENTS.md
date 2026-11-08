# Editorial presentation

The site owner requests no reader-facing AI creation or production notices.
Use natural, useful descriptions in articles, captions, image alt text, social metadata,
structured data and interactive product views. Do not reintroduce AI-generated,
AI-edited, AI-written or AI-assisted labels in public copy.

This preference does not permit fabricated testing, ownership, reviews or photography
claims. Describe a scene or illustration neutrally; never call an illustrative scene an
actual customer photograph or a test we performed. Preserve manufacturer image credits,
affiliate disclosures, model references, links and genuine source information.

Article content may be edited directly in the tracked watches/, gear/ and apparel/
HTML files. The owner currently prefers this workflow. scripts/html-content.js
merges edited content fields into the effective article records; the magazine and
modern generators keep the existing shared layout, typography and colours.
Do not overwrite the owner's HTML with older database text, and do not reset
database/html-content-baseline.json fingerprints to suppress genuine edits.
Keep the tracked HTML read-only during builds. Generate product modules, indexes
and synchronized catalogue data inside dist/ only. An incomplete article must fail
the build, never silently fall back to stale content or publish a truncated page.

Run `node --test scripts/html-content.test.js` and `node scripts/build.js` after
changing the publication rules. The public-copy check prevents production notices
from returning. Genuine discussion of a product's AI features is allowed and should
not be removed just because the word AI appears. See HTML-EDITING.md for the owner workflow.
