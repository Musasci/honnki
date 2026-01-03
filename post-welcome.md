# 最初の記事：このサイトの使い方（ブログ内製）

このブログは「サイト内で完結」する前提で作られています。  
記事は **Markdown（.md）** を追加し、一覧用の **posts.json** に追記するだけです。

## 記事を追加する手順（最短）

- `content/posts.json` にメタデータ（slug, title, date...）を追加
- `content/posts/<slug>.md` を新規作成
- GitHub に push すると公開環境に反映

> slug は URL で使う識別子です（例：`my-first-post`）。日本語より英数字が安全です。

## 使えるMarkdown（最低限）

- 見出し：`#` / `##` / `###`
- 箇条書き：`- item`
- 引用：`> quote`
- コード：``` で囲む
- リンク：`[text](https://example.com)`（https のみ）

```text
例：コードブロック
ここにメモやコマンドを書けます
```
