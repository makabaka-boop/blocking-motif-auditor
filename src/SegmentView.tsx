import { useLayoutEffect, useState, type MutableRefObject } from 'react';

export const ROW_HEIGHT = 22;
const OVERSCAN = 12;
const DEFAULT_VIEWPORT = 480;

type ScrollRef = MutableRefObject<HTMLDivElement | null>;

interface SegmentViewProps {
  /** 全部输入元素。 */
  values: readonly number[];
  /** 本片段起点（零基闭区间起点）。 */
  start: number;
  /** 片段长度。 */
  length: number;
  /** 本视图滚动容器引用。 */
  ownRef: ScrollRef;
  /** 真实用户滚动本栏后的回调（父组件据此同步另一栏）。 */
  onUserScroll: () => void;
  /** 面板标题（片段 A / 片段 B）。 */
  title: string;
  testid: string;
}

export function SegmentView({
  values,
  start,
  length,
  ownRef,
  onUserScroll,
  title,
  testid,
}: SegmentViewProps) {
  const [scrollTop, setScrollTop] = useState(() => start * ROW_HEIGHT);
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_VIEWPORT);
  const n = values.length;
  const totalHeight = n * ROW_HEIGHT;

  useLayoutEffect(() => {
    const el = ownRef.current;
    if (!el) return;
    // 每栏独立对齐到各自起点（程序化、非可信事件）。
    el.scrollTop = start * ROW_HEIGHT;
    setScrollTop(el.scrollTop);
    setViewportHeight(el.clientHeight || DEFAULT_VIEWPORT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const el = ownRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    if (!e.isTrusted) return; // 程序化滚动（初始对齐/对方联动）绝不级联
    onUserScroll();
  };

  const firstVisible = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + 2 * OVERSCAN;
  const lastVisible = Math.min(n - 1, firstVisible + visibleCount);

  const rows = [];
  for (let idx = firstVisible; idx <= lastVisible; idx++) {
    const inSegment = idx >= start && idx < start + length;
    const isStart = idx === start;
    rows.push(
      <div
        key={idx}
        className={[
          'row',
          inSegment ? 'in-segment' : '',
          isStart ? 'is-start' : '',
        ].join(' ').trim()}
        style={{ top: idx * ROW_HEIGHT, height: ROW_HEIGHT }}
      >
        <span className="row-index">{idx}</span>
        <span className="row-value">{values[idx]}</span>
        {isStart && <span className="start-badge">起点</span>}
      </div>,
    );
  }

  return (
    <div className="pane" data-testid={testid}>
      <div className="pane-header">
        <strong>{title}</strong>
        <span className="pane-range" data-testid={`${testid}-range`}>
          闭区间 [{start}, {start + length - 1}] · 起点 {start}
        </span>
      </div>
      <div
        className="viewport"
        ref={ownRef}
        onScroll={handleScroll}
        data-testid={`${testid}-viewport`}
      >
        <div className="spacer" style={{ height: totalHeight }}>
          {rows}
        </div>
      </div>
    </div>
  );
}
