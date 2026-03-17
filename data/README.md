# data/

Runtime data directory — gitignored except for this README and structure.
Created automatically on first launch if it does not exist.

## Contents
| Directory     | Contents                                              |
|---------------|-------------------------------------------------------|
| `campaigns/`  | Campaign `.db` files (one per campaign)               |
| `assets/`     | User-imported binary assets (images, audio, PDFs)     |
| `config/`     | User configuration (`user.json`)                      |
| `logs/`       | Rotating application log files                        |
| `plugins/`    | Installed plugins (each in its own subdirectory)      |

## Rules
- The `data/` directory is created at runtime, never committed
- Each campaign is a single self-contained `.db` file
- Assets are content-addressed: filename is the SHA-256 of the content
