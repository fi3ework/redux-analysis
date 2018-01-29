## 说明

本文所分析的Redux版本为3.7.2
## 文件结构
redux并不大，分析起来也很容易，只要会用redux基本上都会很容易的就看懂本文
这是redux的目录结构
```
.
├── applyMiddleware.js 将middleware串联起来生成一个更强大的dispatch函数，就是中间件的作用
├── bindActionCreators.js 把action creators转成拥有同名keys的对象
├── combineReducers.js 将多个reducer组合起来，每一块独立的管理自己对应的state
├── compose.js 将middleware从右向左依次调用，函数式编程中常用，在redux供
├── createStore.js 创建一个store，包括实现了subscribe, unsubscribe, dispatch及储存state的功能
├── index.js 对外export
├── utils
│   ├── actionTypes.js redux内置的action，用来初始化
│   ├── isPlainObject.js 用来判断是否为单纯对象
│   └── warning.js 报错提示
└── xx.md
```
## 源码分析

直接写在`/src`的注释里了，官方注释也有解释每个函数的作用，中文翻译可以见[Redux 中文文档](http://github.com/camsong/redux-in-chinese)

推荐源码的阅读顺序为

```
index -> creatStore.js -> applyMiddleware.js (compose.js) -> combineReducers.js -> bindActionCreators.js
```