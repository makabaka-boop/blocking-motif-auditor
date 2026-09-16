import { buildSuffixArray } from './suffixArray';

/**
 * Kasai 算法计算相邻后缀的最长公共前缀。
 *
 * 返回数组 lcp（长度 n-1）：
 *   lcp[k] = LCP(sa[k], sa[k+1])，即字典序相邻的两个后缀的公共前缀长度。
 *
 * 时间 O(n)，线性逐项比较，结论精确。
 */
export function buildLcp(values: readonly number[], sa: Int32Array): Int32Array {
  const n = values.length;
  const lcp = new Int32Array(Math.max(0, n - 1));
  if (n <= 1) return lcp;

  // rank[pos]：后缀 pos 在后缀数组中的位置。
  const rank = new Int32Array(n);
  for (let r = 0; r < n; r++) rank[sa[r]] = r;

  let h = 0;
  for (let pos = 0; pos < n; pos++) {
    const r = rank[pos];
    if (r === n - 1) {
      // 字典序最后的后缀没有后继。
      h = 0;
      continue;
    }
    const next = sa[r + 1];
    while (pos + h < n && next + h < n && values[pos + h] === values[next + h]) {
      h++;
    }
    lcp[r] = h;
    if (h > 0) h--;
  }

  return lcp;
}

/** 同时构造后缀数组与相邻 LCP。 */
export function buildSaAndLcp(values: readonly number[]): {
  sa: Int32Array;
  lcp: Int32Array;
} {
  const sa = buildSuffixArray(values);
  const lcp = buildLcp(values, sa);
  return { sa, lcp };
}
