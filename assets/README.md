# assets/

Static assets bundled with the application binary.
These are not user-generated assets; those go in `data/assets/`.

## Contents

| Directory | Contents |
|---|---|
| `icons/` | App icon assets |
| `fonts/` | Bundled typefaces |
| `themes/` | Built-in UI themes |

## Rules

- Keep total size minimal; these ship inside the app bundle
- User assets are managed by `core/assets` and stored in `data/assets/`
