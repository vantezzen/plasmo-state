# plasmo-state

This package allows you to have a synced state across your content scripts, background workers and popup page - optionally persisting specific values across tabs.

Many extensions require specific state info to be available across environments but partitioned by tab - e.g. the current credentials for a password manager or if features are enabled on the current tab.
This package aims to provide a mostly unopinionated interface for storing that state while abstracting away browser-level details like state sync.

## Usage

## License

[MIT](./LICENSE)
