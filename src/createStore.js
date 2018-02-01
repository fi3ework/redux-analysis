import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
export default function createStore (reducer, preloadedState, enhancer) {
  // 当只有两个参数，且第二个参数为函数时，则实际传递的是reducer和enhancer
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  // 如果有第三个参数且第三个参数不为函数则报错（enhancer必须为函数）
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }
    // 如果穿入了applyMiddleware，则控制反转，交由enhancer来生成store
    return enhancer(createStore)(reducer, preloadedState)
  }

  // 传入的reducer必须是一个纯函数，且是必填参数
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  let currentReducer = reducer
  let currentState = preloadedState
  let currentListeners = []
  let nextListeners = currentListeners
  let isDispatching = false

  // 添加这个函数的意图在下面会讲到，先看代码层面上的作用：
  // 如果nextListeners和currentListeners指向同一个对象
  // 则nextListeners对currentListeners进行深拷贝
  function ensureCanMutateNextListeners () {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  function getState () {
    // 参考：https://github.com/reactjs/redux/issues/1568
    // 为了保持reducer的pure，禁止在reducer中调用getState
    // 纯函数reducer要求根据一定的输入即能得到确定的输出，所以禁止了getState,subscribe,unsubscribe和dispatch等会带来副作用的行为
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe (listener) {
    // 传入的listener必须是一个可以调用的函数，否则报错
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }
    // 同上，保证纯函数不带来副作用
    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
      )
    }

    let isSubscribed = true

    // 在每次subscribe的时候，深拷贝一次currentListeners，再对nextListener push新的listener
    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    return function unsubscribe () {
      if (!isSubscribed) {
        return
      }

      // 同上，保证纯函数不带来副作用
      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
        )
      }

      isSubscribed = false

      // 在每次unsubscribe的时候，深拷贝一次currentListeners，再对nextListeners取消订阅当前listener
      ensureCanMutateNextListeners()
      // 从nextListeners中去掉unsubscribe的listener
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch (action) {
    // action必须是一个plain object，如果想要能处理传进来的函数的话必须使用中间件（redux-thunk等）
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }
    // action必须定义type属性
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }
    // 同上，保证纯函数不带来副作用
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }
    // currentReducer不可预料是否会报错，所以try，但不catch
    try {
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      // 必须在结束的时候将isDispatching归位
      isDispatching = false
    }

    // 在这里体现了currentListeners和nextListeners的作用
    // 我去翻了一下redux的commit message，找到了对listener做深拷贝的原因：https://github.com/reactjs/redux/issues/461
    // 简单来说就是在listener中可能有unsubscribe操作，比如有3个listener(下标0,1,2)，在第2个listener执行时unsubscribe了自己
    // 那么第3个listener的下标就变成了1，但是for循环下一轮的下标是2，第3个listener就被跳过了
    // 所以执行一次深拷贝，即使在listener过程中unsubscribe了也是更改的nextListeners（nextListeners会去深拷贝currentListeners）
    // 当前执行的currentListeners不会被修改，也就是所谓的快照

    // redux在执行subscribe和unsubscribe的时候都要执行ensureCanMutateNextListeners来确定是否要进行一次深拷贝
    // 只要进行了一次dispatch，那么currentListeners === nextListeners，之后的subscribe和unsubscribe就必须深拷贝一次（因为nextListeners和currentListeners此时===）
    // 否则可以一直对nextListeners操作而不需要为currentListeners深拷贝赋值，即只在必要时深拷贝
    const listeners = (currentListeners = nextListeners)
    // 这里使用for而不是forEach，是因为listeners是我们自己创造的，不存在稀疏组的情况，所有直接用for性能来得更好
    // 见 https://github.com/reactjs/redux/commit/5b586080b43ca233f78d56cbadf706c933fefd19
    // 附上Dan的原话：This is an optimization because forEach() has more complicated logic per spec to deal with sparse arrays. Also it's better to not allocate a function when we can easily avoid that.
    // 这里没有缓存listeners.length，Dan相信V8足够智能会自动缓存，相比手工缓存性能更好
    for (let i = 0; i < listeners.length; i++) {
      // 这里将listener单独新建一个变量而不是listener[i]()
      // 是因为直接listeners[i]()会把listeners作为this泄漏，而赋值为listener()后this指向全局变量
      // https://github.com/reactjs/redux/commit/8e82c15f1288a0a5c5c886ffd87e7e73dc0103e1
      const listener = listeners[i]
      listener()
    }

    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer (nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    // ActionTypes.REPLACE其实就是ActionTypes.INIT
    // 重新INIT依次是为了获取新的reducer中的默认参数
    dispatch({ type: ActionTypes.REPLACE })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  // 实现了一个类似RxJS的订阅者模式
  // 使用了symbol-observable这个模块来实现
  // 这个功能的目的可以见这个issue https://github.com/reactjs/redux/issues/1631：
  // 1. 增加了和RxJS等交互的可能性
  // 2. 人们不会再问RxJS和redux的区别了
  // 3. 现在可以有更可操作性的方法来向component传递state了
  // 4. 这已经算是很小的改动了
  // 这个我们平时无法用到，这是只对内暴露的方法，应该是提供给中间件一种更好的getState的方法
  function observable () {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe (observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState () {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },
      [$$observable] () {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  // reducer要求对无法识别的action返回state，就是因为需要通过ActionTypes.INIT获取默认参数值并返回
  // 当initailState和reducer的参数默认值都存在的时候，参数默认值将不起作用
  // 因为在调用初始化的action前currState就已经被赋值了initialState
  // 同时这个initialState也是服务端渲染的初始状态入口
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
