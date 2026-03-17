# core/assets

Binary asset manager.

## Responsibilities
- Import and store binary files (images, audio, PDFs)
- Content-addressable store (deduplication by hash)
- Virtual path resolution: `asset://category/filename` → OS path
- Asset metadata in the campaign database
- Serve asset URLs to the renderer

## Asset categories
`maps` · `portraits` · `audio` · `documents` · `misc`
