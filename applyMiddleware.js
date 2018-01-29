import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */

// applyMiddleware的分析参考了 https://zhuanlan.zhihu.com/p/20597452
// 附上redux-thunk，方便理解中间件运行的整个过程:
// function createThunkMiddleware(extraArgument) {
//   return ({ dispatch, getState }) => next => action => {
//     if (typeof action === 'function') {
//       return action(dispatch, getState, extraArgument)
//     }
//     return next(action)
//   }
// }

// 附上applyMiddleware在createStore中被调用的入口:
// return enhancer(createStore)(reducer, preloadedState)

// createStore中对enhancer的调用为：
// return enhancer(createStore)(reducer, preloadedState)
// 整个applyMiddleware其实就是在更新dispatch，这也是中间件的作用所在
// 可以看到最后，除了修改了dispatch，原封不动的返回了store
export default function applyMiddleware (...middlewares) {
  // 传入createStore
  return createStore => (...args) => {
    // 用传入的createStore来创建一个最普通的store
    const store = createStore(...args)
    // 初始化dispatch，这个dispatch也是最终我们修改的dispatch
    let dispatch = () => {
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
          `Other middleware would not be applied to this dispatch.`
      )
    }
    let chain = []

    // 在这里dispatch使用匿名函数是为了能在middleware中调用最新的dispatch（闭包）
    const middlewareAPI = {
      getState: store.getState,
      // 这里，必须用匿名函数而不是直接写成dispatch: store.dispatch
      // 这样能保证在middleware中传入的dispatch都通过闭包引用着最终compose出来的dispatch
      // 如果直接写成store.dispatch，在`dispatch = compose(...chain)(store.dispatch)`中
      // middlewareAPI.dispatch并没有得到更新，依旧是最老的
      // 我写了个模拟的调用，可以在 http://jsbin.com/fezitiwike/edit?js,console 上感受一下
      dispatch: (...args) => dispatch(...args)
    }
    // 传入 {dispatch, getState}
    chain = middlewares.map(middleware => middleware(middlewareAPI))
    // 最开始的next就是store.dispatch
    // 相当于就是每个中间件在自己的过程中做一些操作，搞完之后调用下一个中间件`next(action)`
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
