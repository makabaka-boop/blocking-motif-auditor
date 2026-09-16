/** 稳定错误码：前端展示与端到端测试都依据这些常量。 */
export const ErrorCodes = {
  EMPTY_INPUT: 'E_EMPTY_INPUT',
  INVALID_JSON: 'E_INVALID_JSON',
  NOT_ARRAY: 'E_NOT_ARRAY',
  LENGTH_OUT_OF_RANGE: 'E_LENGTH_OUT_OF_RANGE',
  ELEMENT_NOT_INTEGER: 'E_ELEMENT_NOT_INTEGER',
  ELEMENT_OUT_OF_RANGE: 'E_ELEMENT_OUT_OF_RANGE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ValidationError {
  code: ErrorCode;
  message: string;
  /** 触发错误的首个元素下标（-1 表示错误与具体元素无关）。 */
  index: number;
}

export const MIN_LENGTH = 2;
export const MAX_LENGTH = 200_000;
export const MIN_VALUE = -2_147_483_648; // INT32_MIN
export const MAX_VALUE = 2_147_483_647; // INT32_MAX

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCodes.EMPTY_INPUT]: '输入为空，请提供一个 JSON 整数数组。',
  [ErrorCodes.INVALID_JSON]: 'JSON 语法损坏，无法解析。',
  [ErrorCodes.NOT_ARRAY]: '顶层结构必须是数组，例如 [1, 2, 3]。',
  [ErrorCodes.LENGTH_OUT_OF_RANGE]: `数组长度必须在 ${MIN_LENGTH} 至 ${MAX_LENGTH} 之间。`,
  [ErrorCodes.ELEMENT_NOT_INTEGER]: '数组元素必须全部是整数，不允许小数、字符串、布尔值、null、对象或嵌套数组。',
  [ErrorCodes.ELEMENT_OUT_OF_RANGE]: `元素必须是 ${MIN_VALUE} 至 ${MAX_VALUE} 之间的 32 位有符号整数。`,
};

function makeError(code: ErrorCode, index = -1): ValidationError {
  return { code, message: ERROR_MESSAGES[code], index };
}

/**
 * 解析并整次校验输入文本。
 *
 * 任何一项不合规都整体拒绝（不会给出部分结果），返回首个错误的稳定错误码。
 * 成功时返回只读的普通数组（仍是独立副本，调用方可安全持有）。
 */
export function parseAndValidate(raw: string):
  | { ok: true; data: number[] }
  | { ok: false; error: ValidationError } {
  const text = raw.trim();
  if (text.length === 0) {
    return { ok: false, error: makeError(ErrorCodes.EMPTY_INPUT) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: makeError(ErrorCodes.INVALID_JSON) };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: makeError(ErrorCodes.NOT_ARRAY) };
  }

  const arr = parsed as unknown[];
  if (arr.length < MIN_LENGTH || arr.length > MAX_LENGTH) {
    return { ok: false, error: makeError(ErrorCodes.LENGTH_OUT_OF_RANGE) };
  }

  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      return { ok: false, error: makeError(ErrorCodes.ELEMENT_NOT_INTEGER, i) };
    }
    if (v < MIN_VALUE || v > MAX_VALUE) {
      return { ok: false, error: makeError(ErrorCodes.ELEMENT_OUT_OF_RANGE, i) };
    }
  }

  return { ok: true, data: arr as number[] };
}
