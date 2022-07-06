import { beforeEach, expect, test } from "@jest/globals"
import { act, renderHook } from "@testing-library/react"

import { useExampleCounter } from "~index"

global.chrome = undefined

beforeEach(() => {
  localStorage.clear()
})

test("increments counter ", () => {
  const { result } = renderHook(() => useExampleCounter())

  expect(result.current[0]).toBe(0)

  act(() => {
    result.current[1]()
  })

  expect(result.current[0]).toBe(1)
})
