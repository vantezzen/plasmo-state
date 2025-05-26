import getState, { StateEnvironment } from "~shared" // Consolidated import

const state = getState(StateEnvironment.Offscreen)
state.addListener("change", () => {
  console.log("State changed:", state.current)
})

setInterval(() => {
  state.current.offscreenCounter++
}, 1000)
