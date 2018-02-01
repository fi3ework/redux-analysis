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

// 对applyMiddleware的分析参考了 https://zhuanlan.zhihu.com/p/20597452，在此感谢

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

// 整个applyMiddleware其实就是在更新dispatch，这也是中间件的作用所在
// 可以看到最后，除了修改了dispatch，只是返回了一个普通store
export default function applyMiddleware (...middlewares) {
  // 传入createStore
  return createStore => (...args) => {
    // 先用传入的createStore来创建一个最普通的store
    const store = createStore(...args)
    // 初始化dispatch，这个dispatch也是最终我们要将各个中间件串联起来的dispatch
    let dispatch = () => {
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
          `Other middleware would not be applied to this dispatch.`
      )
    }
    // 储存将要被串联起来的中间件，函数签名为next => action => {...}
    // 下一个中间件作为next传进去，被当前中间件调用
    let chain = []

    const middlewareAPI = {
      getState: store.getState,
      // 在这里dispatch使用匿名函数是为了能在middleware中调用最新的dispatch（闭包）：
      // 必须是匿名函数而不是直接写成dispatch: store.dispatch
      // 这样能保证在middleware中传入的dispatch都通过闭包引用着最终compose出来的dispatch
      // 如果直接写成store.dispatch，在`dispatch = compose(...chain)(store.dispatch)`中
      // middlewareAPI.dispatch并没有得到更新，依旧是最老的，只有在最后才得到了更新
      // 但是我们要保证在整个中间件的调用过程中，任何中间件调用的都是最终的dispatch
      // 我写了个模拟的调用，可以在 http://jsbin.com/fezitiwike/edit?js,console 上感受一下

      // 还有，这里使用了...args而不是action，是因为有个PR https://github.com/reactjs/redux/pull/2560
      // 这个PR的作者认为在dispatch时需要提供多个参数，像这样`dispatch(action, option)`
      // 这种情况确实存在，但是只有当这个需提供多参数的中间件是第一个被调用的中间件时（即在middlewares数组中排最后）才有效
      // 因为无法保证上一个调用这个多参数中间件的中间件是使用的next(action)或是next(...args)来调用
      // 在这个PR的讨论中可以看到Dan对这个改动持保留意见
      dispatch: (...args) => dispatch(...args)
    }
    // 传入 {dispatch, getState}
    chain = middlewares.map(middleware => middleware(middlewareAPI))
    // 最开始的next就是store.dispatch
    // 相当于就是每个中间件在自己的过程中做一些操作，做完之后调用下一个中间件(next(action))
    dispatch = compose(...chain)(store.dispatch)

    // 最终返回一个dispatch被修改了的store，这个dispatch串联起了中间件
    return {
      ...store,
      dispatch
    }
  }
}
