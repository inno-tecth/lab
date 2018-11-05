/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/UIElement.ts":
/*!**************************!*\
  !*** ./src/UIElement.ts ***!
  \**************************/
/*! exports provided: UI, React */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UI", function() { return UI; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "React", function() { return React; });
var UIElement = /** @class */ (function () {
    function UIElement() {
        this._contexts = [];
        this.create = this.create.bind(this);
    }
    UIElement.prototype.push = function (context) {
        this._contexts.push(context);
    };
    UIElement.prototype.pop = function () {
        this._contexts.pop();
    };
    UIElement.prototype.create = function (name, attr) {
        var children = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            children[_i - 2] = arguments[_i];
        }
        var node = typeof name == 'string' ? document.createElement(name) : new name();
        var parent = node instanceof HTMLElement ? node : node.node;
        for (var k in attr) {
            switch (k) {
                case 'style':
                    {
                        var style = attr[k];
                        for (var n in style) {
                            parent.style[n] = style[n];
                        }
                    }
                    break;
                default:
                    {
                        parent.setAttribute(k, attr[k]);
                    }
                    break;
            }
        }
        if (parent && children && children.length > 0) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (typeof child == 'string') {
                    parent.innerText = child;
                    continue;
                }
                if (child instanceof HTMLElement) {
                    parent.appendChild(child);
                    continue;
                }
                child = child ? child.node : null;
                if (child) {
                    parent.appendChild(child);
                }
            }
        }
        var id = attr ? attr['id'] : null;
        if (id) {
            this._contexts[this._contexts.length - 1][id] = node;
        }
        return node;
    };
    return UIElement;
}());
var UI = new UIElement();
var React = { createElement: UI.create };


/***/ }),

/***/ "./src/View.tsx":
/*!**********************!*\
  !*** ./src/View.tsx ***!
  \**********************/
/*! exports provided: MyView */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MyView", function() { return MyView; });
/* harmony import */ var _UIElement__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./UIElement */ "./src/UIElement.ts");

var MyBox = /** @class */ (function () {
    function MyBox() {
        _UIElement__WEBPACK_IMPORTED_MODULE_0__["UI"].push(this);
        _UIElement__WEBPACK_IMPORTED_MODULE_0__["React"].createElement("div", { id: "node" });
        _UIElement__WEBPACK_IMPORTED_MODULE_0__["UI"].pop();
    }
    return MyBox;
}());
var MyButton = /** @class */ (function () {
    function MyButton() {
        _UIElement__WEBPACK_IMPORTED_MODULE_0__["UI"].push(this);
        _UIElement__WEBPACK_IMPORTED_MODULE_0__["React"].createElement("button", { id: "node" });
        _UIElement__WEBPACK_IMPORTED_MODULE_0__["UI"].pop();
    }
    return MyButton;
}());
var MyView = /** @class */ (function () {
    function MyView() {
        _UIElement__WEBPACK_IMPORTED_MODULE_0__["UI"].push(this);
        _UIElement__WEBPACK_IMPORTED_MODULE_0__["React"].createElement("div", { id: "node" },
            _UIElement__WEBPACK_IMPORTED_MODULE_0__["React"].createElement("div", { style: { background: 'red' } }, "one"),
            _UIElement__WEBPACK_IMPORTED_MODULE_0__["React"].createElement("div", { style: { background: 'blue' } }, "two"),
            _UIElement__WEBPACK_IMPORTED_MODULE_0__["React"].createElement(MyBox, { id: "box" },
                _UIElement__WEBPACK_IMPORTED_MODULE_0__["React"].createElement("div", null,
                    _UIElement__WEBPACK_IMPORTED_MODULE_0__["React"].createElement(MyButton, null, "aaa"),
                    _UIElement__WEBPACK_IMPORTED_MODULE_0__["React"].createElement(MyButton, null, "bbb"))));
        _UIElement__WEBPACK_IMPORTED_MODULE_0__["UI"].pop();
    }
    return MyView;
}());



/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _View__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./View */ "./src/View.tsx");
//@see https://www.tslang.cn/docs/handbook/jsx.html

(function () {
    var view = new _View__WEBPACK_IMPORTED_MODULE_0__["MyView"]();
    console.log(view);
    document.getElementById('root').appendChild(view.node);
})();


/***/ })

/******/ });
//# sourceMappingURL=app.js.map