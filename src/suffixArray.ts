/**
 * 后缀数组构造：Manber–Myers 倍增算法 + 双关键字计数排序。
 *
 * 返回 sa，使后缀 values[sa[0]..], values[sa[1]..], ... 按字典序排列。
 *
 * 时间 O(n log n)，空间 O(n)。
 * 全程只做精确的整数秩比较，不使用任何哈希。
 */
export function buildSuffixArray(values: readonly number[]): Int32Array {
  const n = values.length;
  const sa = new Int32Array(n);
  if (n === 0) return sa;

  let rank = new Int32Array(n);
  let newRank = new Int32Array(n);

  // 初始秩：对取值做坐标压缩（保持数值大小序）。
  const sortedValues = Array.from(new Set(values)).sort((a, b) => a - b);
  const rankOfValue = new Map<number, number>();
  sortedValues.forEach((v, idx) => rankOfValue.set(v, idx));
  for (let i = 0; i < n; i++) rank[i] = rankOfValue.get(values[i])!;
  let classes = sortedValues.length - 1; // 当前最大秩

  // 长度 1 的前缀排序：对初始秩做一次计数排序。
  let count = new Int32Array(classes + 1);
  for (let i = 0; i < n; i++) count[rank[i]]++;
  let sum = 0;
  for (let r = 0; r <= classes; r++) {
    const c = count[r];
    count[r] = sum;
    sum += c;
  }
  for (let i = 0; i < n; i++) sa[count[rank[i]]++] = i;

  const buf = new Int32Array(n);

  for (let k = 1; k < n && classes < n - 1; k *= 2) {
    // 第二关键字：rank[i+k]，越界记为 -1（最小）。
    const count2 = new Int32Array(classes + 2);
    const secondKey = (i: number): number => (i + k < n ? rank[i + k] + 1 : 0);
    for (let t = 0; t < n; t++) count2[secondKey(sa[t])]++;
    sum = 0;
    for (let r = 0; r < count2.length; r++) {
      const c = count2[r];
      count2[r] = sum;
      sum += c;
    }
    for (let t = 0; t < n; t++) {
      const idx = sa[t];
      buf[count2[secondKey(idx)]++] = idx;
    }

    // 第一关键字：rank[i]。
    const count1 = new Int32Array(classes + 1);
    for (let t = 0; t < n; t++) count1[rank[buf[t]]]++;
    sum = 0;
    for (let r = 0; r <= classes; r++) {
      const c = count1[r];
      count1[r] = sum;
      sum += c;
    }
    for (let t = 0; t < n; t++) {
      const idx = buf[t];
      sa[count1[rank[idx]]++] = idx;
    }

    // 按 (rank[i], rank[i+k]) 重新计算秩。
    let nextClasses = 0;
    newRank[sa[0]] = 0;
    for (let t = 1; t < n; t++) {
      const prev = sa[t - 1];
      const cur = sa[t];
      const secondPrev = prev + k < n ? rank[prev + k] : -1;
      const secondCur = cur + k < n ? rank[cur + k] : -1;
      if (rank[prev] !== rank[cur] || secondPrev !== secondCur) nextClasses++;
      newRank[cur] = nextClasses;
    }
    [rank, newRank] = [newRank, rank];
    classes = nextClasses;
  }

  return sa;
}
