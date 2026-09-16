import { test, expect } from '@playwright/test';

async function submit(page: import('@playwright/test').Page, text: string) {
  const input = page.getByTestId('json-input');
  await input.fill(text);
  await page.getByTestId('run-button').click();
}

test.describe('正常输入与结果联动', () => {
  test('基本重复：显示长度、起点对与两个闭区间', async ({ page }) => {
    await page.goto('/');
    await submit(page, '[1, 2, 3, 1, 2, 3, 9, 1, 2]');

    await expect(page.getByTestId('result-length')).toHaveText('3');
    await expect(page.getByTestId('result-start-pair')).toHaveText('(0, 3)');
    await expect(page.getByTestId('result-interval-a')).toHaveText('A [0, 2]');
    await expect(page.getByTestId('result-interval-b')).toHaveText('B [3, 5]');
    await expect(page.getByTestId('array-length')).toHaveText('9');

    await expect(page.getByTestId('segment-a-range')).toContainText('[0, 2]');
    await expect(page.getByTestId('segment-b-range')).toContainText('[3, 5]');
  });

  test('并列时取字典序最小起点对', async ({ page }) => {
    await page.goto('/');
    await submit(page, '[3, 3, 7, 3, 3, 8, 4, 4, 5, 4, 4]');
    await expect(page.getByTestId('result-length')).toHaveText('2');
    await expect(page.getByTestId('result-start-pair')).toHaveText('(0, 3)');
  });

  test('无重复：长度 0 且不渲染任何区间面板', async ({ page }) => {
    await page.goto('/');
    await submit(page, '[1, 2, 3, 4, 5]');
    await expect(page.getByTestId('result-length')).toHaveText('0');
    await expect(page.getByTestId('no-repeat')).toBeVisible();
    await expect(page.getByTestId('segment-a')).toHaveCount(0);
    await expect(page.getByTestId('segment-b')).toHaveCount(0);
  });

  test('两段起点行都被标记且初始滚动对齐到起点', async ({ page }) => {
    await page.goto('/');
    await submit(page, '[9, 8, 7, 1, 2, 1, 2, 0]');
    await expect(page.getByTestId('result-start-pair')).toHaveText('(3, 5)');

    const viewportA = page.getByTestId('segment-a-viewport');
    const viewportB = page.getByTestId('segment-b-viewport');
    await expect(viewportA.locator('.row.is-start')).toBeVisible();
    await expect(viewportB.locator('.row.is-start')).toBeVisible();
    await expect(viewportA.locator('.row.in-segment')).toHaveCount(2);
    await expect(viewportB.locator('.row.in-segment')).toHaveCount(2);

    // 起点行显示对应的全局下标与值
    await expect(viewportA.locator('.row.is-start .row-index')).toHaveText('3');
    await expect(viewportB.locator('.row.is-start .row-index')).toHaveText('5');
  });

  test('两栏滚动联动（真实滚轮事件）', async ({ page }) => {
    await page.goto('/');
    await submit(page, Array.from({ length: 500 }, (_, k) => k % 7).join(',').replace(/^/, '[').replace(/$/, ']'));
    const a = page.getByTestId('segment-a-viewport');
    const b = page.getByTestId('segment-b-viewport');

    // 程序化滚动（scrollTo/isTrusted=false）只用于逐项定位，不参与联动；
    // 真实用户的鼠标滚轮（isTrusted=true）才联动。把指针悬停在 A 上滚动。
    // 等待初始对齐安定窗口结束，避免与挂载期滚动混淆。
    await page.waitForTimeout(400);
    const box = await a.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.wheel(0, 1200);
    await expect.poll(async () => a.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    const topA = await a.evaluate((el) => el.scrollTop);
    await expect(b).toHaveJSProperty('scrollTop', topA);
  });
});

test.describe('错误处理：整次拒绝、稳定错误码、保留输入', () => {
  test('JSON 损坏', async ({ page }) => {
    await page.goto('/');
    const bad = '[1, 2,';
    await submit(page, bad);
    await expect(page.getByTestId('error-code')).toHaveText('E_INVALID_JSON');
    await expect(page.getByTestId('error-box')).toBeVisible();
    await expect(page.getByTestId('result-panel')).toHaveCount(0);
    // 输入保留
    await expect(page.getByTestId('json-input')).toHaveValue(bad);
  });

  test('顶层不是数组', async ({ page }) => {
    await page.goto('/');
    await submit(page, '{"a": 1}');
    await expect(page.getByTestId('error-code')).toHaveText('E_NOT_ARRAY');
  });

  test('长度不足', async ({ page }) => {
    await page.goto('/');
    await submit(page, '[1]');
    await expect(page.getByTestId('error-code')).toHaveText('E_LENGTH_OUT_OF_RANGE');
  });

  test('元素非整数并指出首个非法下标', async ({ page }) => {
    await page.goto('/');
    await submit(page, '[1, 2.5, 3]');
    await expect(page.getByTestId('error-code')).toHaveText('E_ELEMENT_NOT_INTEGER');
    await expect(page.getByTestId('error-index')).toContainText('1');
  });

  test('元素越界（32 位有符号整数范围）', async ({ page }) => {
    await page.goto('/');
    await submit(page, '[1, 2147483648]');
    await expect(page.getByTestId('error-code')).toHaveText('E_ELEMENT_OUT_OF_RANGE');
    await submit(page, '[-2147483649, 1]');
    await expect(page.getByTestId('error-code')).toHaveText('E_ELEMENT_OUT_OF_RANGE');
  });

  test('边界值合法', async ({ page }) => {
    await page.goto('/');
    await submit(page, '[-2147483648, 2147483647]');
    await expect(page.getByTestId('result-length')).toHaveText('0');
  });

  test('报错后修改输入，错误与旧结果同时清空', async ({ page }) => {
    await page.goto('/');
    await submit(page, '[1, 2, 1, 2]');
    await expect(page.getByTestId('result-length')).toHaveText('2');
    await page.getByTestId('json-input').fill('[');
    await expect(page.getByTestId('error-box')).toHaveCount(0);
    await expect(page.getByTestId('result-panel')).toHaveCount(0);
  });
});

test.describe('二十万项规模', () => {
  test('全相同序列（重叠最密集）快速给出唯一可核对答案', async ({ page }) => {
    await page.goto('/');
    const payload = '[' + '7,'.repeat(199999) + '7]';
    await submit(page, payload);

    await expect(page.getByTestId('result-length')).toHaveText('100000');
    await expect(page.getByTestId('result-start-pair')).toHaveText('(0, 100000)');
    await expect(page.getByTestId('result-interval-a')).toContainText('[0, 99999]');
    await expect(page.getByTestId('result-interval-b')).toContainText('[100000, 199999]');

    // 两个起点行都可见，DOM 中仅渲染可视窗口内的行（虚拟滚动）
    await expect(page.getByTestId('segment-a').locator('.row.is-start')).toBeVisible();
    await expect(page.getByTestId('segment-b').locator('.row.is-start')).toBeVisible();

    // 逐项核对：程序化滚动（非可信事件，不触发联动）把片段末尾移入窗口，
    // 两侧末尾元素下标正确且值一致。
    for (const [testid, idx] of [
      ['segment-a-viewport', 99999],
      ['segment-b-viewport', 199999],
    ] as const) {
      const vp = page.getByTestId(testid);
      await vp.evaluate((el, target) => el.scrollTo({ top: target * 22 }), idx);
      const row = vp.locator('.row', { hasText: '' }).filter({
        has: page.locator('.row-index', { hasText: String(idx) }),
      });
      await expect(row.locator('.row-value')).toHaveText('7');
    }
  });
});
