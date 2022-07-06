import { StateEnvironment, usePlasmoState } from "../src"
import getState from "./shared"

const plasmoState = getState(StateEnvironment.Popup)

function IndexPopup() {
  const state = usePlasmoState(plasmoState)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16
      }}>
      <h1>Welcome!</h1>
      <p>{state.perTab}</p>

      <button
        onClick={() => state.perTab++}
        style={{
          marginTop: 16
        }}>
        Increment
      </button>
    </div>
  )
}

export default IndexPopup
