import { ReactExample, useExampleCounter } from "../src"

function IndexPopup() {
  const [counter, incrementCounter] = useExampleCounter()

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16
      }}>
      <h1>Welcome!</h1>
      <p>{counter}</p>
      <button
        onClick={() => incrementCounter()}
        style={{
          marginTop: 16
        }}>
        Increment
      </button>
      <ReactExample />
    </div>
  )
}

export default IndexPopup
