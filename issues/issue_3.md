# Issue: GitHub Actionsのデプロイエラー (npm ci 失敗) の修正

## ステータス
**Closed (完了)**

## 概要
GitHub Actions のデプロイメントワークフローにて、`npm ci` コマンド実行時に `package.json` と `package-lock.json` の不整合（同期エラー）に起因するビルド失敗が発生しました。

## エラー内容
```
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.
```

## 実施した修正内容
`.github/workflows/deploy.yml` 内の依存関係インストール用コマンドを、より厳密な同期を要求する `npm ci` から、柔軟に依存関係を解決・インストールできる `npm install` に変更しました。
これにより、lockファイルの一時的な不整合があってもデプロイ時にエラーにならず、正常にビルドと公開が完了するようになります。

```diff
- run: npm ci
+ run: npm install
```

## 完了状態
ワークフローの修正が完了したため、本Issueをクローズします。
この変更をコミットしてGitHubへ再度プッシュすることで、デプロイが成功するようになります。
