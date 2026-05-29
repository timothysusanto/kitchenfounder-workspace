# Skill: file-builder

## When to use this skill
Use when writing any large HTML, CSS, JS, or text file to disk in the KitchenFounder workspace.

## RULE 1 — Use exec cat heredoc, never the write tool
The write tool requires python3 which is NOT available in the exec sandbox.
Always use exec with a heredoc. Use a unique delimiter like ENDOFFILE or HTMLEOF.

## RULE 2 — Never use sessions_spawn for file writing
The phantom spawn bug makes subagents unreliable in long sessions.
The exec tool is immune. Use exec directly for ALL file writes.

## RULE 3 — Part file pattern for large files (over 400 lines)
Split into p1-p9 part files. Only the FINAL part gets closing body/html tags.
Assembly: cat p1.html p2.html ... p9.html > final.html
After assembly always check: grep -n </body> final.html && wc -l final.html && tail -3 final.html
Fix premature closing tags with awk: awk NR==400||NR==401{next}1 file.html > tmp && mv tmp file.html

## RULE 4 — Always verify after every write
wc -l /workspace/path/file.html && tail -5 /workspace/path/file.html

## RULE 5 — Never use perl -i for multi-line replacement
Can wipe entire files if regex fails. Use awk temp file pattern instead.

## RULE 6 — Brace expansion in rm does NOT work in /bin/sh
Use explicit filenames: rm p1.html p2.html p3.html
Or a loop: for i in 1 2 3 4 5; do rm -f p${i}.html; done

## Workspace paths
Guides: /workspace/restaurant-pdfs/v7/
Products: /workspace/products/
Covers: /workspace/shopify-covers/
Marketing: /workspace/marketing/
