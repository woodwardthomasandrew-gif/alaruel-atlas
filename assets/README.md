# assets/

Static assets bundled with the application binary.
These are NOT user-generated assets (those go in data/assets/).

## Contents
| Directory   | Contents                                          |
|-------------|---------------------------------------------------|
| `icons/`    | App icon in multiple sizes (16, 32, 64, 256, 512) |
| `fonts/`    | Bundled typefaces                                 |
| `themes/`   | Built-in UI themes (default-dark, default-light)  |

## Rules
- Keep total size minimal — these ship inside the app bundle
- User assets are managed by core/assets and stored in data/assets/
