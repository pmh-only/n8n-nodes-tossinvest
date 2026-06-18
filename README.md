# n8n-nodes-tossinvest

n8n community node package for the Toss Securities Open API.

## Features

- OAuth2 client credentials token exchange handled inside the node.
- Market data: orderbook, prices, trades, price limits, candles.
- Stock info: stocks and active stock warnings.
- Market info: KRW/USD exchange rate, KR/US market calendars.
- Account and asset: accounts and holdings.
- Orders: create, modify, cancel, list, detail, buying power, sellable quantity, commissions.

## Credentials

Create a `Toss Invest API` credential in n8n with:

- `Client ID`
- `Client Secret`
- Optional `Default Account Sequence`, used for account, asset, order, and order info APIs.
- Optional `Base URL`, defaulting to `https://openapi.tossinvest.com`.

You can get `accountSeq` from the `Account > Get Many` operation and reuse it in the credential or node parameter.

## Local Development

```bash
pnpm install
pnpm run lint
pnpm run build
```

Run the node package in a local n8n development instance:

```bash
pnpm run dev
```

The local `.env` file is intentionally ignored. For manual API smoke tests, expected variable names are:

```bash
client_id=...
client_secret=...
```

## Documentation

- Toss Open API LLM entry point: https://developers.tossinvest.com/llms.txt
- API base URL: https://openapi.tossinvest.com
- n8n community node build docs: https://docs.n8n.io/integrations/community-nodes/build-community-nodes/

## Release

This package includes GitHub Actions workflows for CI and npm publishing with provenance. Configure the npm package as a trusted publisher for `.github/workflows/publish.yml`, or add an `NPM_TOKEN` repository secret as a fallback.

Create a release by running:

```bash
pnpm run release
```

Publishing runs when a GitHub Release is published, or manually through the `Publish` workflow.
