# 最长不相交重复片段查找器

纯浏览器运行的单页应用（TypeScript + React + Vite）。输入一个 JSON 整数数组，
找出走位事件序列中**内容相同且区间不相交**的最长连续片段，并把两段并排展示、
高亮片段与起点，支持两栏滚动联动以逐项核对。

## 判据（算法规格）

给定整数序列 `a[0..n-1]`：

1. 找到一对下标 `i < j` 和长度 `L`，满足
   - 两段内容逐项相同：`a[i+k] = a[j+k]`（`0 <= k < L`）；
   - 区间为**零基闭区间** `[i, i+L-1]` 与 `[j, j+L-1]`，且**不相交**：`i+L-1 < j`；
   - `L` 在所有合法对中取最大值。
2. 长度并列时，在所有合法起点对 `(i,j)` 中取**字典序最小**者（先比 `i`，再比 `j`）。
   这也排除了“同一段重叠重复被误报成两次执行”：只有真正不相交的两段才算。
3. 不存在任何重复时，结果为长度 `0` 且**不给出任何区间**。

### 算法

- 倍增法（Manber–Myers）+ 计数排序构造**后缀数组**，`O(n log n)`；
- Kasai 算法计算相邻后缀 LCP，`O(n)`；
- 对长度二分：按“相邻 LCP ≥ L”把后缀数组分组，组内最远起点相差 ≥ L 即存在
  不相交解，判定 `O(n)`，总体 `O(n log n)`；
- 最大长度确定后线性扫描分组，按字典序选出最小 `(i,j)`。

**精确性保证**：相等性最终一律通过后缀数组/秩的精确整数比较与逐项比较确认，
**不使用任何有碰撞可能的哈希**作为相等证明；既**不枚举全部片段**，也
**不枚举起点对**。空间复杂度 `O(n)`，20 万元素下结果唯一、可逐项核对。

## 输入规则与稳定错误码

- 顶层必须是 JSON 数组；元素必须是 32 位有符号整数：`-2147483648` 至 `2147483647`。
- 长度必须为 2 至 200000。
- 任何违规都**整次拒绝**（不给部分结果），显示稳定错误码，且**文本框内容原样保留**。

| 错误码 | 触发条件 |
| --- | --- |
| `E_EMPTY_INPUT` | 输入为空白 |
| `E_INVALID_JSON` | JSON 语法损坏（如 `[1, 2,`、`NaN`） |
| `E_NOT_ARRAY` | 顶层不是数组（数字、对象、字符串、`null`、布尔） |
| `E_LENGTH_OUT_OF_RANGE` | 长度不在 2–200000 |
| `E_ELEMENT_NOT_INTEGER` | 元素是小数、字符串、`null`、布尔、对象或嵌套数组 |
| `E_ELEMENT_OUT_OF_RANGE` | 元素超出 32 位有符号整数范围 |

## 本地开发

```bash
npm ci
npm run dev        # 开发服务器 http://localhost:5173
```

## 测试

```bash
npm run test       # Vitest：算法判据（含朴素实现对拍、随机模糊、20 万性能）与校验
npm run e2e:install# 首次运行安装 Playwright Chromium
npm run e2e        # Playwright：输入、报错、结果联动（自动 build + preview）
npm run verify     # 依次执行：单元测试 → 构建 → e2e
```

Vitest 中的算法测试用朴素枚举参考实现对拍（仅测试代码枚举，生产实现不枚举），
并对 20 万元素的全相同序列（重叠最密集）验证唯一答案 `L=100000, (i,j)=(0,100000)`。

## Docker

宿主端口可用环境变量 `WEB_PORT` 覆盖（默认 `8080`）：

```bash
docker compose up --build            # http://localhost:8080
WEB_PORT=3000 docker compose up      # http://localhost:3000
```

一次性验收服务 `verify`：在容器内构建并运行全部 Vitest 与 Playwright 用例，
通过后退出（退出码 0），失败则退出码非 0：

```bash
docker compose --profile verify build verify
docker compose --profile verify run --rm verify
```

## 目录结构

```
src/
  suffixArray.ts          # 后缀数组（倍增 + 基数排序，O(n log n)，无哈希）
  lcp.ts                  # Kasai LCP，O(n)
  findLongestRepeat.ts    # 长度二分 + 不相交判定 + 字典序选点
  validation.ts           # JSON 解析与整次校验，稳定错误码
  App.tsx                 # 输入、报错与结果联动
  SegmentView.tsx         # 虚拟滚动并排视图（高亮片段/起点，滚动联动）
  *.test.ts               # Vitest 算法判据与校验测试
e2e/app.spec.ts           # Playwright 端到端测试
```
