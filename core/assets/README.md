# core/assets

Binary asset manager.

## Responsibilities

- Import and store binary files
- Deduplicate content by hash
- Resolve virtual asset paths
- Persist metadata in the `core_assets` and `core_asset_links` tables
- Serve asset URLs to the renderer through the desktop protocol bridge

## Asset Categories

`maps`, `portraits`, `audio`, `documents`, `misc`
