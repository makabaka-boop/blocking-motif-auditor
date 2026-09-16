import { useCallback, useEffect, useRef, useState } from 'react';
import { findLongestRepeat, RepeatResult } from './findLongestRepeat';
import { parseAndValidate, ValidationError } from './validation';
import { SegmentView, ROW_HEIGHT } from './SegmentView';

interface AcceptedState {
  values: number[];
  result: RepeatResult;
  elapsedMs: number;
}

const SAMPLE = '[1, 2, 3, 1, 2, 3, 9, 1, 2]';

export function App() {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<ValidationError | null>(null);
  const [accepted, setAccepted] = useState<AcceptedState | null>(null);
  const [linked, setLinked] = useState(true);

  const paneARef = useRef<HTMLDivElement | null>(null);
  const paneBRef = useRef<HTMLDivElement | null>(null);
  const linkedRef = useRef(linked);
  linkedRef.current = linked;
  // 初始对齐安定窗口：新结果渲染后的短时间内，浏览器可能延迟派发初始对齐
  // 引发的可信 scroll 事件（如兄弟容器布局滚动冒泡）。这段时间用户不可能
  // 手动滚动，因此统一忽略联动，防止片段 B 的起点把片段 A 带走。
  const settledRef = useRef(false);
  const [resultKey, setResultKey] = useState(0);

  // 仅由 isTrusted=true 的真实用户滚动触发；程序化同步对方不回联。
  const syncFromA = useCallback(() => {
    if (!settledRef.current) return;
    if (!linkedRef.current || !paneARef.current || !paneBRef.current) return;
    paneBRef.current.scrollTop = paneARef.current.scrollTop;
  }, []);

  const syncFromB = useCallback(() => {
    if (!settledRef.current) return;
    if (!linkedRef.current || !paneARef.current || !paneBRef.current) return;
    paneARef.current.scrollTop = paneBRef.current.scrollTop;
  }, []);

  const run = () => {
    const parsed = parseAndValidate(raw);
    if (!parsed.ok) {
      // 整次拒绝：保留输入文本，清空旧结果，仅报告稳定错误码。
      setError(parsed.error);
      setAccepted(null);
      return;
    }
    const t0 = performance.now();
    const result = findLongestRepeat(parsed.data);
    const elapsedMs = performance.now() - t0;
    setError(null);
    settledRef.current = false;
    setResultKey((k) => k + 1);
    setAccepted({ values: parsed.data, result, elapsedMs });
  };

  // 结果渲染后开启一个安定窗口，再允许滚动联动。
  useEffect(() => {
    if (!accepted) return;
    settledRef.current = false;
    const timer = window.setTimeout(() => {
      settledRef.current = true;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [accepted, resultKey]);

  const handleChange = (value: string) => {
    // 编辑后旧结论立即失效，但输入始终保留。
    setRaw(value);
    setError(null);
    setAccepted(null);
  };

  const result = accepted?.result ?? null;
  const hit = result && result.i !== null && result.j !== null ? result : null;

  return (
    <main className="app">
      <h1>最长不相交重复片段查找器</h1>
      <p className="criteria">
        输入一个 JSON 整数数组（长度 2–200000，元素 -2147483648 至 2147483647）。
        找出<strong>内容相同且区间不相交</strong>的最长连续片段，区间为零基闭区间；
        长度并列时取起点对 <code>(i,j)</code> 字典序最小者。无重复时长度为 0 且无区间。
      </p>

      <label className="input-label" htmlFor="json-input">
        JSON 整数数组
      </label>
      <textarea
        id="json-input"
        data-testid="json-input"
        className="json-input"
        rows={4}
        spellCheck={false}
        value={raw}
        placeholder={SAMPLE}
        onChange={(e) => handleChange(e.target.value)}
      />

      <div className="controls">
        <button type="button" data-testid="run-button" className="primary" onClick={run}>
          查找
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => handleChange(SAMPLE)}
        >
          填入示例
        </button>
        {accepted && hit && (
          <label className="link-toggle">
            <input
              type="checkbox"
              checked={linked}
              onChange={(e) => setLinked(e.target.checked)}
            />
            两栏滚动联动
          </label>
        )}
      </div>

      {error && (
        <div className="error-box" data-testid="error-box" role="alert">
          <span className="error-code" data-testid="error-code">
            {error.code}
          </span>
          <span className="error-message">{error.message}</span>
          {error.index >= 0 && (
            <span className="error-index" data-testid="error-index">
              （首个非法元素下标：{error.index}）
            </span>
          )}
        </div>
      )}

      {accepted && result && (
        <section className="result" data-testid="result-panel">
          <div className="result-summary">
            <span>
              数组长度：<strong data-testid="array-length">{accepted.values.length}</strong>
            </span>
            <span>
              最长长度：<strong data-testid="result-length">{result.length}</strong>
            </span>
            {hit ? (
              <>
                <span>
                  起点对：
                  <strong data-testid="result-start-pair">
                    ({hit.i}, {hit.j})
                  </strong>
                </span>
                <span>
                  区间：
                  <strong data-testid="result-interval-a">
                    A [{hit.i}, {hit.i + hit.length - 1}]
                  </strong>
                  {' / '}
                  <strong data-testid="result-interval-b">
                    B [{hit.j}, {hit.j + hit.length - 1}]
                  </strong>
                </span>
                <button
                  type="button"
                  className="secondary small"
                  data-testid="align-starts"
                  onClick={() => {
                    // 两栏起点不同（片段 B 靠后），分别对齐到各自起点，不做联动。
                    if (paneARef.current) paneARef.current.scrollTop = hit.i * ROW_HEIGHT;
                    if (paneBRef.current) paneBRef.current.scrollTop = hit.j * ROW_HEIGHT;
                  }}
                >
                  两栏分别回到起点
                </button>
              </>
            ) : (
              <span className="no-repeat" data-testid="no-repeat">
                无重复，不给出任何区间。
              </span>
            )}
            <span className="elapsed">用时 {accepted.elapsedMs.toFixed(1)} ms</span>
          </div>

          {hit ? (
            <div className="panes">
              <SegmentView
                key={`a-${resultKey}`}
                values={accepted.values}
                start={hit.i}
                length={hit.length}
                ownRef={paneARef}
                onUserScroll={syncFromA}
                title="片段 A"
                testid="segment-a"
              />
              <SegmentView
                key={`b-${resultKey}`}
                values={accepted.values}
                start={hit.j}
                length={hit.length}
                ownRef={paneBRef}
                onUserScroll={syncFromB}
                title="片段 B"
                testid="segment-b"
              />
            </div>
          ) : (
            <div className="empty-detail">不存在内容相同的两段（无重复）</div>
          )}
        </section>
      )}
    </main>
  );
}
