module.exports = {
    // root: true,
    // env: {
    //     node: true,
    //     browser: true,
    // },
    // parser: 'vue-eslint-parser',
    // parserOptions: {
    //     parser: '@babel/eslint-parser',
    //     ecmaVersion: 2020,
    //     sourceType: 'module',
    // },
    // extends: [
    //     'plugin:vue/vue3-essential',
    //     'eslint:recommended',
    // ],
    root: true,
    env: {
        node: true,
        es6: true // 确保启用ES6支持
    },
    extends: [
        'plugin:vue/essential',
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2020, // 使用较新的ECMAScript版本
        sourceType: 'module' // 使用ES模块
    },
    rules: {
        'vue/multi-word-component-names': 'off',
        'no-unused-vars': 'off', // 全局关闭未使用变量检查
        // 'no-mixed-spaces-and-tabs': 'error', // 禁止混用空格和制表符
    },
};