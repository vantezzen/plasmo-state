import { useState } from "react"

export const useExampleCounter = (): [number, () => void] => {
  const [count, setCount] = useState(0)

  return [count, () => setCount(count + 1)]
}
