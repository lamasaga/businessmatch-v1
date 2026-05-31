# 素材出处与许可

> **纪律**：仅使用允许商用的许可；前端展示建议在「关于」页保留本文件链接。

---

## 1. 已打包进目录的精选文件

| 来源 | 许可 | 路径 | 说明 |
|------|------|------|------|
| **game-icons.net** | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | `items/` `events/` 部分 `icons/` `vehicles/` `characters/` | 须在作品处 **署名 game-icons.net**；原始包 `sources/game-icons-net.zip` |
| **Tabler Icons** | [MIT](https://github.com/tabler/tabler-icons/blob/master/LICENSE) | `maps/cities/` 部分 `items/` `ui/` `animations/` | 署名可选；原始包 `sources/tabler-icons.zip` |
| **Openclipart** | [CC0](https://openclipart.org/) | `sources/openclipart-commerce-sample.svg` | 示例商务 SVG，未默认引用 |
| **仓库自绘** | CC0（项目内） | `maps/yangtze_6-schematic.svg` | 六城示意底图，非精确地理 |

---

## 2. 重新下载原始包（可选）

```powershell
# 在 art-assets/fushengji/sources/ 下执行
Invoke-WebRequest -Uri "https://github.com/game-icons/icons/archive/refs/heads/master.zip" -OutFile game-icons-net.zip
Invoke-WebRequest -Uri "https://github.com/tabler/tabler-icons/archive/refs/tags/v3.19.0.zip" -OutFile tabler-icons.zip
```

　　解压后路径：`sources/_extract_game-icons/icons-master/`、`sources/_extract_tabler/tabler-icons-*/icons/outline/`。

---

## 3. 建议署名文案（满足 CC BY 3.0）

　　游戏内「关于 / 素材」页可写：

> 部分图标来自 [game-icons.net](https://game-icons.net/)（CC BY 3.0）；UI 图标来自 [Tabler Icons](https://tabler.io/icons)（MIT）。

---

## 4. 未纳入（需自行下载）

| 素材 | 原因 | 建议 |
|------|------|------|
| Kenney 全套 | 官网需跳转下载，无稳定直链 | [kenney.nl](https://kenney.nl/assets) CC0 包，下完后放入 `sources/` |
| 位图角色立绘 | 体积大、风格需统一 | 后期统一像素风后再买/约稿 |
| 真实卫星地图 | 许可与精度不适用教学示意 | 使用 `maps/yangtze_6-schematic.svg` |
