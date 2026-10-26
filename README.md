# jsonl-lens

本地 JSONL 查看器：粘贴或拖入 LLM / agent 日志，按行解析、摘要列表、关键字与字段筛选、展开 pretty JSON。**纯前端、零构建依赖，数据不离开浏览器。**

在线演示：<https://temptation2017.github.io/jsonl-lens/>

## 做什么

开发者经常拿到 `.jsonl`（对话导出、agent/tool trace、结构化日志），用编辑器一行行看很累。jsonl-lens 在浏览器里打开即可：

- 粘贴大段 JSONL，或拖拽 / 选择 `.jsonl` / `.json` / `.ndjson` 文件（`FileReader` 本地读取）
- 按行 `JSON.parse`；坏行标红并显示原因，不中断其余行
- 列表摘要：优先展示 `role` / `type` / `event` / `level` / `message` / `content` 等常见字段
- 点击某行展开完整 pretty-printed JSON
- 关键字筛选（对原始行字符串，大小写不敏感）
- 可选字段过滤，例如 `role=user`、`type=tool_call`（支持简单 `a.b` 路径）
- 统计：总行数、有效 JSON、坏行、当前筛选命中数
- 「复制当前筛选为 JSONL」「下载 .jsonl」
- 「加载示例」：虚构的 agent 对话样例（含一条故意坏行）
- 深色 / 浅色跟随 `prefers-color-scheme`；中文 UI

## 打开方式

### GitHub Pages

打开：<https://temptation2017.github.io/jsonl-lens/>

### 本地

任意静态服务器或直接打开均可（无模块、无构建）：

```bash
# 任选其一
python3 -m http.server 8080 --directory .
# 然后访问 http://127.0.0.1:8080/
```

也可用浏览器直接打开 `index.html`（部分浏览器对 `file://` 下剪贴板权限更严，复制按钮可能降级为手动提示）。

## 用法

1. 粘贴 JSONL，或拖入 / 选择文件，点 **解析**（选文件与拖入会自动解析）
2. 在列表中浏览摘要；点击行展开完整 JSON
3. 用关键字或 `key=value` 字段过滤缩小范围
4. 需要时 **复制当前筛选为 JSONL** 或 **下载 .jsonl**

样例文件见 [`examples/sample.jsonl`](examples/sample.jsonl)。

## 示例行

```jsonl
{"role":"user","content":"List files in the current directory."}
{"type":"tool_call","name":"list_dir","arguments":{"path":"."}}
{"type":"tool_result","name":"list_dir","ok":true,"output":"README.md"}
{"role":"assistant","content":"Looks like a small project."}
```

## 限制

- 纯前端：超大文件（几十 MB 级）会占内存、列表 DOM 变慢；适合日常 trace / 导出体量
- 字段过滤是精确字符串匹配（`String(值) === 过滤值`），不是完整 JSONPath / 正则
- 空行会被跳过；同一文件内坏行只影响自身
- **不会**上传、存储或外发你的数据；无后端、无分析脚本

## 可改进点

- 虚拟滚动 / 分块解析，更好支持超大 JSONL
- 按列（字段）表格视图、JSON Path 查询
- 导出为 CSV / Markdown
- 可选本地持久化（IndexedDB）最近文件摘要（仍不上传）

## 隐私

本仓库不含密钥、token、真实联系方式或公司内部信息。内置示例全部虚构。

## License

[MIT](LICENSE) © 2026 temptation2017
