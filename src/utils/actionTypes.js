/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
const ActionTypes = {
  // INIT和REPLACE一模一样，只是含义不同，REPLACE其实就是INIT
  INIT:
    '@@redux/INIT' +
    Math.random()
      .toString(36)
      .substring(7)
      .split('')
      .join('.'),
  REPLACE:
    '@@redux/REPLACE' +
    Math.random()
      .toString(36)
      .substring(7)
      .split('')
      .join('.')
}

export default ActionTypes
