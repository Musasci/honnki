# 公開手順（失敗しない版）

## 1. GitHubへアップロード
- GitHubのリポジトリ → **Add file → Upload files**
- ZIPを展開したフォルダを開き、**中のファイルを全部選択してドラッグ**（フォルダは不要）
- 下の **Commit changes** を押す

## 2. GitHub PagesをON
- Settings → Pages
- Source: Deploy from a branch
- Branch: `main` / `(root)`
- Save

## 3. 反映確認
- 1〜数分後に `Visit site`
- まだ古い場合：ブラウザの更新（Ctrl+F5）

## 4. デザインが出ない/404になる場合
- リポジトリ直下に **site.css** と **app.js** があるか確認
- `Settings → Pages` の Branch が `main` / `(root)` になっているか確認


## 検索に出す（最短）
- トップページは `meta robots = index,follow` に設定済みです。
- `sitemap.xml` を同梱しています。Googleで早く見つけてもらうには Google Search Console でサイトを登録し、サイトマップを送信してください。
