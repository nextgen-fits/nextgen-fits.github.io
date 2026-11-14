# Direct HTML publishing

All tracked HTML files are the source of truth, including home, Shop, category pages, articles.html, policies and article pages. The owner edits these files directly in GitHub.

Keep the existing system-font visual design and CSS/JS assets. Edit the actual HTML requested by the owner. Never rebuild HTML from database JSON, templates or field fingerprints, and never re-enable editorial, magazine, modern, picks, affiliate-routing or public-copy postprocessors in publication. Old generator files are inactive historical tools, not the publishing path.

scripts/build.js only copies HTML and assets unchanged to dist, then derives the sitemap and guide-search index. It must not write tracked source files, alter any HTML byte, block unrelated pages because of an article wrapper, or require database edits. Run node --test scripts/build.test.js and node scripts/build.js when changing publication.

Preserve URLs, current owner copy, affiliate links, real model information and source credits. No reader-facing production notices; never fabricate tests, ownership, customer reviews or photography.
