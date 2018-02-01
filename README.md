## 说明

**本文所分析的Redux版本为3.7.2**

分析代码时通过查看Github blame，参考了Redux的issue及PR来分析各个函数的意图而不仅是从代码层面分析函数的作用，并且分析了很多细节层面上写法的原因，比如：

1. `dispatch: (...args) => dispatch(…args)` 为什么不只传递一个 `action` ?

2. `listener` 的调用为什么从 `forEach` 改成了 `for` ?

3. 为什么在 `reducer` 的调用过程中不允许 `dispatch(action)` ?

   ...

水平有限，有写的不好或不对的地方请指出，欢迎留[issue](https://github.com/fi3ework/redux-analysis/issues)交流😆

## 文件结构

Redux的文件结构并不复杂，每个文件就是一个对外导出的函数，依赖很少，分析起来也比较容易，只要会用Redux基本上都能看懂本文。
这是Redux的目录结构：
```
.
├── applyMiddleware.js       将middleware串联起来生成一个更强大的dispatch函数，就是中间件的本质作用
├── bindActionCreators.js    把action creators转成拥有同名keys的对象
├── combineReducers.js       将多个reducer组合起来，每一个reducer独立管理自己对应的state
├── compose.js               将middleware从右向左依次调用，函数式编程中的常用方法，被applyMiddleware调用
├── createStore.js           最核心功能，创建一个store，包括实现了subscribe, unsubscribe, dispatch及state的储存
├── index.js                 对外export
└── utils                    一些小的辅助函数供其他的函数调用
   ├── actionTypes.js        redux内置的action，用来初始化initialState
   ├── isPlainObject.js      用来判断是否为单纯对象
   └── warning.js            报错提示

```
## 源码分析

直接写在代码的注释里了，在每个函数上方也有大段的官方注释来解释每个函数的作用，中文翻译可以见[Redux 中文文档](http://github.com/camsong/redux-in-chinese)

**推荐源码的阅读顺序为：**

```
index.js -> creatStore.js -> applyMiddleware.js (compose.js) -> combineReducers.js -> bindActionCreators.js
```