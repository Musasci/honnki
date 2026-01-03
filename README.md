# GitHub Pages（フォルダ不要版）

このリポジトリは **フォルダを一切使わない** 構成です（GitHubのWebアップロードでフォルダが空になる問題を回避）。

- 公開ページ：index.html / blog.html / videos.html / tools.html / contact.html / privacy.html
- データ：posts.json / videos.json / site.json
- ブログ本文：post-<slug>.md（例：post-welcome.md）

## 最短で公開（3分）
1) GitHubで新規リポジトリ作成（Public）
2) このZIPを展開し、**中のファイルを全部** GitHubの「Upload files」でアップロードしてCommit
3) Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save

数十秒〜数分で `https://<ユーザー名>.github.io/<リポジトリ名>/` が有効になります。
