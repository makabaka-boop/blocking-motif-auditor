import { describe, expect, it } from 'vitest';
import { findLongestRepeat, RepeatResult } from './findLongestRepeat';
import { buildSuffixArray } from './suffixArray';
import { buildLcp } from './lcp';

/**
 * 朴素参考实现（仅用于测试对拍）：枚举所有起点对求最长不相交公共前缀。
 * 生产算法不得枚举；测试中 n 很小。
 */
function bruteForce(a: number[]): RepeatResult {
  const n = a.length;
  let bestLen = 0;
  let bestI = -1;
  let bestJ = -1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // 不相交要求 L <= j-i 且不越界 L <= n-j
      const maxL = Math.min(j - i, n - j);
      let L = 0;
      while (L < maxL && a[i + L] === a[j + L]) L++;
      // i、j 均按升序枚举，仅在严格更长时更新 => 并列时自然保留字典序最小对
      if (L > bestLen) {
        bestLen = L;
        bestI = i;
        bestJ = j;
      }
    }
  }
  return bestLen === 0
    ? { length: 0, i: null, j: null }
    : { length: bestLen, i: bestI, j: bestJ };
}

/** 校验结果的全部硬性判据，并核对两段内容逐项相同。 */
function assertResultConsistent(input: number[], result: RepeatResult): void {
  const n = input.length;
  if (result.length === 0) {
    expect(result.i).toBeNull();
    expect(result.j).toBeNull();
    // 与朴素实现一致：无任何重复相邻值即无长度 >= 1 的不相交重复
    const anyDup = new Set(input).size < input.length;
    expect(anyDup).toBe(false);
    return;
  }
  const { length: L, i, j } = result;
  expect(i).not.toBeNull();
  expect(j).not.toBeNull();
  expect(i!).toBeLessThan(j!);
  // 零基闭区间不相交
  expect(i! + L - 1).toBeLessThan(j!);
  expect(j! + L - 1).toBeLessThan(n);
  // 内容逐项精确相同（最终相等证明，非哈希）
  for (let k = 0; k < L; k++) {
    expect(input[i! + k]).toBe(input[j! + k]);
  }
  // 不可存在更长的不相交重复
  const brute = bruteForce(input);
  expect(brute.length).toBe(L);
}

describe('buildSuffixArray', () => {
  it('对小规模数组产生正确的后缀字典序', () => {
    const a = [2, 1, 2, 1, 2];
    const sa = Array.from(buildSuffixArray(a));
    const suffix = (p: number) => a.slice(p).join(',');
    const sorted = [...sa].sort((x, y) => (suffix(x) < suffix(y) ? -1 : 1));
    expect(sa).toEqual(sorted);
  });

  it('单元素与全相同元素', () => {
    expect(Array.from(buildSuffixArray([7]))).toEqual([0]);
    const sa = Array.from(buildSuffixArray([5, 5, 5, 5]));
    // 全相同后缀：短前缀按字典序更小，故按起点降序
    expect(sa).toEqual([3, 2, 1, 0]);
  });

  it('LCP 与定义一致', () => {
    const a = [1, 2, 3, 1, 2, 3, 9];
    const sa = buildSuffixArray(a);
    const lcp = buildLcp(a, sa);
    for (let r = 0; r < lcp.length; r++) {
      const p = sa[r];
      const q = sa[r + 1];
      let L = 0;
      while (p + L < a.length && q + L < a.length && a[p + L] === a[q + L]) L++;
      expect(lcp[r]).toBe(L);
    }
  });
});

