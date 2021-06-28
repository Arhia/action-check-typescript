require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 949:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */



var fs = __nccwpck_require__(747);
function pipeExists(name) {
    return fs.existsSync(name);
}
function createCancellationToken(args) {
    var cancellationPipeName;
    for (var i = 0; i < args.length - 1; i++) {
        if (args[i] === "--cancellationPipeName") {
            cancellationPipeName = args[i + 1];
            break;
        }
    }
    if (!cancellationPipeName) {
        return {
            isCancellationRequested: function () { return false; },
            setRequest: function (_requestId) { return void 0; },
            resetRequest: function (_requestId) { return void 0; }
        };
    }
    if (cancellationPipeName.charAt(cancellationPipeName.length - 1) === "*") {
        var namePrefix_1 = cancellationPipeName.slice(0, -1);
        if (namePrefix_1.length === 0 || namePrefix_1.indexOf("*") >= 0) {
            throw new Error("Invalid name for template cancellation pipe: it should have length greater than 2 characters and contain only one '*'.");
        }
        var perRequestPipeName_1;
        var currentRequestId_1;
        return {
            isCancellationRequested: function () { return perRequestPipeName_1 !== undefined && pipeExists(perRequestPipeName_1); },
            setRequest: function (requestId) {
                currentRequestId_1 = requestId;
                perRequestPipeName_1 = namePrefix_1 + requestId;
            },
            resetRequest: function (requestId) {
                if (currentRequestId_1 !== requestId) {
                    throw new Error("Mismatched request id, expected " + currentRequestId_1 + ", actual " + requestId);
                }
                perRequestPipeName_1 = undefined;
            }
        };
    }
    else {
        return {
            isCancellationRequested: function () { return pipeExists(cancellationPipeName); },
            setRequest: function (_requestId) { return void 0; },
            resetRequest: function (_requestId) { return void 0; }
        };
    }
}
module.exports = createCancellationToken;
//# sourceMappingURL=cancellationToken.js.map

/***/ }),

/***/ 747:
/***/ ((module) => {

module.exports = require("fs");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(949);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=cancellationToken.js.map