import { describe, expect, it } from 'vitest';
import {
  parseAndValidate,
  ErrorCodes,
  MIN_VALUE,
  MAX_VALUE,
  MAX_LENGTH,
  MIN_LENGTH,
} from './validation';

function ok(raw: string): number[] {
  const r = parseAndValidate(raw);
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}`);
  return r.data;
}

function fail(raw: string): string {
  const r = parseAndValidate(raw);
  if (r.ok) throw new Error('expected failure');
  return r.error.code;
}

describe('parseAndValidate — 合法输入', () => {
  it('接受普通整数数组', () => {
    expect(ok('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('接受 32 位边界值', () => {
    expect(ok(`[${MIN_VALUE}, 0, ${MAX_VALUE}]`)).toEqual([MIN_VALUE, 0, MAX_VALUE]);
  });

  it('接受空白填充与换行', () => {
    expect(ok('  [ -1 , 2 ] \n')).toEqual([-1, 2]);
  });

  it('接受长度恰好为 2 与 200000', () => {
    expect(ok('[1,1]')).toHaveLength(2);
    expect(ok(`[${'0,'.repeat(MAX_LENGTH - 1)}0]`)).toHaveLength(MAX_LENGTH);
  });

  it('接受科学计数法表示的整数值', () => {
    expect(ok('[1e3, 2E2]')).toEqual([1000, 200]);
  });
});

describe('parseAndValidate — 稳定错误码，整次拒绝', () => {
  it('空白输入', () => {
    expect(fail('   ')).toBe(ErrorCodes.EMPTY_INPUT);
  });

  it('JSON 损坏', () => {
    expect(fail('[1, 2,')).toBe(ErrorCodes.INVALID_JSON);
    expect(fail('{')).toBe(ErrorCodes.INVALID_JSON);
    expect(fail('[1,,2]')).toBe(ErrorCodes.INVALID_JSON);
    expect(fail('nope')).toBe(ErrorCodes.INVALID_JSON);
  });

  it('顶层不是数组', () => {
    expect(fail('42')).toBe(ErrorCodes.NOT_ARRAY);
    expect(fail('{"a":1}')).toBe(ErrorCodes.NOT_ARRAY);
    expect(fail('"hi"')).toBe(ErrorCodes.NOT_ARRAY);
    expect(fail('null')).toBe(ErrorCodes.NOT_ARRAY);
    expect(fail('true')).toBe(ErrorCodes.NOT_ARRAY);
  });

  it('规模不符', () => {
    expect(fail('[]')).toBe(ErrorCodes.LENGTH_OUT_OF_RANGE);
    expect(fail('[1]')).toBe(ErrorCodes.LENGTH_OUT_OF_RANGE);
    expect(fail(`[${'0,'.repeat(MAX_LENGTH)}0]`)).toBe(
      ErrorCodes.LENGTH_OUT_OF_RANGE,
    );
  });

  it('元素非整数', () => {
    expect(fail('[1, 1.5, 2]')).toBe(ErrorCodes.ELEMENT_NOT_INTEGER);
    expect(fail('[1, "2", 3]')).toBe(ErrorCodes.ELEMENT_NOT_INTEGER);
    expect(fail('[1, null, 3]')).toBe(ErrorCodes.ELEMENT_NOT_INTEGER);
    expect(fail('[1, true, 3]')).toBe(ErrorCodes.ELEMENT_NOT_INTEGER);
    expect(fail('[1, [2], 3]')).toBe(ErrorCodes.ELEMENT_NOT_INTEGER);
    expect(fail('[1, {}, 3]')).toBe(ErrorCodes.ELEMENT_NOT_INTEGER);
    expect(fail('[1, 0/0, 3]')).toBe(ErrorCodes.INVALID_JSON);
    expect(fail('[1, NaN, 3]')).toBe(ErrorCodes.INVALID_JSON);
    expect(fail('[1, Infinity, 3]')).toBe(ErrorCodes.INVALID_JSON);
  });

  it('元素越界', () => {
    expect(fail(`[${MIN_VALUE - 1}, 1]`)).toBe(ErrorCodes.ELEMENT_OUT_OF_RANGE);
    expect(fail(`[1, ${MAX_VALUE + 1}]`)).toBe(ErrorCodes.ELEMENT_OUT_OF_RANGE);
  });

  it('规模优先于元素校验', () => {
    expect(fail('[1.5]')).toBe(ErrorCodes.LENGTH_OUT_OF_RANGE);
  });

  it('错误包含首个非法下标', () => {
    const r = parseAndValidate('[1, 2, "x"]');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCodes.ELEMENT_NOT_INTEGER);
      expect(r.error.index).toBe(2);
    }
  });

  it('最小长度常量为 2', () => {
    expect(MIN_LENGTH).toBe(2);
  });
});