describe('findLongestRepeat — 精心构造用例', () => {
  it('基本重复 [1,2,3]', () => {
    expect(findLongestRepeat([1, 2, 3, 1, 2, 3, 9, 1, 2])).toEqual({
      length: 3,
      i: 0,
      j: 3,
    });
  });

  it('无重复返回长度 0 且无区间', () => {
    expect(findLongestRepeat([1, 2, 3, 4, 5])).toEqual({
      length: 0,
      i: null,
      j: null,
    });
  });

  it('仅两个相同元素', () => {
    expect(findLongestRepeat([42, 42])).toEqual({ length: 1, i: 0, j: 1 });
  });

  it('两个不同元素无重复', () => {
    expect(findLongestRepeat([1, 2])).toEqual({ length: 0, i: null, j: null });
  });

  it('重叠的长重复不能采用，取不相交的较短长度', () => {
    // aaaaabaaaa：suffix0 与 suffix6 的公共前缀为 4 但起点差 6 可容纳；
    // 构造真正重叠陷阱：[1,1,1,1,2]，suffix0 与 suffix1 LCP=3（重叠），
    // 最长不相交长度为 2：(0,2) -> [1,1],[1,1]
    const r = findLongestRepeat([1, 1, 1, 1, 2]);
    expect(r).toEqual({ length: 2, i: 0, j: 2 });
  });

  it('长度并列时取字典序最小起点对', () => {
    // 两组长度 2 的重复：(0,3) 的 [3,3] 与 (6,9) 的 [4,4]
    // 注意 (0,2) 只有长度 1，避免产生更长重复
    const a = [3, 3, 7, 3, 3, 8, 4, 4, 5, 4, 4];
    expect(findLongestRepeat(a)).toEqual({ length: 2, i: 0, j: 3 });
  });

  it('并列时第一起点相同则比较第二起点', () => {
    // [9,9,9,9,9,1,9,9]：长度 2 的不相交对 i=0 时 j 最小为 2
    const r = findLongestRepeat([9, 9, 9, 9, 9, 1, 9, 9]);
    expect(r).toEqual({ length: 2, i: 0, j: 2 });
  });

  it('全部相同元素取可容纳的最长不相交长度（n 偶 / n 奇）', () => {
    expect(findLongestRepeat([0, 0, 0, 0])).toEqual({ length: 2, i: 0, j: 2 });
    expect(findLongestRepeat([0, 0, 0, 0, 0])).toEqual({ length: 2, i: 0, j: 2 });
  });

  it('边界整数取值被当作普通数值处理', () => {
    const min = -2147483648;
    const max = 2147483647;
    expect(findLongestRepeat([min, max, min, max])).toEqual({
      length: 2,
      i: 0,
      j: 2,
    });
  });

  it('单元素长度输入（理论边界，UI 虽不允许）', () => {
    expect(findLongestRepeat([1])).toEqual({ length: 0, i: null, j: null });
  });
});

describe('findLongestRepeat — 随机对拍', () => {
  // 可复现的简单 LCG
  function makeRng(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  const cases: { name: string; gen: (rng: () => number) => number[] }[] = [
    { name: '小字母表（重复密集）', gen: (r) => Array.from({ length: 30 }, () => Math.floor(r() * 3)) },
    { name: '中等字母表', gen: (r) => Array.from({ length: 60 }, () => Math.floor(r() * 8)) },
    { name: '大字母表（重复稀疏）', gen: (r) => Array.from({ length: 80 }, () => Math.floor(r() * 200)) },
    { name: '偶发长重复', gen: (r) => {
      const base = Array.from({ length: 40 }, () => Math.floor(r() * 6));
      const insertAt = Math.floor(r() * 30);
      const copy = base.slice(insertAt, insertAt + 8);
      return [...base.slice(0, 50), ...copy, ...base.slice(50)].slice(0, 70);
    } },
  ];

  for (const { name, gen } of cases) {
    it(`${name}（200 个随机序列与朴素实现一致）`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const rng = makeRng(seed * 2654435761);
        const input = gen(rng);
        const expected = bruteForce(input);
        const actual = findLongestRepeat(input);
        expect(actual).toEqual(expected);
        assertResultConsistent(input, actual);
      }
    });
  }
});

describe('findLongestRepeat — 二十万项规模', () => {
  it('全相同序列（重叠最密集）在线性内存与限时内得到唯一答案', () => {
    const n = 200_000;
    const input = new Array(n).fill(123456);
    const t0 = performance.now();
    const r = findLongestRepeat(input);
    const elapsed = performance.now() - t0;
    expect(r).toEqual({ length: 100_000, i: 0, j: 100_000 });
    // 宽松上限，防止实现退化为 O(n^2)
    expect(elapsed).toBeLessThan(10_000);
  });

  it('周期 2 的二十万项序列', () => {
    const n = 200_000;
    const input = Array.from({ length: n }, (_, k) => (k % 2 === 0 ? 7 : 9));
    const t0 = performance.now();
    const r = findLongestRepeat(input);
    const elapsed = performance.now() - t0;
    expect(r).toEqual({ length: 100_000, i: 0, j: 100_000 });
    expect(elapsed).toBeLessThan(10_000);
  });

  it('二十万个互异元素返回 0', () => {
    const n = 200_000;
    const input = Array.from({ length: n }, (_, k) => k - 100_000);
    const r = findLongestRepeat(input);
    expect(r).toEqual({ length: 0, i: null, j: null });
  });
});
