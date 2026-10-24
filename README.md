# 宝可梦观看指南

宝可梦动画无印篇（1997–2002，EP001–276：关都、橘子群岛、城都）和超世代篇（2002–2006，AG001–192：丰缘、对战开拓区）的静态单页观看指南：每一集都有我的 1–5 分评分、IMDb 评分、简介（4 分以上不含剧透）和腾讯视频链接。游戏发售、剧场版、特别篇和重要事件也作为条目排在同一条时间线上。

用浏览器直接打开 `index.html` 即可，无需服务器或构建步骤。

### 在 iPhone 上使用

网址：https://53rdturtle.github.io/pokemon-watch-guide/ （GitHub Pages 发布 `main` 分支；`git push origin main` 后约一分钟更新；把 `tools/git-hooks/push-main` 复制为 `.git/hooks/post-merge` 和 `.git/hooks/post-commit` 后，每次合并或提交到 `main` 都会自动推送）。用 Safari 打开，然后“分享 → 添加到主屏幕”。这样它会像 App 一样全屏打开，Safari 也不会清除观看进度（只在标签页中打开的网站，7 天未访问时存储可能被清除）。进度只保存在这台设备上；可在“使用说明 · 备份进度”里用“导出进度 / 导入进度”备份或迁移。

## 评分

| 评分 | 含义 |
|---|---|
| 5 | 必看 |
| 4 | 推荐 |
| 3 | 可看可不看 |
| 2 | 可跳过 |
| 1 | 跳过 |

评分是全剧统一的标准：4 分以上表示“即使和最好的季相比也值得看”，而不是“本季前三分之一”。

- 全部集数中大约三分之一评为 4 分以上（约 1230 集中的 400 集左右），其中约 10% 评为 5 分。目前已评的无印和超世代共 468 集，其中 155 集 4 分以上（33%），45 集 5 分（10%）。只看 5 分集也能跟上主线。
- 各季的 4 分以上比例随整体质量浮动，但保持在 15%–50% 之间：弱季也要保留收服、进化、道馆战、同伴离队等主线关键集；强季也不能占满名额。
- 除主线外，以下几类也会加分（按我的口味）：道馆战、角色登场或角色背景故事、少见的多集连续剧情、气氛独特（神秘/惊悚）的集、有历史意义的集，以及轻松搞笑的集。
- 关都篇（第一季）是我的怀旧季，4 分以上比例允许偏高（约 45%），由后面的季稍严一些来平衡全剧的三分之一。
- 季与季之间的好坏不直接比较 IMDb 分数（后期季投票人少、多为忠实粉丝，分数偏高），IMDb 只用于季内排序参考。

### 可爱 / 搞笑标签

与评分无关的心情标签，方便按口味挑集：`cute`（可爱：以可爱宝可梦或温馨互动为主）和 `comedy`（搞笑：整集以搞笑为主，而不只是有几个笑点）。写在 editorial 中每集数组的第 4 项（如 `[2, "简介", 35, ["cute"]]`），额外条目用 `tags` 字段。页面上的“＋可爱搞笑”会在评分筛选之外加上这些集，“只看可爱搞笑”只显示它们。约四分之一的集有标签。

`node tools/build.js` 会打印每一季、每个系列和全部集数的 4 分以上 / 5 分比例，超出 15%–50% 的季会被标出。

## 目录结构

