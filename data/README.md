# data/

Runtime data directory, gitignored except for this README and structure.
Created automatically on first launch if it does not exist.

## Contents

| Directory | Contents |
|---|---|
| `campaigns/` | Campaign `.db` files |
| `assets/` | Imported binary assets |
| `config/` | User configuration (`user.json`) |
| `logs/` | Application log files |
| `plugins/` | Installed plugins |

## Rules

- The `data/` directory is created at runtime, never committed
- Each campaign is a single self-contained `.db` file
- Assets are content-addressed by their stored file name
