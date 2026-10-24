# 宝可梦观看指南

宝可梦动画的静态单页观看指南：每一集都有我的 1–5 分评分、IMDb 评分、简介（4 分以上不含剧透）和腾讯视频链接。游戏发售、剧场版、特别篇和重要事件也作为条目排在同一条时间线上。

用浏览器直接打开 `index.html` 即可，无需服务器或构建步骤。

## 评分

| 评分 | 含义 |
|---|---|
| 5 | 必看 |
| 4 | 推荐 |
| 3 | 可看可不看 |
| 2 | 可跳过 |
| 1 | 跳过 |

每一季大约三分之一的集数评为 4 分以上。

## 目录结构

```
index.html                 页面（筛选器；“看到这里”书签保存在 localStorage）
data/guide.js              自动生成，请勿手动编辑
editorial/<series>.json    按日本原版集数记录的我的评分和简介，以及额外条目（游戏/电影/事件）
sources/                   从 IMDb、维基百科和腾讯抓取的原始数据
tools/build.js             将 sources 和 editorial 合并生成 data/guide.js
tools/fetch-tencent-episodes.js   列出腾讯某个专辑（cover）的分集 vid
```

修改 `editorial/` 或 `sources/` 后需要重新构建：

```bash
node tools/build.js
```

## 数据来源

- **IMDb 评分**：IMDb 官方非商业数据集（https://datasets.imdbws.com 上的 `title.episode.tsv.gz`、`title.ratings.tsv.gz`）。IMDb 网站本身会拦截脚本请求。剧集 id 为 `tt0168366`；IMDb 第 N 季第 M 集采用日本原版集数顺序。
- **英文标题、播出日期、日文标题**：英文维基百科各季页面（如 "Pokémon: Indigo League"）。
- **中文标题**：中文维基百科“寶可夢 (1997年—2002年動畫)”页面（台湾译名），用 opencc 转为简体。
- **腾讯链接**：`精灵宝可梦 第1季`（cid `tyeqdw6rof7t5ow`，271 集，台湾配音）和 `精灵宝可梦 剧场版合集`（cid `ejr0xfirssdm33y`）。

### 腾讯集数编号

腾讯按自己的顺序编号，跳过了台湾未播出的日本原版集数。关都篇跳过的是 EP038（3D龙）和 EP065（迷唇姐的圣诞节）。我通过比对腾讯封面画面与剧情核实了这一偏移。被跳过的集数记录在每个 editorial 文件的 `tencentMissingJp` 中。加入橘子群岛篇和城都篇时，还需要用同样的方法找出另外三集被跳过的集数（日本原版 276 集，腾讯 271 集）。

腾讯视频有地区限制：在中国大陆以外（或未使用 VPN）时，播放器会显示“您所在区域暂无此内容版权”。
