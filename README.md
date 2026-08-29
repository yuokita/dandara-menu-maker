# DANDARA Menu Maker

DANDARAの日替わりメニュー画像を作るWebツールです。

## いちばん簡単な公開方法

1. このフォルダをGitHubにアップロードします。
2. Vercelで「Add New Project」からそのGitHubリポジトリを選びます。
3. Framework Presetは「Other」のままで公開します。
4. 公開されたURLを翔平ちゃん、あーちゃんに共有します。

## 日々の使い方

公開URLを開いて、料理名を入力し、下部の「PNG保存」を押します。
入力内容は使っている端末のブラウザに自動保存されます。

## 機能追加するとき

主に編集する場所はこの3つです。

- `index.html`: 画面の入口
- `assets/js/dandara-menu-maker.js`: 入力、保存、PNG作成などの動き
- `assets/css/dandara-menu-maker.css`: 操作画面の見た目

機能追加後にGitHubへ反映すると、Vercelが自動で最新版を公開します。

## WordPressに入れる場合

WordPress用は別ZIPの `dandara-menu-maker-wordpress.zip` を使います。
ただし今後の機能追加のしやすさは、このVercel版の方が上です。