```
index.html                 页面（筛选器；“看到这里”书签保存在 localStorage；可导出/导入）
manifest.webmanifest       添加到主屏幕用的 App 信息
icons/                     由 tools/make-icons.js 生成
data/guide.js              自动生成，请勿手动编辑
editorial/<season>.json    每一季一个文件（无印：关都、橘子群岛、城都之旅、城都联盟冠军、大师之旅；超世代：advanced、advanced-challenge、advanced-battle、battle-frontier），按日本原版集数（无印EP、超世代AG，各自从1数起）记录的 [评分, 简介, 本集明星宝可梦的全国图鉴编号, 可选的可爱/搞笑标签]，以及额外条目（游戏/电影/事件，可选 star 字段）
assets/sprites/<编号>.png  本集明星宝可梦的像素图（火红/叶绿版精灵图，来自 PokeAPI/sprites）
sources/                   从 IMDb、维基百科和腾讯抓取的原始数据（wikipedia-<season>.json 每季一个；zh-titles-、imdb-、tencent-<系列>.json 每个系列一个：original-series、advanced-generation）
tools/build.js             将 sources 和 editorial 合并生成 data/guide.js（系列和季的列表在文件开头的 SERIES）
tools/fetch-tencent-episodes.js   列出腾讯某个专辑（cover）的分集 vid
```

修改 `editorial/` 或 `sources/` 后需要重新构建：

```bash
node tools/build.js
```

## 数据来源

- **IMDb 评分**：IMDb 官方非商业数据集（https://datasets.imdbws.com 上的 `title.episode.tsv.gz`、`title.ratings.tsv.gz`）。IMDb 网站本身会拦截脚本请求。剧集 id 为 `tt0168366`；IMDb 第 N 季第 M 集采用日本原版集数顺序。第 6–9 季是超世代的四季。
- **英文标题、播出日期、日文标题**：英文维基百科各季页面（"Pokémon: Indigo League"、"Adventures in the Orange Islands"、"The Johto Journeys"、"Johto League Champions"、"Master Quest"，以及超世代的 "Pokémon: Advanced"、"Advanced Challenge"、"Advanced Battle"、"Battle Frontier"）。IMDb 第2–5季分别对应无印后四季，同样按日本原版顺序。
- **中文标题**：中文维基百科“寶可夢 (1997年—2002年動畫)”和“寶可夢 超世代”页面（台湾译名），用 opencc 转为简体。
- **本集明星宝可梦像素图**：PokeAPI/sprites 仓库中的《火红/叶绿》精灵图（`sprites/pokemon/versions/generation-iii/firered-leafgreen/<编号>.png`），已下载到 `assets/sprites/`，中文名在 `sources/pokemon-names-zh.json`。新增明星宝可梦时需同时补上图片和名字，否则构建会报错。这套精灵图只有第1–3世代（#1–386），所以第四世代的宝可梦（如小卡比兽、路卡利欧、玛纳霏）不能当明星，改用相关的宝可梦。中文名取自 PokeAPI 的简体中文名。
- **腾讯链接**：`精灵宝可梦 第1季`（cid `tyeqdw6rof7t5ow`，271 集，无印，台湾配音）、`精灵宝可梦 第2季`（cid `9yfjl0rjm0l5tys`，188 集，超世代，台湾配音）和 `精灵宝可梦 剧场版合集`（cid `ejr0xfirssdm33y`）。

### 腾讯集数编号

腾讯每个系列一个专辑，按自己的顺序编号，跳过了台湾未播出的日本原版集数。日本原版 276 集，腾讯 271 集，共跳过 5 集：EP038（3D龙）、EP065（迷唇姐的圣诞节）、EP092、EP101 和 EP252——后四集都因迷唇姐的造型被撤下。我通过比对腾讯封面画面（带台配字幕）与剧情核实了每一处偏移；腾讯第271集正是最终话 EP276。超世代 192 集，腾讯 188 集，跳过 AG013、AG021、AG022 和只在日本播出的总集篇 AG120；我用哔哩哔哩同一版本（同为 188 集）的分集标题逐集对上中文维基的集数，再用腾讯封面画面抽查核实。被跳过的集数记录在各 editorial 文件的 `tencentMissingJp` 中，构建时会按系列分别检查腾讯集数是否刚好用完。

腾讯视频有地区限制：在中国大陆以外（或未使用 VPN）时，播放器会显示“您所在区域暂无此内容版权”。
