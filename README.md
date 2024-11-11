# ducklytics

DuckDB-WASMの動作を試すために作成したサンプルアプリ。

## Development

Run the dev server:

```sh
npm run dev
```


## Deployment

First, build your app for production:

```sh
npm run build
```

Then, deploy your app to Cloudflare Pages:

```sh
npm run deploy
```

注：現在Cloudflare Pagesの25MB制限により、デプロイできない。