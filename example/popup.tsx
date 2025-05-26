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
        padding: 16,
        width: 300,
        height: 300
      }}>
      <h1>Welcome!</h1>

      <h2>Per Tab</h2>
      <p>{state.perTab}</p>

      <button
        onClick={() => state.perTab++}
        style={{
          marginTop: 16
        }}>
        Increment
      </button>

      <h2>Persistent</h2>
      <input
        type="text"
        value={state.persistent}
        onChange={(e) => {
          state.persistent = e.target.value
        }}
      />

      <h2>Offscreen Page counter</h2>
      <p>{state.offscreenCounter}</p>
    </div>
  )
}

export default IndexPopup
