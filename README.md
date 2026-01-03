# GitHub Pages（フォルダ不要版）

このリポジトリは **フォルダを一切使わない** 構成です（GitHubのWebアップロードが苦手な人向け）。

- 公開ページ：index.html / blog.html / post.html / videos.html / tools.html / contact.html / privacy.html
- データ：posts.json / videos.json / site.json
- ブログ本文：post-<slug>.md（例：post-welcome.md）
- 画像：img-<slug>-01.webp など（Toolsが自動命名）
- 動画ファイル：video-<slug>.mp4 / poster-<slug>.jpg など（Toolsが自動命名）

## 最短で公開（3分）
1) GitHubで新規リポジトリ作成（Public）
2) このZIPを展開し、**中のファイルを全部** GitHubの「Upload files」でアップロードしてCommit
3) Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save

数十秒〜数分で `https://<ユーザー名>.github.io/<リポジトリ名>/` が有効になります。

## 更新方法（おすすめ：Tools → 更新パック）
1) 公開URLの `tools.html` を開く（例：`https://<ユーザー名>.github.io/<リポジトリ名>/tools.html`）
2) 「公開中サイトから読み込み」
3) ブログ・動画・連絡設定を編集して保存
4) 「更新パック（ZIP）を書き出す」
5) ZIPを展開し、出てきたファイルをGitHubの「Upload files」でアップロードしてCommit

※ GitHub側でファイルを削除しない限り、古いファイルは残ります（上書きはOK）。

## 注意
- 動画ファイルはサイズが大きいとGitHubの制限に当たることがあります。重い動画はYouTube運用が安全・軽量です。
- Toolsページは公開されますが、**GitHubリポジトリに書き込める権限がない人はサイトを更新できません**。
