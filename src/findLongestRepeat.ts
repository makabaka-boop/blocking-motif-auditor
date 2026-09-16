import { buildSaAndLcp } from './lcp';

/** 最长不相交相同片段的结果。 */
export type RepeatResult =
  | { length: 0; i: null; j: null }
  | { length: number; i: number; j: number };

/**
 * 判定是否存在两段长度至少为 L、内容相同且区间不相交的片段。
 *
 * 按相邻后缀 LCP >= L 把后缀数组切分成组；同一组内任意两个后缀的公共前缀
 * 都不少于 L。组内最远的两个起点相差 >= L 时即不相交。
 * 一次扫描 O(n)。
 */
function feasibleLength(L: number, sa: Int32Array, lcp: Int32Array): boolean {
  const n = sa.length;
  let minPos = sa[0];
  let maxPos = sa[0];
  for (let r = 1; r < n; r++) {
    if (lcp[r - 1] >= L) {
      const pos = sa[r];
      if (pos < minPos) minPos = pos;
      if (pos > maxPos) maxPos = pos;
      if (maxPos - minPos >= L) return true;
    } else {
      minPos = sa[r];
      maxPos = sa[r];
    }
  }
  return false;
}

/**
 * 在长度已定为 L 的前提下，找起点对 (i,j)（i<j，区间不相交）中字典序最小者。
 * 同一 LCP 组内：i 取组内最小起点，j 取组内满足 j >= i+L 的最小起点。
 */
function bestPair(L: number, sa: Int32Array, lcp: Int32Array): {
  i: number;
  j: number
} {
  const n = sa.length;
  let bestI = Infinity;
  let bestJ = Infinity;

  const considerGroup = (start: number, end: number): void => {
    // [start, end] 为同一组在 sa 中的下标范围。
    let minPos = sa[start];
    for (let r = start + 1; r <= end; r++) {
      if (sa[r] < minPos) minPos = sa[r];
    }
    let q = Infinity;
    for (let r = start; r <= end; r++) {
      const pos = sa[r];
      if (pos >= minPos + L && pos < q) q = pos;
    }
    if (
      q !== Infinity &&
      (minPos < bestI || (minPos === bestI && q < bestJ))
    ) {
      bestI = minPos;
      bestJ = q;
    }
  };

  let groupStart = 0;
  for (let r = 1; r < n; r++) {
    if (lcp[r - 1] < L) {
      considerGroup(groupStart, r - 1);
      groupStart = r;
    }
  }
  considerGroup(groupStart, n - 1);

  return { i: bestI, j: bestJ };
}

/**
 * 找出内容相同且区间不相交的最长连续片段。
 *
 * 区间为零基闭区间 [i, i+length-1] 与 [j, j+length-1]，i<j 且互不重叠。
 * 长度并列时，取所有合法起点对中字典序最小的 (i,j)。
 * 不存在重复时返回 { length: 0 }。
 *
 * 算法：后缀数组 + Kasai LCP（精确比较，无哈希）+ 长度二分 + 线性并列选择。
 * 总时间 O(n log n)，空间 O(n)，既不枚举全部片段也不枚举起点对。
 */
export function findLongestRepeat(values: readonly number[]): RepeatResult {
  const n = values.length;
  if (n < 2) return { length: 0, i: null, j: null };

  const { sa, lcp } = buildSaAndLcp(values);

  // 可行性对 L 单调：先二分上界，快速排除无重复的情况。
  if (!feasibleLength(1, sa, lcp)) return { length: 0, i: null, j: null };

  let lo = 1;
  let hi = Math.floor(n / 2);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (feasibleLength(mid, sa, lcp)) lo = mid;
    else hi = mid - 1;
  }
  const L = lo;

  const { i, j } = bestPair(L, sa, lcp);
  return { length: L, i, j };
}
