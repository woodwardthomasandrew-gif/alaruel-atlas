# core/config

Typed configuration manager.

## Config Layers

1. Built-in defaults
2. User config (`data/config/user.json`)
3. Campaign config (stored in campaign DB)

## Rules

- All config access is typed; no raw `JSON.parse`
- Modules register their config schema on boot
- Config changes emit no events; consumers re-read on next access

## Current App Config

- `theme`
- `locale`
- `recentCampaigns`
- `logLevel`
