// 真正需要获取参数的函数被柯里化了起来
function bindActionCreator (actionCreator, dispatch) {
  // 高阶函数，闭包引用 dispatch
  return function () {
    return dispatch(actionCreator.apply(this, arguments))
  }
}

/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass a single function as the first argument,
 * and get a function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */

// 实际上就是返回一个高阶函数，通过闭包引用，将 dispatch 给隐藏了起来
// 正常操作是发起一个 dispatch(action)，但 bindActionCreators 将 dispatch 隐藏，当执行bindActionCreators返回的函数时，就会dispatch(actionCreators(...arguments))
// 所以参数叫做 actionCreators，作用是返回一个 action
// 如果是一个对象里有多个 actionCreators 的话，就会类似 map 函数返回一个对应的对象，每个 key 对应的 value 就是上面所说的被绑定了的函数
export default function bindActionCreators (actionCreators, dispatch) {
  // 如果是actionCreators是函数，那么直接调用，比如是个需要被thunk的函数
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${
        actionCreators === null ? 'null' : typeof actionCreators
      }. ` +
        `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }

  const keys = Object.keys(actionCreators)
  const boundActionCreators = {}
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const actionCreator = actionCreators[key]
    if (typeof actionCreator === 'function') {
      // 每个 key 再次调用一次 bindActionCreator
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  // map 后的对象
  return boundActionCreators
}
