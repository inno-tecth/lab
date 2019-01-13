var Module = typeof Module !== "undefined" ? Module: {};
((function() {
    var moduleOverrides = {};
    var key;
    for (key in Module) {
        if (Module.hasOwnProperty(key)) {
            moduleOverrides[key] = Module[key]
        }
    }
    Module["arguments"] = [];
    Module["thisProgram"] = "./this.program";
    Module["quit"] = (function(status, toThrow) {
        throw toThrow
    });
    Module["preRun"] = [];
    Module["postRun"] = [];
    var ENVIRONMENT_IS_WEB = false;
    var ENVIRONMENT_IS_WORKER = false;
    var ENVIRONMENT_IS_NODE = false;
    var ENVIRONMENT_IS_SHELL = false;
    ENVIRONMENT_IS_WEB = typeof window === "object";
    ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
    ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
    var scriptDirectory = "";
    function locateFile(path) {
        if (Module["locateFile"]) {
            return Module["locateFile"](path, scriptDirectory)
        } else {
            return scriptDirectory + path
        }
    }
    if (ENVIRONMENT_IS_NODE) {
        scriptDirectory = __dirname + "/";
        var nodeFS;
        var nodePath;
        Module["read"] = function shell_read(filename, binary) {
            var ret;
            ret = tryParseAsDataURI(filename);
            if (!ret) {
                if (!nodeFS) nodeFS = require("fs");
                if (!nodePath) nodePath = require("path");
                filename = nodePath["normalize"](filename);
                ret = nodeFS["readFileSync"](filename)
            }
            return binary ? ret: ret.toString()
        };
        Module["readBinary"] = function readBinary(filename) {
            var ret = Module["read"](filename, true);
            if (!ret.buffer) {
                ret = new Uint8Array(ret)
            }
            assert(ret.buffer);
            return ret
        };
        if (process["argv"].length > 1) {
            Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/")
        }
        Module["arguments"] = process["argv"].slice(2);
        if (typeof module !== "undefined") {
            module["exports"] = Module
        }
        process["on"]("uncaughtException", (function(ex) {
            if (! (ex instanceof ExitStatus)) {
                throw ex
            }
        }));
        process["on"]("unhandledRejection", abort);
        Module["quit"] = (function(status) {
            process["exit"](status)
        });
        Module["inspect"] = (function() {
            return "[Emscripten Module object]"
        })
    } else if (ENVIRONMENT_IS_SHELL) {
        if (typeof read != "undefined") {
            Module["read"] = function shell_read(f) {
                var data = tryParseAsDataURI(f);
                if (data) {
                    return intArrayToString(data)
                }
                return read(f)
            }
        }
        Module["readBinary"] = function readBinary(f) {
            var data;
            data = tryParseAsDataURI(f);
            if (data) {
                return data
            }
            if (typeof readbuffer === "function") {
                return new Uint8Array(readbuffer(f))
            }
            data = read(f, "binary");
            assert(typeof data === "object");
            return data
        };
        if (typeof scriptArgs != "undefined") {
            Module["arguments"] = scriptArgs
        } else if (typeof arguments != "undefined") {
            Module["arguments"] = arguments
        }
        if (typeof quit === "function") {
            Module["quit"] = (function(status) {
                quit(status)
            })
        }
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
        if (ENVIRONMENT_IS_WORKER) {
            scriptDirectory = self.location.href
        } else if (document.currentScript) {
            scriptDirectory = document.currentScript.src
        }
        if (scriptDirectory.indexOf("blob:") !== 0) {
            scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1)
        } else {
            scriptDirectory = ""
        }
        Module["read"] = function shell_read(url) {
            try {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                xhr.send(null);
                return xhr.responseText
            } catch(err) {
                var data = tryParseAsDataURI(url);
                if (data) {
                    return intArrayToString(data)
                }
                throw err
            }
        };
        if (ENVIRONMENT_IS_WORKER) {
            Module["readBinary"] = function readBinary(url) {
                try {
                    var xhr = new XMLHttpRequest;
                    xhr.open("GET", url, false);
                    xhr.responseType = "arraybuffer";
                    xhr.send(null);
                    return new Uint8Array(xhr.response)
                } catch(err) {
                    var data = tryParseAsDataURI(url);
                    if (data) {
                        return data
                    }
                    throw err
                }
            }
        }
        Module["readAsync"] = function readAsync(url, onload, onerror) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function xhr_onload() {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return
                }
                var data = tryParseAsDataURI(url);
                if (data) {
                    onload(data.buffer);
                    return
                }
                onerror()
            };
            xhr.onerror = onerror;
            xhr.send(null)
        };
        Module["setWindowTitle"] = (function(title) {
            document.title = title
        })
    } else {}
    var out = Module["print"] || (typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ? print: null);
    var err = Module["printErr"] || (typeof printErr !== "undefined" ? printErr: typeof console !== "undefined" && console.warn.bind(console) || out);
    for (key in moduleOverrides) {
        if (moduleOverrides.hasOwnProperty(key)) {
            Module[key] = moduleOverrides[key]
        }
    }
    moduleOverrides = undefined;
    var STACK_ALIGN = 16;
    function staticAlloc(size) {
        var ret = STATICTOP;
        STATICTOP = STATICTOP + size + 15 & -16;
        return ret
    }
    function dynamicAlloc(size) {
        var ret = HEAP32[DYNAMICTOP_PTR >> 2];
        var end = ret + size + 15 & -16;
        HEAP32[DYNAMICTOP_PTR >> 2] = end;
        if (end >= TOTAL_MEMORY) {
            var success = enlargeMemory();
            if (!success) {
                HEAP32[DYNAMICTOP_PTR >> 2] = ret;
                return 0
            }
        }
        return ret
    }
    function alignMemory(size, factor) {
        if (!factor) factor = STACK_ALIGN;
        return Math.ceil(size / factor) * factor
    }
    function getNativeTypeSize(type) {
        switch (type) {
        case "i1":
        case "i8":
            return 1;
        case "i16":
            return 2;
        case "i32":
            return 4;
        case "i64":
            return 8;
        case "float":
            return 4;
        case "double":
            return 8;
        default:
            {
                if (type[type.length - 1] === "*") {
                    return 4
                } else if (type[0] === "i") {
                    var bits = parseInt(type.substr(1));
                    assert(bits % 8 === 0);
                    return bits / 8
                } else {
                    return 0
                }
            }
        }
    }
    function warnOnce(text) {
        if (!warnOnce.shown) warnOnce.shown = {};
        if (!warnOnce.shown[text]) {
            warnOnce.shown[text] = 1;
            err(text)
        }
    }
    var jsCallStartIndex = 1;
    var functionPointers = new Array(0);
    var funcWrappers = {};
    function dynCall(sig, ptr, args) {
        if (args && args.length) {
            return Module["dynCall_" + sig].apply(null, [ptr].concat(args))
        } else {
            return Module["dynCall_" + sig].call(null, ptr)
        }
    }
    var tempRet0 = 0;
    var setTempRet0 = (function(value) {
        tempRet0 = value
    });
    var getTempRet0 = (function() {
        return tempRet0
    });
    var GLOBAL_BASE = 8;
    var ABORT = false;
    var EXITSTATUS = 0;
    function assert(condition, text) {
        if (!condition) {
            abort("Assertion failed: " + text)
        }
    }
    function getCFunc(ident) {
        var func = Module["_" + ident];
        assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
        return func
    }
    var JSfuncs = {
        "stackSave": (function() {
            stackSave()
        }),
        "stackRestore": (function() {
            stackRestore()
        }),
        "arrayToC": (function(arr) {
            var ret = stackAlloc(arr.length);
            writeArrayToMemory(arr, ret);
            return ret
        }),
        "stringToC": (function(str) {
            var ret = 0;
            if (str !== null && str !== undefined && str !== 0) {
                var len = (str.length << 2) + 1;
                ret = stackAlloc(len);
                stringToUTF8(str, ret, len)
            }
            return ret
        })
    };
    var toC = {
        "string": JSfuncs["stringToC"],
        "array": JSfuncs["arrayToC"]
    };
    function ccall(ident, returnType, argTypes, args, opts) {
        function convertReturnValue(ret) {
            if (returnType === "string") return Pointer_stringify(ret);
            if (returnType === "boolean") return Boolean(ret);
            return ret
        }
        var func = getCFunc(ident);
        var cArgs = [];
        var stack = 0;
        if (args) {
            for (var i = 0; i < args.length; i++) {
                var converter = toC[argTypes[i]];
                if (converter) {
                    if (stack === 0) stack = stackSave();
                    cArgs[i] = converter(args[i])
                } else {
                    cArgs[i] = args[i]
                }
            }
        }
        var ret = func.apply(null, cArgs);
        ret = convertReturnValue(ret);
        if (stack !== 0) stackRestore(stack);
        return ret
    }
    function setValue(ptr, value, type, noSafe) {
        type = type || "i8";
        if (type.charAt(type.length - 1) === "*") type = "i32";
        switch (type) {
        case "i1":
            HEAP8[ptr >> 0] = value;
            break;
        case "i8":
            HEAP8[ptr >> 0] = value;
            break;
        case "i16":
            HEAP16[ptr >> 1] = value;
            break;
        case "i32":
            HEAP32[ptr >> 2] = value;
            break;
        case "i64":
            tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min( + Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~ + Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0)],
            HEAP32[ptr >> 2] = tempI64[0],
            HEAP32[ptr + 4 >> 2] = tempI64[1];
            break;
        case "float":
            HEAPF32[ptr >> 2] = value;
            break;
        case "double":
            HEAPF64[ptr >> 3] = value;
            break;
        default:
            abort("invalid type for setValue: " + type)
        }
    }
    var ALLOC_STATIC = 2;
    var ALLOC_NONE = 4;
    function Pointer_stringify(ptr, length) {
        if (length === 0 || !ptr) return "";
        var hasUtf = 0;
        var t;
        var i = 0;
        while (1) {
            t = HEAPU8[ptr + i >> 0];
            hasUtf |= t;
            if (t == 0 && !length) break;
            i++;
            if (length && i == length) break
        }
        if (!length) length = i;
        var ret = "";
        if (hasUtf < 128) {
            var MAX_CHUNK = 1024;
            var curr;
            while (length > 0) {
                curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
                ret = ret ? ret + curr: curr;
                ptr += MAX_CHUNK;
                length -= MAX_CHUNK
            }
            return ret
        }
        return UTF8ToString(ptr)
    }
    var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
    function UTF8ArrayToString(u8Array, idx) {
        var endPtr = idx;
        while (u8Array[endPtr])++endPtr;
        if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
            return UTF8Decoder.decode(u8Array.subarray(idx, endPtr))
        } else {
            var u0, u1, u2, u3, u4, u5;
            var str = "";
            while (1) {
                u0 = u8Array[idx++];
                if (!u0) return str;
                if (! (u0 & 128)) {
                    str += String.fromCharCode(u0);
                    continue
                }
                u1 = u8Array[idx++] & 63;
                if ((u0 & 224) == 192) {
                    str += String.fromCharCode((u0 & 31) << 6 | u1);
                    continue
                }
                u2 = u8Array[idx++] & 63;
                if ((u0 & 240) == 224) {
                    u0 = (u0 & 15) << 12 | u1 << 6 | u2
                } else {
                    u3 = u8Array[idx++] & 63;
                    if ((u0 & 248) == 240) {
                        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
                    } else {
                        u4 = u8Array[idx++] & 63;
                        if ((u0 & 252) == 248) {
                            u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
                        } else {
                            u5 = u8Array[idx++] & 63;
                            u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
                        }
                    }
                }
                if (u0 < 65536) {
                    str += String.fromCharCode(u0)
                } else {
                    var ch = u0 - 65536;
                    str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
                }
            }
        }
    }
    function UTF8ToString(ptr) {
        return UTF8ArrayToString(HEAPU8, ptr)
    }
    function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
        if (! (maxBytesToWrite > 0)) return 0;
        var startIdx = outIdx;
        var endIdx = outIdx + maxBytesToWrite - 1;
        for (var i = 0; i < str.length; ++i) {
            var u = str.charCodeAt(i);
            if (u >= 55296 && u <= 57343) {
                var u1 = str.charCodeAt(++i);
                u = 65536 + ((u & 1023) << 10) | u1 & 1023
            }
            if (u <= 127) {
                if (outIdx >= endIdx) break;
                outU8Array[outIdx++] = u
            } else if (u <= 2047) {
                if (outIdx + 1 >= endIdx) break;
                outU8Array[outIdx++] = 192 | u >> 6;
                outU8Array[outIdx++] = 128 | u & 63
            } else if (u <= 65535) {
                if (outIdx + 2 >= endIdx) break;
                outU8Array[outIdx++] = 224 | u >> 12;
                outU8Array[outIdx++] = 128 | u >> 6 & 63;
                outU8Array[outIdx++] = 128 | u & 63
            } else if (u <= 2097151) {
                if (outIdx + 3 >= endIdx) break;
                outU8Array[outIdx++] = 240 | u >> 18;
                outU8Array[outIdx++] = 128 | u >> 12 & 63;
                outU8Array[outIdx++] = 128 | u >> 6 & 63;
                outU8Array[outIdx++] = 128 | u & 63
            } else if (u <= 67108863) {
                if (outIdx + 4 >= endIdx) break;
                outU8Array[outIdx++] = 248 | u >> 24;
                outU8Array[outIdx++] = 128 | u >> 18 & 63;
                outU8Array[outIdx++] = 128 | u >> 12 & 63;
                outU8Array[outIdx++] = 128 | u >> 6 & 63;
                outU8Array[outIdx++] = 128 | u & 63
            } else {
                if (outIdx + 5 >= endIdx) break;
                outU8Array[outIdx++] = 252 | u >> 30;
                outU8Array[outIdx++] = 128 | u >> 24 & 63;
                outU8Array[outIdx++] = 128 | u >> 18 & 63;
                outU8Array[outIdx++] = 128 | u >> 12 & 63;
                outU8Array[outIdx++] = 128 | u >> 6 & 63;
                outU8Array[outIdx++] = 128 | u & 63
            }
        }
        outU8Array[outIdx] = 0;
        return outIdx - startIdx
    }
    function stringToUTF8(str, outPtr, maxBytesToWrite) {
        return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
    }
    function lengthBytesUTF8(str) {
        var len = 0;
        for (var i = 0; i < str.length; ++i) {
            var u = str.charCodeAt(i);
            if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
            if (u <= 127) {++len
            } else if (u <= 2047) {
                len += 2
            } else if (u <= 65535) {
                len += 3
            } else if (u <= 2097151) {
                len += 4
            } else if (u <= 67108863) {
                len += 5
            } else {
                len += 6
            }
        }
        return len
    }
    var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;
    function demangle(func) {
        return func
    }
    function demangleAll(text) {
        var regex = /__Z[\w\d_]+/g;
        return text.replace(regex, (function(x) {
            var y = demangle(x);
            return x === y ? x: y + " [" + x + "]"
        }))
    }
    function jsStackTrace() {
        var err = new Error;
        if (!err.stack) {
            try {
                throw new Error(0)
            } catch(e) {
                err = e
            }
            if (!err.stack) {
                return "(no stack trace available)"
            }
        }
        return err.stack.toString()
    }
    var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateGlobalBufferViews() {
        Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
        Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
        Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
        Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
        Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
        Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
        Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
        Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer)
    }
    var STATIC_BASE, STATICTOP, staticSealed;
    var STACK_BASE, STACKTOP, STACK_MAX;
    var DYNAMIC_BASE, DYNAMICTOP_PTR;
    STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
    staticSealed = false;
    function abortOnCannotGrowMemory() {
        abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")
    }
    function enlargeMemory() {
        abortOnCannotGrowMemory()
    }
    var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
    var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
    if (TOTAL_MEMORY < TOTAL_STACK) err("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
    if (Module["buffer"]) {
        buffer = Module["buffer"]
    } else {
        {
            buffer = new ArrayBuffer(TOTAL_MEMORY)
        }
        Module["buffer"] = buffer
    }
    updateGlobalBufferViews();
    function getTotalMemory() {
        return TOTAL_MEMORY
    }
    function callRuntimeCallbacks(callbacks) {
        while (callbacks.length > 0) {
            var callback = callbacks.shift();
            if (typeof callback == "function") {
                callback();
                continue
            }
            var func = callback.func;
            if (typeof func === "number") {
                if (callback.arg === undefined) {
                    Module["dynCall_v"](func)
                } else {
                    Module["dynCall_vi"](func, callback.arg)
                }
            } else {
                func(callback.arg === undefined ? null: callback.arg)
            }
        }
    }
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATMAIN__ = [];
    var __ATEXIT__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    var runtimeExited = false;
    function preRun() {
        if (Module["preRun"]) {
            if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
            while (Module["preRun"].length) {
                addOnPreRun(Module["preRun"].shift())
            }
        }
        callRuntimeCallbacks(__ATPRERUN__)
    }
    function ensureInitRuntime() {
        if (runtimeInitialized) return;
        runtimeInitialized = true;
        callRuntimeCallbacks(__ATINIT__)
    }
    function preMain() {
        callRuntimeCallbacks(__ATMAIN__)
    }
    function exitRuntime() {
        callRuntimeCallbacks(__ATEXIT__);
        runtimeExited = true
    }
    function postRun() {
        if (Module["postRun"]) {
            if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
            while (Module["postRun"].length) {
                addOnPostRun(Module["postRun"].shift())
            }
        }
        callRuntimeCallbacks(__ATPOSTRUN__)
    }
    function addOnPreRun(cb) {
        __ATPRERUN__.unshift(cb)
    }
    function addOnPostRun(cb) {
        __ATPOSTRUN__.unshift(cb)
    }
    function writeArrayToMemory(array, buffer) {
        HEAP8.set(array, buffer)
    }
    function writeAsciiToMemory(str, buffer, dontAddNull) {
        for (var i = 0; i < str.length; ++i) {
            HEAP8[buffer++>>0] = str.charCodeAt(i)
        }
        if (!dontAddNull) HEAP8[buffer >> 0] = 0
    }
    var Math_abs = Math.abs;
    var Math_ceil = Math.ceil;
    var Math_floor = Math.floor;
    var Math_min = Math.min;
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    function addRunDependency(id) {
        runDependencies++;
        if (Module["monitorRunDependencies"]) {
            Module["monitorRunDependencies"](runDependencies)
        }
    }
    function removeRunDependency(id) {
        runDependencies--;
        if (Module["monitorRunDependencies"]) {
            Module["monitorRunDependencies"](runDependencies)
        }
        if (runDependencies == 0) {
            if (runDependencyWatcher !== null) {
                clearInterval(runDependencyWatcher);
                runDependencyWatcher = null
            }
            if (dependenciesFulfilled) {
                var callback = dependenciesFulfilled;
                dependenciesFulfilled = null;
                callback()
            }
        }
    }
    Module["preloadedImages"] = {};
    Module["preloadedAudios"] = {};
    var memoryInitializer = null;
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
        return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0
    }
    STATIC_BASE = GLOBAL_BASE;
    STATICTOP = STATIC_BASE + 2992;
    __ATINIT__.push({
        func: (function() {
            __GLOBAL__sub_I_demo01_cpp()
        })
    },
    {
        func: (function() {
            __GLOBAL__sub_I_bind_cpp()
        })
    });
    memoryInitializer = "data:application/octet-stream;base64,8AEAAM8CAABcAgAA2AIAAAAAAAAIAAAAXAIAAOICAAABAAAACAAAAPABAAA0AwAAeAIAAPUCAAAAAAAAAQAAADAAAAAAAAAAeAIAAE8IAAAAAAAAAQAAADAAAAAAAAAAeAIAABAIAAAAAAAAAQAAADAAAAAAAAAA8AEAAP0HAADwAQAA3gcAAPABAAC/BwAA8AEAAKAHAADwAQAAgQcAAPABAABiBwAA8AEAAEMHAADwAQAAJAcAAPABAAAFBwAA8AEAAOYGAADwAQAAxwYAAPABAACoBgAA8AEAAIkGAAAYAgAA4QgAAPgAAAAAAAAAGAIAAI4IAAAIAQAAAAAAAPABAACvCAAAGAIAALwIAADoAAAAAAAAABgCAAAnCQAA+AAAAAAAAAAYAgAAAwkAACABAAAAAAAAGAIAAEkJAAD4AAAAAAAAAEACAABxCQAAQAIAAHMJAABAAgAAdgkAAEACAAB4CQAAQAIAAHoJAABAAgAAfAkAAEACAAB+CQAAQAIAAIAJAABAAgAAggkAAEACAACECQAAQAIAAIYJAABAAgAAiAkAAEACAACKCQAAQAIAAIwJAAAYAgAAjgkAAOgAAAAAAAAAEAAAAJABAAA4AAAAUAEAABAAAAA4AAAAAAAAAOgAAAABAAAAAgAAAAMAAAAEAAAAAQAAAAEAAAABAAAAAQAAAAAAAAAQAQAAAQAAAAUAAAADAAAABAAAAAEAAAACAAAAAgAAAAIAAAAAAAAAQAEAAAEAAAAGAAAAAwAAAAQAAAACAAAAAAAAADABAAABAAAABwAAAAMAAAAEAAAAAwAAAAAAAADAAQAAAQAAAAgAAAADAAAABAAAAAEAAAADAAAAAwAAAAMAAABNeUNsYXNzAGluY3JlbWVudFgAeABnZXRTdHJpbmdGcm9tSW5zdGFuY2UASGVsbG8gV29ybGQAN015Q2xhc3MAUDdNeUNsYXNzAFBLN015Q2xhc3MAaWkAdgB2aQBOU3QzX18yMTJiYXNpY19zdHJpbmdJY05TXzExY2hhcl90cmFpdHNJY0VFTlNfOWFsbG9jYXRvckljRUVFRQBOU3QzX18yMjFfX2Jhc2ljX3N0cmluZ19jb21tb25JTGIxRUVFAGlpaWkAdmlpAGlpaQB2aWlpAHZvaWQAYm9vbABjaGFyAHNpZ25lZCBjaGFyAHVuc2lnbmVkIGNoYXIAc2hvcnQAdW5zaWduZWQgc2hvcnQAaW50AHVuc2lnbmVkIGludABsb25nAHVuc2lnbmVkIGxvbmcAZmxvYXQAZG91YmxlAHN0ZDo6c3RyaW5nAHN0ZDo6YmFzaWNfc3RyaW5nPHVuc2lnbmVkIGNoYXI+AHN0ZDo6d3N0cmluZwBlbXNjcmlwdGVuOjp2YWwAZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8Y2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8c2lnbmVkIGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHNob3J0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBzaG9ydD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBpbnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGxvbmc+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGxvbmc+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludDhfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDhfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDE2X3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVpbnQzMl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxmbG9hdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8ZG91YmxlPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxsb25nIGRvdWJsZT4ATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJZUVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWRFRQBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lmRUUATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJbUVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWxFRQBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lqRUUATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaUVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SXRFRQBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lzRUUATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaEVFAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWFFRQBOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0ljRUUATjEwZW1zY3JpcHRlbjN2YWxFAE5TdDNfXzIxMmJhc2ljX3N0cmluZ0l3TlNfMTFjaGFyX3RyYWl0c0l3RUVOU185YWxsb2NhdG9ySXdFRUVFAE5TdDNfXzIxMmJhc2ljX3N0cmluZ0loTlNfMTFjaGFyX3RyYWl0c0loRUVOU185YWxsb2NhdG9ySWhFRUVFAE4xMF9fY3h4YWJpdjExNl9fc2hpbV90eXBlX2luZm9FAFN0OXR5cGVfaW5mbwBOMTBfX2N4eGFiaXYxMjBfX3NpX2NsYXNzX3R5cGVfaW5mb0UATjEwX19jeHhhYml2MTE3X19jbGFzc190eXBlX2luZm9FAE4xMF9fY3h4YWJpdjExOV9fcG9pbnRlcl90eXBlX2luZm9FAE4xMF9fY3h4YWJpdjExN19fcGJhc2VfdHlwZV9pbmZvRQBOMTBfX2N4eGFiaXYxMjNfX2Z1bmRhbWVudGFsX3R5cGVfaW5mb0UAdgBEbgBiAGMAaABhAHMAdABpAGoAbABtAGYAZABOMTBfX2N4eGFiaXYxMjFfX3ZtaV9jbGFzc190eXBlX2luZm9F";
    var tempDoublePtr = STATICTOP;
    STATICTOP += 16;
    function __ZSt18uncaught_exceptionv() {
        return !! __ZSt18uncaught_exceptionv.uncaught_exception
    }
    var EXCEPTIONS = {
        last: 0,
        caught: [],
        infos: {},
        deAdjust: (function(adjusted) {
            if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
            for (var key in EXCEPTIONS.infos) {
                var ptr = +key;
                var adj = EXCEPTIONS.infos[ptr].adjusted;
                var len = adj.length;
                for (var i = 0; i < len; i++) {
                    if (adj[i] === adjusted) {
                        return ptr
                    }
                }
            }
            return adjusted
        }),
        addRef: (function(ptr) {
            if (!ptr) return;
            var info = EXCEPTIONS.infos[ptr];
            info.refcount++
        }),
        decRef: (function(ptr) {
            if (!ptr) return;
            var info = EXCEPTIONS.infos[ptr];
            assert(info.refcount > 0);
            info.refcount--;
            if (info.refcount === 0 && !info.rethrown) {
                if (info.destructor) {
                    Module["dynCall_vi"](info.destructor, ptr)
                }
                delete EXCEPTIONS.infos[ptr];
                ___cxa_free_exception(ptr)
            }
        }),
        clearRef: (function(ptr) {
            if (!ptr) return;
            var info = EXCEPTIONS.infos[ptr];
            info.refcount = 0
        })
    };
    function ___resumeException(ptr) {
        if (!EXCEPTIONS.last) {
            EXCEPTIONS.last = ptr
        }
        throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch."
    }
    function ___cxa_find_matching_catch() {
        var thrown = EXCEPTIONS.last;
        if (!thrown) {
            return (setTempRet0(0), 0) | 0
        }
        var info = EXCEPTIONS.infos[thrown];
        var throwntype = info.type;
        if (!throwntype) {
            return (setTempRet0(0), thrown) | 0
        }
        var typeArray = Array.prototype.slice.call(arguments);
        var pointer = Module["___cxa_is_pointer_type"](throwntype);
        if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
        HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
        thrown = ___cxa_find_matching_catch.buffer;
        for (var i = 0; i < typeArray.length; i++) {
            if (typeArray[i] && Module["___cxa_can_catch"](typeArray[i], throwntype, thrown)) {
                thrown = HEAP32[thrown >> 2];
                info.adjusted.push(thrown);
                return (setTempRet0(typeArray[i]), thrown) | 0
            }
        }
        thrown = HEAP32[thrown >> 2];
        return (setTempRet0(throwntype), thrown) | 0
    }
    function ___gxx_personality_v0() {}
    function getShiftFromSize(size) {
        switch (size) {
        case 1:
            return 0;
        case 2:
            return 1;
        case 4:
            return 2;
        case 8:
            return 3;
        default:
            throw new TypeError("Unknown type size: " + size)
        }
    }
    function embind_init_charCodes() {
        var codes = new Array(256);
        for (var i = 0; i < 256; ++i) {
            codes[i] = String.fromCharCode(i)
        }
        embind_charCodes = codes
    }
    var embind_charCodes = undefined;
    function readLatin1String(ptr) {
        var ret = "";
        var c = ptr;
        while (HEAPU8[c]) {
            ret += embind_charCodes[HEAPU8[c++]]
        }
        return ret
    }
    var awaitingDependencies = {};
    var registeredTypes = {};
    var typeDependencies = {};
    var char_0 = 48;
    var char_9 = 57;
    function makeLegalFunctionName(name) {
        if (undefined === name) {
            return "_unknown"
        }
        name = name.replace(/[^a-zA-Z0-9_]/g, "$");
        var f = name.charCodeAt(0);
        if (f >= char_0 && f <= char_9) {
            return "_" + name
        } else {
            return name
        }
    }
    function createNamedFunction(name, body) {
        name = makeLegalFunctionName(name);
        return (new Function("body", "return function " + name + "() {\n" + '    "use strict";' + "    return body.apply(this, arguments);\n" + "};\n"))(body)
    }
    function extendError(baseErrorType, errorName) {
        var errorClass = createNamedFunction(errorName, (function(message) {
            this.name = errorName;
            this.message = message;
            var stack = (new Error(message)).stack;
            if (stack !== undefined) {
                this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "")
            }
        }));
        errorClass.prototype = Object.create(baseErrorType.prototype);
        errorClass.prototype.constructor = errorClass;
        errorClass.prototype.toString = (function() {
            if (this.message === undefined) {
                return this.name
            } else {
                return this.name + ": " + this.message
            }
        });
        return errorClass
    }
    var BindingError = undefined;
    function throwBindingError(message) {
        throw new BindingError(message)
    }
    var InternalError = undefined;
    function throwInternalError(message) {
        throw new InternalError(message)
    }
    function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
        myTypes.forEach((function(type) {
            typeDependencies[type] = dependentTypes
        }));
        function onComplete(typeConverters) {
            var myTypeConverters = getTypeConverters(typeConverters);
            if (myTypeConverters.length !== myTypes.length) {
                throwInternalError("Mismatched type converter count")
            }
            for (var i = 0; i < myTypes.length; ++i) {
                registerType(myTypes[i], myTypeConverters[i])
            }
        }
        var typeConverters = new Array(dependentTypes.length);
        var unregisteredTypes = [];
        var registered = 0;
        dependentTypes.forEach((function(dt, i) {
            if (registeredTypes.hasOwnProperty(dt)) {
                typeConverters[i] = registeredTypes[dt]
            } else {
                unregisteredTypes.push(dt);
                if (!awaitingDependencies.hasOwnProperty(dt)) {
                    awaitingDependencies[dt] = []
                }
                awaitingDependencies[dt].push((function() {
                    typeConverters[i] = registeredTypes[dt]; ++registered;
                    if (registered === unregisteredTypes.length) {
                        onComplete(typeConverters)
                    }
                }))
            }
        }));
        if (0 === unregisteredTypes.length) {
            onComplete(typeConverters)
        }
    }
    function registerType(rawType, registeredInstance, options) {
        options = options || {};
        if (! ("argPackAdvance" in registeredInstance)) {
            throw new TypeError("registerType registeredInstance requires argPackAdvance")
        }
        var name = registeredInstance.name;
        if (!rawType) {
            throwBindingError('type "' + name + '" must have a positive integer typeid pointer')
        }
        if (registeredTypes.hasOwnProperty(rawType)) {
            if (options.ignoreDuplicateRegistrations) {
                return
            } else {
                throwBindingError("Cannot register type '" + name + "' twice")
            }
        }
        registeredTypes[rawType] = registeredInstance;
        delete typeDependencies[rawType];
        if (awaitingDependencies.hasOwnProperty(rawType)) {
            var callbacks = awaitingDependencies[rawType];
            delete awaitingDependencies[rawType];
            callbacks.forEach((function(cb) {
                cb()
            }))
        }
    }
    function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
        var shift = getShiftFromSize(size);
        name = readLatin1String(name);
        registerType(rawType, {
            name: name,
            "fromWireType": (function(wt) {
                return !! wt
            }),
            "toWireType": (function(destructors, o) {
                return o ? trueValue: falseValue
            }),
            "argPackAdvance": 8,
            "readValueFromPointer": (function(pointer) {
                var heap;
                if (size === 1) {
                    heap = HEAP8
                } else if (size === 2) {
                    heap = HEAP16
                } else if (size === 4) {
                    heap = HEAP32
                } else {
                    throw new TypeError("Unknown boolean type size: " + name)
                }
                return this["fromWireType"](heap[pointer >> shift])
            }),
            destructorFunction: null
        })
    }
    function ClassHandle_isAliasOf(other) {
        if (! (this instanceof ClassHandle)) {
            return false
        }
        if (! (other instanceof ClassHandle)) {
            return false
        }
        var leftClass = this.$$.ptrType.registeredClass;
        var left = this.$$.ptr;
        var rightClass = other.$$.ptrType.registeredClass;
        var right = other.$$.ptr;
        while (leftClass.baseClass) {
            left = leftClass.upcast(left);
            leftClass = leftClass.baseClass
        }
        while (rightClass.baseClass) {
            right = rightClass.upcast(right);
            rightClass = rightClass.baseClass
        }
        return leftClass === rightClass && left === right
    }
    function shallowCopyInternalPointer(o) {
        return {
            count: o.count,
            deleteScheduled: o.deleteScheduled,
            preservePointerOnDelete: o.preservePointerOnDelete,
            ptr: o.ptr,
            ptrType: o.ptrType,
            smartPtr: o.smartPtr,
            smartPtrType: o.smartPtrType
        }
    }
    function throwInstanceAlreadyDeleted(obj) {
        function getInstanceTypeName(handle) {
            return handle.$$.ptrType.registeredClass.name
        }
        throwBindingError(getInstanceTypeName(obj) + " instance already deleted")
    }
    function ClassHandle_clone() {
        if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this)
        }
        if (this.$$.preservePointerOnDelete) {
            this.$$.count.value += 1;
            return this
        } else {
            var clone = Object.create(Object.getPrototypeOf(this), {
                $$: {
                    value: shallowCopyInternalPointer(this.$$)
                }
            });
            clone.$$.count.value += 1;
            clone.$$.deleteScheduled = false;
            return clone
        }
    }
    function runDestructor(handle) {
        var $$ = handle.$$;
        if ($$.smartPtr) {
            $$.smartPtrType.rawDestructor($$.smartPtr)
        } else {
            $$.ptrType.registeredClass.rawDestructor($$.ptr)
        }
    }
    function ClassHandle_delete() {
        if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this)
        }
        if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
            throwBindingError("Object already scheduled for deletion")
        }
        this.$$.count.value -= 1;
        var toDelete = 0 === this.$$.count.value;
        if (toDelete) {
            runDestructor(this)
        }
        if (!this.$$.preservePointerOnDelete) {
            this.$$.smartPtr = undefined;
            this.$$.ptr = undefined
        }
    }
    function ClassHandle_isDeleted() {
        return ! this.$$.ptr
    }
    var delayFunction = undefined;
    var deletionQueue = [];
    function flushPendingDeletes() {
        while (deletionQueue.length) {
            var obj = deletionQueue.pop();
            obj.$$.deleteScheduled = false;
            obj["delete"]()
        }
    }
    function ClassHandle_deleteLater() {
        if (!this.$$.ptr) {
            throwInstanceAlreadyDeleted(this)
        }
        if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
            throwBindingError("Object already scheduled for deletion")
        }
        deletionQueue.push(this);
        if (deletionQueue.length === 1 && delayFunction) {
            delayFunction(flushPendingDeletes)
        }
        this.$$.deleteScheduled = true;
        return this
    }
    function init_ClassHandle() {
        ClassHandle.prototype["isAliasOf"] = ClassHandle_isAliasOf;
        ClassHandle.prototype["clone"] = ClassHandle_clone;
        ClassHandle.prototype["delete"] = ClassHandle_delete;
        ClassHandle.prototype["isDeleted"] = ClassHandle_isDeleted;
        ClassHandle.prototype["deleteLater"] = ClassHandle_deleteLater
    }
    function ClassHandle() {}
    var registeredPointers = {};
    function ensureOverloadTable(proto, methodName, humanName) {
        if (undefined === proto[methodName].overloadTable) {
            var prevFunc = proto[methodName];
            proto[methodName] = (function() {
                if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
                    throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!")
                }
                return proto[methodName].overloadTable[arguments.length].apply(this, arguments)
            });
            proto[methodName].overloadTable = [];
            proto[methodName].overloadTable[prevFunc.argCount] = prevFunc
        }
    }
    function exposePublicSymbol(name, value, numArguments) {
        if (Module.hasOwnProperty(name)) {
            if (undefined === numArguments || undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments]) {
                throwBindingError("Cannot register public name '" + name + "' twice")
            }
            ensureOverloadTable(Module, name, name);
            if (Module.hasOwnProperty(numArguments)) {
                throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!")
            }
            Module[name].overloadTable[numArguments] = value
        } else {
            Module[name] = value;
            if (undefined !== numArguments) {
                Module[name].numArguments = numArguments
            }
        }
    }
    function RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast) {
        this.name = name;
        this.constructor = constructor;
        this.instancePrototype = instancePrototype;
        this.rawDestructor = rawDestructor;
        this.baseClass = baseClass;
        this.getActualType = getActualType;
        this.upcast = upcast;
        this.downcast = downcast;
        this.pureVirtualFunctions = []
    }
    function upcastPointer(ptr, ptrClass, desiredClass) {
        while (ptrClass !== desiredClass) {
            if (!ptrClass.upcast) {
                throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name)
            }
            ptr = ptrClass.upcast(ptr);
            ptrClass = ptrClass.baseClass
        }
        return ptr
    }
    function constNoSmartPtrRawPointerToWireType(destructors, handle) {
        if (handle === null) {
            if (this.isReference) {
                throwBindingError("null is not a valid " + this.name)
            }
            return 0
        }
        if (!handle.$$) {
            throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name)
        }
        if (!handle.$$.ptr) {
            throwBindingError("Cannot pass deleted object as a pointer of type " + this.name)
        }
        var handleClass = handle.$$.ptrType.registeredClass;
        var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
        return ptr
    }
    function genericPointerToWireType(destructors, handle) {
        var ptr;
        if (handle === null) {
            if (this.isReference) {
                throwBindingError("null is not a valid " + this.name)
            }
            if (this.isSmartPointer) {
                ptr = this.rawConstructor();
                if (destructors !== null) {
                    destructors.push(this.rawDestructor, ptr)
                }
                return ptr
            } else {
                return 0
            }
        }
        if (!handle.$$) {
            throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name)
        }
        if (!handle.$$.ptr) {
            throwBindingError("Cannot pass deleted object as a pointer of type " + this.name)
        }
        if (!this.isConst && handle.$$.ptrType.isConst) {
            throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name: handle.$$.ptrType.name) + " to parameter type " + this.name)
        }
        var handleClass = handle.$$.ptrType.registeredClass;
        ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
        if (this.isSmartPointer) {
            if (undefined === handle.$$.smartPtr) {
                throwBindingError("Passing raw pointer to smart pointer is illegal")
            }
            switch (this.sharingPolicy) {
            case 0:
                if (handle.$$.smartPtrType === this) {
                    ptr = handle.$$.smartPtr
                } else {
                    throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name: handle.$$.ptrType.name) + " to parameter type " + this.name)
                }
                break;
            case 1:
                ptr = handle.$$.smartPtr;
                break;
            case 2:
                if (handle.$$.smartPtrType === this) {
                    ptr = handle.$$.smartPtr
                } else {
                    var clonedHandle = handle["clone"]();
                    ptr = this.rawShare(ptr, __emval_register((function() {
                        clonedHandle["delete"]()
                    })));
                    if (destructors !== null) {
                        destructors.push(this.rawDestructor, ptr)
                    }
                }
                break;
            default:
                throwBindingError("Unsupporting sharing policy")
            }
        }
        return ptr
    }
    function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
        if (handle === null) {
            if (this.isReference) {
                throwBindingError("null is not a valid " + this.name)
            }
            return 0
        }
        if (!handle.$$) {
            throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name)
        }
        if (!handle.$$.ptr) {
            throwBindingError("Cannot pass deleted object as a pointer of type " + this.name)
        }
        if (handle.$$.ptrType.isConst) {
            throwBindingError("Cannot convert argument of type " + handle.$$.ptrType.name + " to parameter type " + this.name)
        }
        var handleClass = handle.$$.ptrType.registeredClass;
        var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
        return ptr
    }
    function simpleReadValueFromPointer(pointer) {
        return this["fromWireType"](HEAPU32[pointer >> 2])
    }
    function RegisteredPointer_getPointee(ptr) {
        if (this.rawGetPointee) {
            ptr = this.rawGetPointee(ptr)
        }
        return ptr
    }
    function RegisteredPointer_destructor(ptr) {
        if (this.rawDestructor) {
            this.rawDestructor(ptr)
        }
    }
    function RegisteredPointer_deleteObject(handle) {
        if (handle !== null) {
            handle["delete"]()
        }
    }
    function downcastPointer(ptr, ptrClass, desiredClass) {
        if (ptrClass === desiredClass) {
            return ptr
        }
        if (undefined === desiredClass.baseClass) {
            return null
        }
        var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
        if (rv === null) {
            return null
        }
        return desiredClass.downcast(rv)
    }
    function getInheritedInstanceCount() {
        return Object.keys(registeredInstances).length
    }
    function getLiveInheritedInstances() {
        var rv = [];
        for (var k in registeredInstances) {
            if (registeredInstances.hasOwnProperty(k)) {
                rv.push(registeredInstances[k])
            }
        }
        return rv
    }
    function setDelayFunction(fn) {
        delayFunction = fn;
        if (deletionQueue.length && delayFunction) {
            delayFunction(flushPendingDeletes)
        }
    }
    function init_embind() {
        Module["getInheritedInstanceCount"] = getInheritedInstanceCount;
        Module["getLiveInheritedInstances"] = getLiveInheritedInstances;
        Module["flushPendingDeletes"] = flushPendingDeletes;
        Module["setDelayFunction"] = setDelayFunction
    }
    var registeredInstances = {};
    function getBasestPointer(class_, ptr) {
        if (ptr === undefined) {
            throwBindingError("ptr should not be undefined")
        }
        while (class_.baseClass) {
            ptr = class_.upcast(ptr);
            class_ = class_.baseClass
        }
        return ptr
    }
    function getInheritedInstance(class_, ptr) {
        ptr = getBasestPointer(class_, ptr);
        return registeredInstances[ptr]
    }
    function makeClassHandle(prototype, record) {
        if (!record.ptrType || !record.ptr) {
            throwInternalError("makeClassHandle requires ptr and ptrType")
        }
        var hasSmartPtrType = !!record.smartPtrType;
        var hasSmartPtr = !!record.smartPtr;
        if (hasSmartPtrType !== hasSmartPtr) {
            throwInternalError("Both smartPtrType and smartPtr must be specified")
        }
        record.count = {
            value: 1
        };
        return Object.create(prototype, {
            $$: {
                value: record
            }
        })
    }
    function RegisteredPointer_fromWireType(ptr) {
        var rawPointer = this.getPointee(ptr);
        if (!rawPointer) {
            this.destructor(ptr);
            return null
        }
        var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
        if (undefined !== registeredInstance) {
            if (0 === registeredInstance.$$.count.value) {
                registeredInstance.$$.ptr = rawPointer;
                registeredInstance.$$.smartPtr = ptr;
                return registeredInstance["clone"]()
            } else {
                var rv = registeredInstance["clone"]();
                this.destructor(ptr);
                return rv
            }
        }
        function makeDefaultHandle() {
            if (this.isSmartPointer) {
                return makeClassHandle(this.registeredClass.instancePrototype, {
                    ptrType: this.pointeeType,
                    ptr: rawPointer,
                    smartPtrType: this,
                    smartPtr: ptr
                })
            } else {
                return makeClassHandle(this.registeredClass.instancePrototype, {
                    ptrType: this,
                    ptr: ptr
                })
            }
        }
        var actualType = this.registeredClass.getActualType(rawPointer);
        var registeredPointerRecord = registeredPointers[actualType];
        if (!registeredPointerRecord) {
            return makeDefaultHandle.call(this)
        }
        var toType;
        if (this.isConst) {
            toType = registeredPointerRecord.constPointerType
        } else {
            toType = registeredPointerRecord.pointerType
        }
        var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
        if (dp === null) {
            return makeDefaultHandle.call(this)
        }
        if (this.isSmartPointer) {
            return makeClassHandle(toType.registeredClass.instancePrototype, {
                ptrType: toType,
                ptr: dp,
                smartPtrType: this,
                smartPtr: ptr
            })
        } else {
            return makeClassHandle(toType.registeredClass.instancePrototype, {
                ptrType: toType,
                ptr: dp
            })
        }
    }
    function init_RegisteredPointer() {
        RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
        RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
        RegisteredPointer.prototype["argPackAdvance"] = 8;
        RegisteredPointer.prototype["readValueFromPointer"] = simpleReadValueFromPointer;
        RegisteredPointer.prototype["deleteObject"] = RegisteredPointer_deleteObject;
        RegisteredPointer.prototype["fromWireType"] = RegisteredPointer_fromWireType
    }
    function RegisteredPointer(name, registeredClass, isReference, isConst, isSmartPointer, pointeeType, sharingPolicy, rawGetPointee, rawConstructor, rawShare, rawDestructor) {
        this.name = name;
        this.registeredClass = registeredClass;
        this.isReference = isReference;
        this.isConst = isConst;
        this.isSmartPointer = isSmartPointer;
        this.pointeeType = pointeeType;
        this.sharingPolicy = sharingPolicy;
        this.rawGetPointee = rawGetPointee;
        this.rawConstructor = rawConstructor;
        this.rawShare = rawShare;
        this.rawDestructor = rawDestructor;
        if (!isSmartPointer && registeredClass.baseClass === undefined) {
            if (isConst) {
                this["toWireType"] = constNoSmartPtrRawPointerToWireType;
                this.destructorFunction = null
            } else {
                this["toWireType"] = nonConstNoSmartPtrRawPointerToWireType;
                this.destructorFunction = null
            }
        } else {
            this["toWireType"] = genericPointerToWireType
        }
    }
    function replacePublicSymbol(name, value, numArguments) {
        if (!Module.hasOwnProperty(name)) {
            throwInternalError("Replacing nonexistant public symbol")
        }
        if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
            Module[name].overloadTable[numArguments] = value
        } else {
            Module[name] = value;
            Module[name].argCount = numArguments
        }
    }
    function embind__requireFunction(signature, rawFunction) {
        signature = readLatin1String(signature);
        function makeDynCaller(dynCall) {
            var args = [];
            for (var i = 1; i < signature.length; ++i) {
                args.push("a" + i)
            }
            var name = "dynCall_" + signature + "_" + rawFunction;
            var body = "return function " + name + "(" + args.join(", ") + ") {\n";
            body += "    return dynCall(rawFunction" + (args.length ? ", ": "") + args.join(", ") + ");\n";
            body += "};\n";
            return (new Function("dynCall", "rawFunction", body))(dynCall, rawFunction)
        }
        var fp;
        if (Module["FUNCTION_TABLE_" + signature] !== undefined) {
            fp = Module["FUNCTION_TABLE_" + signature][rawFunction]
        } else if (typeof FUNCTION_TABLE !== "undefined") {
            fp = FUNCTION_TABLE[rawFunction]
        } else {
            var dc = Module["dynCall_" + signature];
            if (dc === undefined) {
                dc = Module["dynCall_" + signature.replace(/f/g, "d")];
                if (dc === undefined) {
                    throwBindingError("No dynCall invoker for signature: " + signature)
                }
            }
            fp = makeDynCaller(dc)
        }
        if (typeof fp !== "function") {
            throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction)
        }
        return fp
    }
    var UnboundTypeError = undefined;
    function getTypeName(type) {
        var ptr = ___getTypeName(type);
        var rv = readLatin1String(ptr);
        _free(ptr);
        return rv
    }
    function throwUnboundTypeError(message, types) {
        var unboundTypes = [];
        var seen = {};
        function visit(type) {
            if (seen[type]) {
                return
            }
            if (registeredTypes[type]) {
                return
            }
            if (typeDependencies[type]) {
                typeDependencies[type].forEach(visit);
                return
            }
            unboundTypes.push(type);
            seen[type] = true
        }
        types.forEach(visit);
        throw new UnboundTypeError(message + ": " + unboundTypes.map(getTypeName).join([", "]))
    }
    function __embind_register_class(rawType, rawPointerType, rawConstPointerType, baseClassRawType, getActualTypeSignature, getActualType, upcastSignature, upcast, downcastSignature, downcast, name, destructorSignature, rawDestructor) {
        name = readLatin1String(name);
        getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
        if (upcast) {
            upcast = embind__requireFunction(upcastSignature, upcast)
        }
        if (downcast) {
            downcast = embind__requireFunction(downcastSignature, downcast)
        }
        rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
        var legalFunctionName = makeLegalFunctionName(name);
        exposePublicSymbol(legalFunctionName, (function() {
            throwUnboundTypeError("Cannot construct " + name + " due to unbound types", [baseClassRawType])
        }));
        whenDependentTypesAreResolved([rawType, rawPointerType, rawConstPointerType], baseClassRawType ? [baseClassRawType] : [], (function(base) {
            base = base[0];
            var baseClass;
            var basePrototype;
            if (baseClassRawType) {
                baseClass = base.registeredClass;
                basePrototype = baseClass.instancePrototype
            } else {
                basePrototype = ClassHandle.prototype
            }
            var constructor = createNamedFunction(legalFunctionName, (function() {
                if (Object.getPrototypeOf(this) !== instancePrototype) {
                    throw new BindingError("Use 'new' to construct " + name)
                }
                if (undefined === registeredClass.constructor_body) {
                    throw new BindingError(name + " has no accessible constructor")
                }
                var body = registeredClass.constructor_body[arguments.length];
                if (undefined === body) {
                    throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!")
                }
                return body.apply(this, arguments)
            }));
            var instancePrototype = Object.create(basePrototype, {
                constructor: {
                    value: constructor
                }
            });
            constructor.prototype = instancePrototype;
            var registeredClass = new RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast);
            var referenceConverter = new RegisteredPointer(name, registeredClass, true, false, false);
            var pointerConverter = new RegisteredPointer(name + "*", registeredClass, false, false, false);
            var constPointerConverter = new RegisteredPointer(name + " const*", registeredClass, false, true, false);
            registeredPointers[rawType] = {
                pointerType: pointerConverter,
                constPointerType: constPointerConverter
            };
            replacePublicSymbol(legalFunctionName, constructor);
            return [referenceConverter, pointerConverter, constPointerConverter]
        }))
    }
    function new_(constructor, argumentList) {
        if (! (constructor instanceof Function)) {
            throw new TypeError("new_ called with constructor type " + typeof constructor + " which is not a function")
        }
        var dummy = createNamedFunction(constructor.name || "unknownFunctionName", (function() {}));
        dummy.prototype = constructor.prototype;
        var obj = new dummy;
        var r = constructor.apply(obj, argumentList);
        return r instanceof Object ? r: obj
    }
    function runDestructors(destructors) {
        while (destructors.length) {
            var ptr = destructors.pop();
            var del = destructors.pop();
            del(ptr)
        }
    }
    function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
        var argCount = argTypes.length;
        if (argCount < 2) {
            throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!")
        }
        var isClassMethodFunc = argTypes[1] !== null && classType !== null;
        var needsDestructorStack = false;
        for (var i = 1; i < argTypes.length; ++i) {
            if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
                needsDestructorStack = true;
                break
            }
        }
        var returns = argTypes[0].name !== "void";
        var argsList = "";
        var argsListWired = "";
        for (var i = 0; i < argCount - 2; ++i) {
            argsList += (i !== 0 ? ", ": "") + "arg" + i;
            argsListWired += (i !== 0 ? ", ": "") + "arg" + i + "Wired"
        }
        var invokerFnBody = "return function " + makeLegalFunctionName(humanName) + "(" + argsList + ") {\n" + "if (arguments.length !== " + (argCount - 2) + ") {\n" + "throwBindingError('function " + humanName + " called with ' + arguments.length + ' arguments, expected " + (argCount - 2) + " args!');\n" + "}\n";
        if (needsDestructorStack) {
            invokerFnBody += "var destructors = [];\n"
        }
        var dtorStack = needsDestructorStack ? "destructors": "null";
        var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
        var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
        if (isClassMethodFunc) {
            invokerFnBody += "var thisWired = classParam.toWireType(" + dtorStack + ", this);\n"
        }
        for (var i = 0; i < argCount - 2; ++i) {
            invokerFnBody += "var arg" + i + "Wired = argType" + i + ".toWireType(" + dtorStack + ", arg" + i + "); // " + argTypes[i + 2].name + "\n";
            args1.push("argType" + i);
            args2.push(argTypes[i + 2])
        }
        if (isClassMethodFunc) {
            argsListWired = "thisWired" + (argsListWired.length > 0 ? ", ": "") + argsListWired
        }
        invokerFnBody += (returns ? "var rv = ": "") + "invoker(fn" + (argsListWired.length > 0 ? ", ": "") + argsListWired + ");\n";
        if (needsDestructorStack) {
            invokerFnBody += "runDestructors(destructors);\n"
        } else {
            for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
                var paramName = i === 1 ? "thisWired": "arg" + (i - 2) + "Wired";
                if (argTypes[i].destructorFunction !== null) {
                    invokerFnBody += paramName + "_dtor(" + paramName + "); // " + argTypes[i].name + "\n";
                    args1.push(paramName + "_dtor");
                    args2.push(argTypes[i].destructorFunction)
                }
            }
        }
        if (returns) {
            invokerFnBody += "var ret = retType.fromWireType(rv);\n" + "return ret;\n"
        } else {}
        invokerFnBody += "}\n";
        args1.push(invokerFnBody);
        var invokerFunction = new_(Function, args1).apply(null, args2);
        return invokerFunction
    }
    function heap32VectorToArray(count, firstElement) {
        var array = [];
        for (var i = 0; i < count; i++) {
            array.push(HEAP32[(firstElement >> 2) + i])
        }
        return array
    }
    function __embind_register_class_class_function(rawClassType, methodName, argCount, rawArgTypesAddr, invokerSignature, rawInvoker, fn) {
        var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
        methodName = readLatin1String(methodName);
        rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
        whenDependentTypesAreResolved([], [rawClassType], (function(classType) {
            classType = classType[0];
            var humanName = classType.name + "." + methodName;
            function unboundTypesHandler() {
                throwUnboundTypeError("Cannot call " + humanName + " due to unbound types", rawArgTypes)
            }
            var proto = classType.registeredClass.constructor;
            if (undefined === proto[methodName]) {
                unboundTypesHandler.argCount = argCount - 1;
                proto[methodName] = unboundTypesHandler
            } else {
                ensureOverloadTable(proto, methodName, humanName);
                proto[methodName].overloadTable[argCount - 1] = unboundTypesHandler
            }
            whenDependentTypesAreResolved([], rawArgTypes, (function(argTypes) {
                var invokerArgsArray = [argTypes[0], null].concat(argTypes.slice(1));
                var func = craftInvokerFunction(humanName, invokerArgsArray, null, rawInvoker, fn);
                if (undefined === proto[methodName].overloadTable) {
                    func.argCount = argCount - 1;
                    proto[methodName] = func
                } else {
                    proto[methodName].overloadTable[argCount - 1] = func
                }
                return []
            }));
            return []
        }))
    }
    function __embind_register_class_constructor(rawClassType, argCount, rawArgTypesAddr, invokerSignature, invoker, rawConstructor) {
        var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
        invoker = embind__requireFunction(invokerSignature, invoker);
        whenDependentTypesAreResolved([], [rawClassType], (function(classType) {
            classType = classType[0];
            var humanName = "constructor " + classType.name;
            if (undefined === classType.registeredClass.constructor_body) {
                classType.registeredClass.constructor_body = []
            }
            if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
                throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount - 1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!")
            }
            classType.registeredClass.constructor_body[argCount - 1] = function unboundTypeHandler() {
                throwUnboundTypeError("Cannot construct " + classType.name + " due to unbound types", rawArgTypes)
            };
            whenDependentTypesAreResolved([], rawArgTypes, (function(argTypes) {
                classType.registeredClass.constructor_body[argCount - 1] = function constructor_body() {
                    if (arguments.length !== argCount - 1) {
                        throwBindingError(humanName + " called with " + arguments.length + " arguments, expected " + (argCount - 1))
                    }
                    var destructors = [];
                    var args = new Array(argCount);
                    args[0] = rawConstructor;
                    for (var i = 1; i < argCount; ++i) {
                        args[i] = argTypes[i]["toWireType"](destructors, arguments[i - 1])
                    }
                    var ptr = invoker.apply(null, args);
                    runDestructors(destructors);
                    return argTypes[0]["fromWireType"](ptr)
                };
                return []
            }));
            return []
        }))
    }
    function __embind_register_class_function(rawClassType, methodName, argCount, rawArgTypesAddr, invokerSignature, rawInvoker, context, isPureVirtual) {
        var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
        methodName = readLatin1String(methodName);
        rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
        whenDependentTypesAreResolved([], [rawClassType], (function(classType) {
            classType = classType[0];
            var humanName = classType.name + "." + methodName;
            if (isPureVirtual) {
                classType.registeredClass.pureVirtualFunctions.push(methodName)
            }
            function unboundTypesHandler() {
                throwUnboundTypeError("Cannot call " + humanName + " due to unbound types", rawArgTypes)
            }
            var proto = classType.registeredClass.instancePrototype;
            var method = proto[methodName];
            if (undefined === method || undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2) {
                unboundTypesHandler.argCount = argCount - 2;
                unboundTypesHandler.className = classType.name;
                proto[methodName] = unboundTypesHandler
            } else {
                ensureOverloadTable(proto, methodName, humanName);
                proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler
            }
            whenDependentTypesAreResolved([], rawArgTypes, (function(argTypes) {
                var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
                if (undefined === proto[methodName].overloadTable) {
                    memberFunction.argCount = argCount - 2;
                    proto[methodName] = memberFunction
                } else {
                    proto[methodName].overloadTable[argCount - 2] = memberFunction
                }
                return []
            }));
            return []
        }))
    }
    function validateThis(this_, classType, humanName) {
        if (! (this_ instanceof Object)) {
            throwBindingError(humanName + ' with invalid "this": ' + this_)
        }
        if (! (this_ instanceof classType.registeredClass.constructor)) {
            throwBindingError(humanName + ' incompatible with "this" of type ' + this_.constructor.name)
        }
        if (!this_.$$.ptr) {
            throwBindingError("cannot call emscripten binding method " + humanName + " on deleted object")
        }
        return upcastPointer(this_.$$.ptr, this_.$$.ptrType.registeredClass, classType.registeredClass)
    }
    function __embind_register_class_property(classType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
        fieldName = readLatin1String(fieldName);
        getter = embind__requireFunction(getterSignature, getter);
        whenDependentTypesAreResolved([], [classType], (function(classType) {
            classType = classType[0];
            var humanName = classType.name + "." + fieldName;
            var desc = {
                get: (function() {
                    throwUnboundTypeError("Cannot access " + humanName + " due to unbound types", [getterReturnType, setterArgumentType])
                }),
                enumerable: true,
                configurable: true
            };
            if (setter) {
                desc.set = (function() {
                    throwUnboundTypeError("Cannot access " + humanName + " due to unbound types", [getterReturnType, setterArgumentType])
                })
            } else {
                desc.set = (function(v) {
                    throwBindingError(humanName + " is a read-only property")
                })
            }
            Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
            whenDependentTypesAreResolved([], setter ? [getterReturnType, setterArgumentType] : [getterReturnType], (function(types) {
                var getterReturnType = types[0];
                var desc = {
                    get: (function() {
                        var ptr = validateThis(this, classType, humanName + " getter");
                        return getterReturnType["fromWireType"](getter(getterContext, ptr))
                    }),
                    enumerable: true
                };
                if (setter) {
                    setter = embind__requireFunction(setterSignature, setter);
                    var setterArgumentType = types[1];
                    desc.set = (function(v) {
                        var ptr = validateThis(this, classType, humanName + " setter");
                        var destructors = [];
                        setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, v));
                        runDestructors(destructors)
                    })
                }
                Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
                return []
            }));
            return []
        }))
    }
    var emval_free_list = [];
    var emval_handle_array = [{},
    {
        value: undefined
    },
    {
        value: null
    },
    {
        value: true
    },
    {
        value: false
    }];
    function __emval_decref(handle) {
        if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
            emval_handle_array[handle] = undefined;
            emval_free_list.push(handle)
        }
    }
    function count_emval_handles() {
        var count = 0;
        for (var i = 5; i < emval_handle_array.length; ++i) {
            if (emval_handle_array[i] !== undefined) {++count
            }
        }
        return count
    }
    function get_first_emval() {
        for (var i = 5; i < emval_handle_array.length; ++i) {
            if (emval_handle_array[i] !== undefined) {
                return emval_handle_array[i]
            }
        }
        return null
    }
    function init_emval() {
        Module["count_emval_handles"] = count_emval_handles;
        Module["get_first_emval"] = get_first_emval
    }
    function __emval_register(value) {
        switch (value) {
        case undefined:
            {
                return 1
            };
        case null:
            {
                return 2
            };
        case true:
            {
                return 3
            };
        case false:
            {
                return 4
            };
        default:
            {
                var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
                emval_handle_array[handle] = {
                    refcount: 1,
                    value: value
                };
                return handle
            }
        }
    }
    function __embind_register_emval(rawType, name) {
        name = readLatin1String(name);
        registerType(rawType, {
            name: name,
            "fromWireType": (function(handle) {
                var rv = emval_handle_array[handle].value;
                __emval_decref(handle);
                return rv
            }),
            "toWireType": (function(destructors, value) {
                return __emval_register(value)
            }),
            "argPackAdvance": 8,
            "readValueFromPointer": simpleReadValueFromPointer,
            destructorFunction: null
        })
    }
    function _embind_repr(v) {
        if (v === null) {
            return "null"
        }
        var t = typeof v;
        if (t === "object" || t === "array" || t === "function") {
            return v.toString()
        } else {
            return "" + v
        }
    }
    function floatReadValueFromPointer(name, shift) {
        switch (shift) {
        case 2:
            return (function(pointer) {
                return this["fromWireType"](HEAPF32[pointer >> 2])
            });
        case 3:
            return (function(pointer) {
                return this["fromWireType"](HEAPF64[pointer >> 3])
            });
        default:
            throw new TypeError("Unknown float type: " + name)
        }
    }
    function __embind_register_float(rawType, name, size) {
        var shift = getShiftFromSize(size);
        name = readLatin1String(name);
        registerType(rawType, {
            name: name,
            "fromWireType": (function(value) {
                return value
            }),
            "toWireType": (function(destructors, value) {
                if (typeof value !== "number" && typeof value !== "boolean") {
                    throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name)
                }
                return value
            }),
            "argPackAdvance": 8,
            "readValueFromPointer": floatReadValueFromPointer(name, shift),
            destructorFunction: null
        })
    }
    function integerReadValueFromPointer(name, shift, signed) {
        switch (shift) {
        case 0:
            return signed ?
            function readS8FromPointer(pointer) {
                return HEAP8[pointer]
            }: function readU8FromPointer(pointer) {
                return HEAPU8[pointer]
            };
        case 1:
            return signed ?
            function readS16FromPointer(pointer) {
                return HEAP16[pointer >> 1]
            }: function readU16FromPointer(pointer) {
                return HEAPU16[pointer >> 1]
            };
        case 2:
            return signed ?
            function readS32FromPointer(pointer) {
                return HEAP32[pointer >> 2]
            }: function readU32FromPointer(pointer) {
                return HEAPU32[pointer >> 2]
            };
        default:
            throw new TypeError("Unknown integer type: " + name)
        }
    }
    function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
        name = readLatin1String(name);
        if (maxRange === -1) {
            maxRange = 4294967295
        }
        var shift = getShiftFromSize(size);
        var fromWireType = (function(value) {
            return value
        });
        if (minRange === 0) {
            var bitshift = 32 - 8 * size;
            fromWireType = (function(value) {
                return value << bitshift >>> bitshift
            })
        }
        var isUnsignedType = name.indexOf("unsigned") != -1;
        registerType(primitiveType, {
            name: name,
            "fromWireType": fromWireType,
            "toWireType": (function(destructors, value) {
                if (typeof value !== "number" && typeof value !== "boolean") {
                    throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name)
                }
                if (value < minRange || value > maxRange) {
                    throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ", " + maxRange + "]!")
                }
                return isUnsignedType ? value >>> 0 : value | 0
            }),
            "argPackAdvance": 8,
            "readValueFromPointer": integerReadValueFromPointer(name, shift, minRange !== 0),
            destructorFunction: null
        })
    }
    function __embind_register_memory_view(rawType, dataTypeIndex, name) {
        var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
        var TA = typeMapping[dataTypeIndex];
        function decodeMemoryView(handle) {
            handle = handle >> 2;
            var heap = HEAPU32;
            var size = heap[handle];
            var data = heap[handle + 1];
            return new TA(heap["buffer"], data, size)
        }
        name = readLatin1String(name);
        registerType(rawType, {
            name: name,
            "fromWireType": decodeMemoryView,
            "argPackAdvance": 8,
            "readValueFromPointer": decodeMemoryView
        },
        {
            ignoreDuplicateRegistrations: true
        })
    }
    function __embind_register_std_string(rawType, name) {
        name = readLatin1String(name);
        var stdStringIsUTF8 = name === "std::string";
        registerType(rawType, {
            name: name,
            "fromWireType": (function(value) {
                var length = HEAPU32[value >> 2];
                var str;
                if (stdStringIsUTF8) {
                    var endChar = HEAPU8[value + 4 + length];
                    var endCharSwap = 0;
                    if (endChar != 0) {
                        endCharSwap = endChar;
                        HEAPU8[value + 4 + length] = 0
                    }
                    var decodeStartPtr = value + 4;
                    for (var i = 0; i <= length; ++i) {
                        var currentBytePtr = value + 4 + i;
                        if (HEAPU8[currentBytePtr] == 0) {
                            var stringSegment = UTF8ToString(decodeStartPtr);
                            if (str === undefined) str = stringSegment;
                            else {
                                str += String.fromCharCode(0);
                                str += stringSegment
                            }
                            decodeStartPtr = currentBytePtr + 1
                        }
                    }
                    if (endCharSwap != 0) HEAPU8[value + 4 + length] = endCharSwap
                } else {
                    var a = new Array(length);
                    for (var i = 0; i < length; ++i) {
                        a[i] = String.fromCharCode(HEAPU8[value + 4 + i])
                    }
                    str = a.join("")
                }
                _free(value);
                return str
            }),
            "toWireType": (function(destructors, value) {
                if (value instanceof ArrayBuffer) {
                    value = new Uint8Array(value)
                }
                var getLength;
                var valueIsOfTypeString = typeof value === "string";
                if (! (valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
                    throwBindingError("Cannot pass non-string to std::string")
                }
                if (stdStringIsUTF8 && valueIsOfTypeString) {
                    getLength = (function() {
                        return lengthBytesUTF8(value)
                    })
                } else {
                    getLength = (function() {
                        return value.length
                    })
                }
                var length = getLength();
                var ptr = _malloc(4 + length + 1);
                HEAPU32[ptr >> 2] = length;
                if (stdStringIsUTF8 && valueIsOfTypeString) {
                    stringToUTF8(value, ptr + 4, length + 1)
                } else {
                    if (valueIsOfTypeString) {
                        for (var i = 0; i < length; ++i) {
                            var charCode = value.charCodeAt(i);
                            if (charCode > 255) {
                                _free(ptr);
                                throwBindingError("String has UTF-16 code units that do not fit in 8 bits")
                            }
                            HEAPU8[ptr + 4 + i] = charCode
                        }
                    } else {
                        for (var i = 0; i < length; ++i) {
                            HEAPU8[ptr + 4 + i] = value[i]
                        }
                    }
                }
                if (destructors !== null) {
                    destructors.push(_free, ptr)
                }
                return ptr
            }),
            "argPackAdvance": 8,
            "readValueFromPointer": simpleReadValueFromPointer,
            destructorFunction: (function(ptr) {
                _free(ptr)
            })
        })
    }
    function __embind_register_std_wstring(rawType, charSize, name) {
        name = readLatin1String(name);
        var getHeap, shift;
        if (charSize === 2) {
            getHeap = (function() {
                return HEAPU16
            });
            shift = 1
        } else if (charSize === 4) {
            getHeap = (function() {
                return HEAPU32
            });
            shift = 2
        }
        registerType(rawType, {
            name: name,
            "fromWireType": (function(value) {
                var HEAP = getHeap();
                var length = HEAPU32[value >> 2];
                var a = new Array(length);
                var start = value + 4 >> shift;
                for (var i = 0; i < length; ++i) {
                    a[i] = String.fromCharCode(HEAP[start + i])
                }
                _free(value);
                return a.join("")
            }),
            "toWireType": (function(destructors, value) {
                var HEAP = getHeap();
                var length = value.length;
                var ptr = _malloc(4 + length * charSize);
                HEAPU32[ptr >> 2] = length;
                var start = ptr + 4 >> shift;
                for (var i = 0; i < length; ++i) {
                    HEAP[start + i] = value.charCodeAt(i)
                }
                if (destructors !== null) {
                    destructors.push(_free, ptr)
                }
                return ptr
            }),
            "argPackAdvance": 8,
            "readValueFromPointer": simpleReadValueFromPointer,
            destructorFunction: (function(ptr) {
                _free(ptr)
            })
        })
    }
    function __embind_register_void(rawType, name) {
        name = readLatin1String(name);
        registerType(rawType, {
            isVoid: true,
            name: name,
            "argPackAdvance": 0,
            "fromWireType": (function() {
                return undefined
            }),
            "toWireType": (function(destructors, o) {
                return undefined
            })
        })
    }
    function _abort() {
        Module["abort"]()
    }
    function _emscripten_memcpy_big(dest, src, num) {
        HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
        return dest
    }
    function ___setErrNo(value) {
        if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
        return value
    }
    embind_init_charCodes();
    BindingError = Module["BindingError"] = extendError(Error, "BindingError");
    InternalError = Module["InternalError"] = extendError(Error, "InternalError");
    init_ClassHandle();
    init_RegisteredPointer();
    init_embind();
    UnboundTypeError = Module["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
    init_emval();
    DYNAMICTOP_PTR = staticAlloc(4);
    STACK_BASE = STACKTOP = alignMemory(STATICTOP);
    STACK_MAX = STACK_BASE + TOTAL_STACK;
    DYNAMIC_BASE = alignMemory(STACK_MAX);
    HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
    staticSealed = true;
    var ASSERTIONS = false;
    function intArrayToString(array) {
        var ret = [];
        for (var i = 0; i < array.length; i++) {
            var chr = array[i];
            if (chr > 255) {
                if (ASSERTIONS) {
                    assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i + " not in 0x00-0xFF.")
                }
                chr &= 255
            }
            ret.push(String.fromCharCode(chr))
        }
        return ret.join("")
    }
    var decodeBase64 = typeof atob === "function" ? atob: (function(input) {
        var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        do {
            enc1 = keyStr.indexOf(input.charAt(i++));
            enc2 = keyStr.indexOf(input.charAt(i++));
            enc3 = keyStr.indexOf(input.charAt(i++));
            enc4 = keyStr.indexOf(input.charAt(i++));
            chr1 = enc1 << 2 | enc2 >> 4;
            chr2 = (enc2 & 15) << 4 | enc3 >> 2;
            chr3 = (enc3 & 3) << 6 | enc4;
            output = output + String.fromCharCode(chr1);
            if (enc3 !== 64) {
                output = output + String.fromCharCode(chr2)
            }
            if (enc4 !== 64) {
                output = output + String.fromCharCode(chr3)
            }
        } while ( i < input . length );
        return output
    });
    function intArrayFromBase64(s) {
        if (typeof ENVIRONMENT_IS_NODE === "boolean" && ENVIRONMENT_IS_NODE) {
            var buf;
            try {
                buf = Buffer.from(s, "base64")
            } catch(_) {
                buf = new Buffer(s, "base64")
            }
            return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
        }
        try {
            var decoded = decodeBase64(s);
            var bytes = new Uint8Array(decoded.length);
            for (var i = 0; i < decoded.length; ++i) {
                bytes[i] = decoded.charCodeAt(i)
            }
            return bytes
        } catch(_) {
            throw new Error("Converting base64 string to bytes failed.")
        }
    }
    function tryParseAsDataURI(filename) {
        if (!isDataURI(filename)) {
            return
        }
        return intArrayFromBase64(filename.slice(dataURIPrefix.length))
    }
    Module.asmGlobalArg = {
        "Math": Math,
        "Int8Array": Int8Array,
        "Int16Array": Int16Array,
        "Int32Array": Int32Array,
        "Uint8Array": Uint8Array,
        "Uint16Array": Uint16Array,
        "Uint32Array": Uint32Array,
        "Float32Array": Float32Array,
        "Float64Array": Float64Array,
        "NaN": NaN,
        "Infinity": Infinity
    };
    Module.asmLibraryArg = {
        "a": abort,
        "b": assert,
        "c": enlargeMemory,
        "d": getTotalMemory,
        "e": setTempRet0,
        "f": getTempRet0,
        "g": abortOnCannotGrowMemory,
        "h": ClassHandle,
        "i": ClassHandle_clone,
        "j": ClassHandle_delete,
        "k": ClassHandle_deleteLater,
        "l": ClassHandle_isAliasOf,
        "m": ClassHandle_isDeleted,
        "n": RegisteredClass,
        "o": RegisteredPointer,
        "p": RegisteredPointer_deleteObject,
        "q": RegisteredPointer_destructor,
        "r": RegisteredPointer_fromWireType,
        "s": RegisteredPointer_getPointee,
        "t": __ZSt18uncaught_exceptionv,
        "u": ___cxa_find_matching_catch,
        "v": ___gxx_personality_v0,
        "w": ___resumeException,
        "x": ___setErrNo,
        "y": __embind_register_bool,
        "z": __embind_register_class,
        "A": __embind_register_class_class_function,
        "B": __embind_register_class_constructor,
        "C": __embind_register_class_function,
        "D": __embind_register_class_property,
        "E": __embind_register_emval,
        "F": __embind_register_float,
        "G": __embind_register_integer,
        "H": __embind_register_memory_view,
        "I": __embind_register_std_string,
        "J": __embind_register_std_wstring,
        "K": __embind_register_void,
        "L": __emval_decref,
        "M": __emval_register,
        "N": _abort,
        "O": _embind_repr,
        "P": _emscripten_memcpy_big,
        "Q": constNoSmartPtrRawPointerToWireType,
        "R": count_emval_handles,
        "S": craftInvokerFunction,
        "T": createNamedFunction,
        "U": downcastPointer,
        "V": embind__requireFunction,
        "W": embind_init_charCodes,
        "X": ensureOverloadTable,
        "Y": exposePublicSymbol,
        "Z": extendError,
        "_": floatReadValueFromPointer,
        "$": flushPendingDeletes,
        "aa": genericPointerToWireType,
        "ab": getBasestPointer,
        "ac": getInheritedInstance,
        "ad": getInheritedInstanceCount,
        "ae": getLiveInheritedInstances,
        "af": getShiftFromSize,
        "ag": getTypeName,
        "ah": get_first_emval,
        "ai": heap32VectorToArray,
        "aj": init_ClassHandle,
        "ak": init_RegisteredPointer,
        "al": init_embind,
        "am": init_emval,
        "an": integerReadValueFromPointer,
        "ao": makeClassHandle,
        "ap": makeLegalFunctionName,
        "aq": new_,
        "ar": nonConstNoSmartPtrRawPointerToWireType,
        "as": readLatin1String,
        "at": registerType,
        "au": replacePublicSymbol,
        "av": runDestructor,
        "aw": runDestructors,
        "ax": setDelayFunction,
        "ay": shallowCopyInternalPointer,
        "az": simpleReadValueFromPointer,
        "aA": throwBindingError,
        "aB": throwInstanceAlreadyDeleted,
        "aC": throwInternalError,
        "aD": throwUnboundTypeError,
        "aE": upcastPointer,
        "aF": validateThis,
        "aG": whenDependentTypesAreResolved,
        "aH": DYNAMICTOP_PTR,
        "aI": tempDoublePtr,
        "aJ": STACKTOP,
        "aK": STACK_MAX
    }; // EMSCRIPTEN_START_ASM
    var asm = (
    /** @suppress {uselessCode} */
    function(global, env, buffer) {
        "use asm";
        var a = new global.Int8Array(buffer);
        var b = new global.Int16Array(buffer);
        var c = new global.Int32Array(buffer);
        var d = new global.Uint8Array(buffer);
        var e = new global.Uint16Array(buffer);
        var f = new global.Uint32Array(buffer);
        var g = new global.Float32Array(buffer);
        var h = new global.Float64Array(buffer);
        var i = env.aH | 0;
        var j = env.aI | 0;
        var k = env.aJ | 0;
        var l = env.aK | 0;
        var m = 0;
        var n = 0;
        var o = 0;
        var p = 0;
        var q = global.NaN,
        r = global.Infinity;
        var s = 0,
        t = 0,
        u = 0,
        v = 0,
        w = 0.0;
        var x = global.Math.floor;
        var y = global.Math.abs;
        var z = global.Math.sqrt;
        var A = global.Math.pow;
        var B = global.Math.cos;
        var C = global.Math.sin;
        var D = global.Math.tan;
        var E = global.Math.acos;
        var F = global.Math.asin;
        var G = global.Math.atan;
        var H = global.Math.atan2;
        var I = global.Math.exp;
        var J = global.Math.log;
        var K = global.Math.ceil;
        var L = global.Math.imul;
        var M = global.Math.min;
        var N = global.Math.max;
        var O = global.Math.clz32;
        var P = env.a;
        var Q = env.b;
        var R = env.c;
        var S = env.d;
        var T = env.e;
        var U = env.f;
        var V = env.g;
        var W = env.h;
        var X = env.i;
        var Y = env.j;
        var Z = env.k;
        var _ = env.l;
        var $ = env.m;
        var aa = env.n;
        var ba = env.o;
        var ca = env.p;
        var da = env.q;
        var ea = env.r;
        var fa = env.s;
        var ga = env.t;
        var ha = env.u;
        var ia = env.v;
        var ja = env.w;
        var ka = env.x;
        var la = env.y;
        var ma = env.z;
        var na = env.A;
        var oa = env.B;
        var pa = env.C;
        var qa = env.D;
        var ra = env.E;
        var sa = env.F;
        var ta = env.G;
        var ua = env.H;
        var va = env.I;
        var wa = env.J;
        var xa = env.K;
        var ya = env.L;
        var za = env.M;
        var Aa = env.N;
        var Ba = env.O;
        var Ca = env.P;
        var Da = env.Q;
        var Ea = env.R;
        var Fa = env.S;
        var Ga = env.T;
        var Ha = env.U;
        var Ia = env.V;
        var Ja = env.W;
        var Ka = env.X;
        var La = env.Y;
        var Ma = env.Z;
        var Na = env._;
        var Oa = env.$;
        var Pa = env.aa;
        var Qa = env.ab;
        var Ra = env.ac;
        var Sa = env.ad;
        var Ta = env.ae;
        var Ua = env.af;
        var Va = env.ag;
        var Wa = env.ah;
        var Xa = env.ai;
        var Ya = env.aj;
        var Za = env.ak;
        var _a = env.al;
        var $a = env.am;
        var ab = env.an;
        var bb = env.ao;
        var cb = env.ap;
        var db = env.aq;
        var eb = env.ar;
        var fb = env.as;
        var gb = env.at;
        var hb = env.au;
        var ib = env.av;
        var jb = env.aw;
        var kb = env.ax;
        var lb = env.ay;
        var mb = env.az;
        var nb = env.aA;
        var ob = env.aB;
        var pb = env.aC;
        var qb = env.aD;
        var rb = env.aE;
        var sb = env.aF;
        var tb = env.aG;
        var ub = 0.0;
        // EMSCRIPTEN_START_FUNCS
        function Fb(a) {
            a = a | 0;
            var b = 0;
            b = k;
            k = k + a | 0;
            k = k + 15 & -16;
            return b | 0
        }
        function Gb() {
            return k | 0
        }
        function Hb(a) {
            a = a | 0;
            k = a
        }
        function Ib(a, b) {
            a = a | 0;
            b = b | 0;
            k = a;
            l = b
        }
        function Jb(a, b) {
            a = a | 0;
            b = b | 0;
            if (!m) {
                m = a;
                n = b
            }
        }
        function Kb(a) {
            a = a | 0;
            var b = 0;
            ma(8, 16, 32, 0, 749, 1, 752, 0, 752, 0, 664, 754, 9);
            oa(8, 3, 464, 858, 4, 1);
            b = ec(8) | 0;
            c[b >> 2] = 10;
            c[b + 4 >> 2] = 0;
            pa(8, 672, 2, 476, 863, 1, b | 0, 0);
            b = ec(8) | 0;
            c[b >> 2] = 2;
            c[b + 4 >> 2] = 0;
            a = ec(8) | 0;
            c[a >> 2] = 2;
            c[a + 4 >> 2] = 0;
            qa(8, 683, 400, 867, 2, b | 0, 400, 871, 1, a | 0);
            na(8, 685, 1, 484, 749, 3, 11);
            return
        }
        function Lb(a) {
            a = a | 0;
            c[a >> 2] = (c[a >> 2] | 0) + 1;
            return
        }
        function Mb(a) {
            a = a | 0;
            return c[a >> 2] | 0
        }
        function Nb(a, b) {
            a = a | 0;
            b = b | 0;
            c[a >> 2] = b;
            return
        }
        function Ob(b) {
            b = b | 0;
            var d = 0,
            e = 0,
            f = 0;
            c[b >> 2] = 0;
            c[b + 4 >> 2] = 0;
            c[b + 8 >> 2] = 0;
            f = ec(16) | 0;
            c[b >> 2] = f;
            c[b + 8 >> 2] = -2147483632;
            c[b + 4 >> 2] = 11;
            b = f;
            d = 707;
            e = b + 11 | 0;
            do {
                a[b >> 0] = a[d >> 0] | 0;
                b = b + 1 | 0;
                d = d + 1 | 0
            } while (( b | 0 ) < (e | 0));
            a[f + 11 >> 0] = 0;
            return
        }
        function Pb(a) {
            a = a | 0;
            return 8
        }
        function Qb(b) {
            b = b | 0;
            var d = 0;
            if (!b) return;
            d = b + 4 | 0;
            if ((a[d + 11 >> 0] | 0) < 0) fc(c[d >> 2] | 0);
            fc(b);
            return
        }
        function Rb(b, d) {
            b = b | 0;
            d = d | 0;
            var e = 0,
            f = 0,
            g = 0;
            g = k;
            k = k + 16 | 0;
            e = g;
            f = ec(16) | 0;
            b = c[b >> 2] | 0;
            c[e >> 2] = c[d >> 2];
            c[e + 4 >> 2] = c[d + 4 >> 2];
            c[e + 8 >> 2] = c[d + 8 >> 2];
            c[d >> 2] = 0;
            c[d + 4 >> 2] = 0;
            c[d + 8 >> 2] = 0;
            c[f >> 2] = b;
            hc(f + 4 | 0, e);
            if ((a[e + 11 >> 0] | 0) >= 0) {
                k = g;
                return f | 0
            }
            fc(c[e >> 2] | 0);
            k = g;
            return f | 0
        }
        function Sb(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
            g = 0,
            h = 0,
            i = 0,
            j = 0;
            j = k;
            k = k + 16 | 0;
            g = j + 12 | 0;
            i = j;
            c[g >> 2] = d;
            f = e + 4 | 0;
            e = c[e >> 2] | 0;
            c[i >> 2] = 0;
            c[i + 4 >> 2] = 0;
            c[i + 8 >> 2] = 0;
            if (e >>> 0 > 4294967279) gc(i);
            if (e >>> 0 < 11) {
                a[i + 11 >> 0] = e;
                if (!e) d = i;
                else {
                    d = i;
                    h = 6
                }
            } else {
                h = e + 16 & -16;
                d = ec(h) | 0;
                c[i >> 2] = d;
                c[i + 8 >> 2] = h | -2147483648;
                c[i + 4 >> 2] = e;
                h = 6
            }
            if ((h | 0) == 6) Qc(d | 0, f | 0, e | 0) | 0;
            a[d + e >> 0] = 0;
            d = wb[b & 3](g, i) | 0;
            if ((a[i + 11 >> 0] | 0) >= 0) {
                k = j;
                return d | 0
            }
            fc(c[i >> 2] | 0);
            k = j;
            return d | 0
        }
        function Tb(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0,
            e = 0;
            d = c[a >> 2] | 0;
            e = c[a + 4 >> 2] | 0;
            a = b + (e >> 1) | 0;
            if (! (e & 1)) {
                e = d;
                zb[e & 15](a);
                return
            } else {
                e = c[(c[a >> 2] | 0) + d >> 2] | 0;
                zb[e & 15](a);
                return
            }
        }
        function Ub(a, b) {
            a = a | 0;
            b = b | 0;
            var d = 0,
            e = 0;
            d = c[a >> 2] | 0;
            e = c[a + 4 >> 2] | 0;
            a = b + (e >> 1) | 0;
            if (e & 1) d = c[(c[a >> 2] | 0) + d >> 2] | 0;
            return vb[d & 3](a) | 0
        }
        function Vb(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
            f = 0;
            e = c[a >> 2] | 0;
            f = c[a + 4 >> 2] | 0;
            a = b + (f >> 1) | 0;
            if (! (f & 1)) {
                f = e;
                Ab[f & 3](a, d);
                return
            } else {
                f = c[(c[a >> 2] | 0) + e >> 2] | 0;
                Ab[f & 3](a, d);
                return
            }
        }
        function Wb(b) {
            b = b | 0;
            var d = 0,
            e = 0,
            f = 0;
            e = k;
            k = k + 16 | 0;
            d = e;
            zb[b & 15](d);
            b = a[d + 11 >> 0] | 0;
            if (b << 24 >> 24 < 0) {
                f = c[d + 4 >> 2] | 0;
                b = cc(f + 4 | 0) | 0;
                c[b >> 2] = f;
                d = c[d >> 2] | 0;
                Qc(b + 4 | 0, d | 0, f | 0) | 0;
                fc(d);
                d = b;
                k = e;
                return d | 0
            } else {
                b = b & 255;
                f = cc(b + 4 | 0) | 0;
                c[f >> 2] = b;
                Qc(f + 4 | 0, d | 0, b | 0) | 0;
                k = e;
                return f | 0
            }
            return 0
        }
        function Xb() {
            Kb(0);
            return
        }
        function Yb() {
            Zb(0);
            return
        }
        function Zb(a) {
            a = a | 0;
            xa(336, 876);
            la(352, 881, 1, 1, 0);
            ta(360, 886, 1, -128, 127);
            ta(376, 891, 1, -128, 127);
            ta(368, 903, 1, 0, 255);
            ta(384, 917, 2, -32768, 32767);
            ta(392, 923, 2, 0, 65535);
            ta(400, 938, 4, -2147483648, 2147483647);
            ta(408, 942, 4, 0, -1);
            ta(416, 955, 4, -2147483648, 2147483647);
            ta(424, 960, 4, 0, -1);
            sa(432, 974, 4);
            sa(440, 980, 8);
            va(56, 987);
            va(80, 999);
            wa(104, 4, 1032);
            ra(128, 1045);
            ua(136, 0, 1061);
            ua(144, 0, 1091);
            ua(152, 1, 1128);
            ua(160, 2, 1167);
            ua(168, 3, 1198);
            ua(176, 4, 1238);
            ua(184, 5, 1267);
            ua(192, 4, 1305);
            ua(200, 5, 1335);
            ua(144, 0, 1374);
            ua(152, 1, 1406);
            ua(160, 2, 1439);
            ua(168, 3, 1472);
            ua(176, 4, 1506);
            ua(184, 5, 1539);
            ua(208, 6, 1573);
            ua(216, 7, 1604);
            ua(224, 7, 1636);
            return
        }
        function _b(a) {
            a = a | 0;
            return bc(c[a + 4 >> 2] | 0) | 0
        }
        function $b() {
            return 2488
        }
        function ac(b) {
            b = b | 0;
            var d = 0,
            e = 0,
            f = 0;
            f = b;
            a: do
            if (! (f & 3)) e = 5;
            else {
                d = f;
                while (1) {
                    if (! (a[b >> 0] | 0)) {
                        b = d;
                        break a
                    }
                    b = b + 1 | 0;
                    d = b;
                    if (! (d & 3)) {
                        e = 5;
                        break
                    }
                }
            }
            while (0);
            if ((e | 0) == 5) {
                while (1) {
                    d = c[b >> 2] | 0;
                    if (! ((d & -2139062144 ^ -2139062144) & d + -16843009)) b = b + 4 | 0;
                    else break
                }
                if ((d & 255) << 24 >> 24) do b = b + 1 | 0;
                while ((a[b >> 0] | 0) != 0)
            }
            return b - f | 0
        }
        function bc(a) {
            a = a | 0;
            var b = 0,
            c = 0;
            b = (ac(a) | 0) + 1 | 0;
            c = cc(b) | 0;
            if (!c) a = 0;
            else a = Qc(c | 0, a | 0, b | 0) | 0;
            return a | 0
        }
        function cc(a) {
            a = a | 0;
            var b = 0,
            d = 0,
            e = 0,
            f = 0,
            g = 0,
            h = 0,
            i = 0,
            j = 0,
            l = 0,
            m = 0,
            n = 0,
            o = 0,
            p = 0,
            q = 0,
            r = 0,
            s = 0,
            t = 0,
            u = 0,
            v = 0,
            w = 0,
            x = 0;
            x = k;
            k = k + 16 | 0;
            o = x;
            do
            if (a >>> 0 < 245) {
                l = a >>> 0 < 11 ? 16 : a + 11 & -8;
                a = l >>> 3;
                n = c[623] | 0;
                d = n >>> a;
                if (d & 3 | 0) {
                    b = (d & 1 ^ 1) + a | 0;
                    a = 2532 + (b << 1 << 2) | 0;
                    d = a + 8 | 0;
                    e = c[d >> 2] | 0;
                    f = e + 8 | 0;
                    g = c[f >> 2] | 0;
                    if ((g | 0) == (a | 0)) c[623] = n & ~ (1 << b);
                    else {
                        c[g + 12 >> 2] = a;
                        c[d >> 2] = g
                    }
                    w = b << 3;
                    c[e + 4 >> 2] = w | 3;
                    w = e + w + 4 | 0;
                    c[w >> 2] = c[w >> 2] | 1;
                    w = f;
                    k = x;
                    return w | 0
                }
                m = c[625] | 0;
                if (l >>> 0 > m >>> 0) {
                    if (d | 0) {
                        b = 2 << a;
                        b = d << a & (b | 0 - b);
                        b = (b & 0 - b) + -1 | 0;
                        i = b >>> 12 & 16;
                        b = b >>> i;
                        d = b >>> 5 & 8;
                        b = b >>> d;
                        g = b >>> 2 & 4;
                        b = b >>> g;
                        a = b >>> 1 & 2;
                        b = b >>> a;
                        e = b >>> 1 & 1;
                        e = (d | i | g | a | e) + (b >>> e) | 0;
                        b = 2532 + (e << 1 << 2) | 0;
                        a = b + 8 | 0;
                        g = c[a >> 2] | 0;
                        i = g + 8 | 0;
                        d = c[i >> 2] | 0;
                        if ((d | 0) == (b | 0)) {
                            a = n & ~ (1 << e);
                            c[623] = a
                        } else {
                            c[d + 12 >> 2] = b;
                            c[a >> 2] = d;
                            a = n
                        }
                        w = e << 3;
                        h = w - l | 0;
                        c[g + 4 >> 2] = l | 3;
                        f = g + l | 0;
                        c[f + 4 >> 2] = h | 1;
                        c[g + w >> 2] = h;
                        if (m | 0) {
                            e = c[628] | 0;
                            b = m >>> 3;
                            d = 2532 + (b << 1 << 2) | 0;
                            b = 1 << b;
                            if (! (a & b)) {
                                c[623] = a | b;
                                b = d;
                                a = d + 8 | 0
                            } else {
                                a = d + 8 | 0;
                                b = c[a >> 2] | 0
                            }
                            c[a >> 2] = e;
                            c[b + 12 >> 2] = e;
                            c[e + 8 >> 2] = b;
                            c[e + 12 >> 2] = d
                        }
                        c[625] = h;
                        c[628] = f;
                        w = i;
                        k = x;
                        return w | 0
                    }
                    g = c[624] | 0;
                    if (g) {
                        d = (g & 0 - g) + -1 | 0;
                        f = d >>> 12 & 16;
                        d = d >>> f;
                        e = d >>> 5 & 8;
                        d = d >>> e;
                        h = d >>> 2 & 4;
                        d = d >>> h;
                        i = d >>> 1 & 2;
                        d = d >>> i;
                        j = d >>> 1 & 1;
                        j = c[2796 + ((e | f | h | i | j) + (d >>> j) << 2) >> 2] | 0;
                        d = j;
                        i = j;
                        j = (c[j + 4 >> 2] & -8) - l | 0;
                        while (1) {
                            a = c[d + 16 >> 2] | 0;
                            if (!a) {
                                a = c[d + 20 >> 2] | 0;
                                if (!a) break
                            }
                            h = (c[a + 4 >> 2] & -8) - l | 0;
                            f = h >>> 0 < j >>> 0;
                            d = a;
                            i = f ? a: i;
                            j = f ? h: j
                        }
                        h = i + l | 0;
                        if (h >>> 0 > i >>> 0) {
                            f = c[i + 24 >> 2] | 0;
                            b = c[i + 12 >> 2] | 0;
                            do
                            if ((b | 0) == (i | 0)) {
                                a = i + 20 | 0;
                                b = c[a >> 2] | 0;
                                if (!b) {
                                    a = i + 16 | 0;
                                    b = c[a >> 2] | 0;
                                    if (!b) {
                                        d = 0;
                                        break
                                    }
                                }
                                while (1) {
                                    e = b + 20 | 0;
                                    d = c[e >> 2] | 0;
                                    if (!d) {
                                        e = b + 16 | 0;
                                        d = c[e >> 2] | 0;
                                        if (!d) break;
                                        else {
                                            b = d;
                                            a = e
                                        }
                                    } else {
                                        b = d;
                                        a = e
                                    }
                                }
                                c[a >> 2] = 0;
                                d = b
                            } else {
                                d = c[i + 8 >> 2] | 0;
                                c[d + 12 >> 2] = b;
                                c[b + 8 >> 2] = d;
                                d = b
                            }
                            while (0);
                            do
                            if (f | 0) {
                                b = c[i + 28 >> 2] | 0;
                                a = 2796 + (b << 2) | 0;
                                if ((i | 0) == (c[a >> 2] | 0)) {
                                    c[a >> 2] = d;
                                    if (!d) {
                                        c[624] = g & ~ (1 << b);
                                        break
                                    }
                                } else {
                                    w = f + 16 | 0;
                                    c[((c[w >> 2] | 0) == (i | 0) ? w: f + 20 | 0) >> 2] = d;
                                    if (!d) break
                                }
                                c[d + 24 >> 2] = f;
                                b = c[i + 16 >> 2] | 0;
                                if (b | 0) {
                                    c[d + 16 >> 2] = b;
                                    c[b + 24 >> 2] = d
                                }
                                b = c[i + 20 >> 2] | 0;
                                if (b | 0) {
                                    c[d + 20 >> 2] = b;
                                    c[b + 24 >> 2] = d
                                }
                            }
                            while (0);
                            if (j >>> 0 < 16) {
                                w = j + l | 0;
                                c[i + 4 >> 2] = w | 3;
                                w = i + w + 4 | 0;
                                c[w >> 2] = c[w >> 2] | 1
                            } else {
                                c[i + 4 >> 2] = l | 3;
                                c[h + 4 >> 2] = j | 1;
                                c[h + j >> 2] = j;
                                if (m | 0) {
                                    e = c[628] | 0;
                                    b = m >>> 3;
                                    d = 2532 + (b << 1 << 2) | 0;
                                    b = 1 << b;
                                    if (! (b & n)) {
                                        c[623] = b | n;
                                        b = d;
                                        a = d + 8 | 0
                                    } else {
                                        a = d + 8 | 0;
                                        b = c[a >> 2] | 0
                                    }
                                    c[a >> 2] = e;
                                    c[b + 12 >> 2] = e;
                                    c[e + 8 >> 2] = b;
                                    c[e + 12 >> 2] = d
                                }
                                c[625] = j;
                                c[628] = h
                            }
                            w = i + 8 | 0;
                            k = x;
                            return w | 0
                        } else n = l
                    } else n = l
                } else n = l
            } else if (a >>> 0 <= 4294967231) {
                a = a + 11 | 0;
                l = a & -8;
                e = c[624] | 0;
                if (e) {
                    f = 0 - l | 0;
                    a = a >>> 8;
                    if (a) if (l >>> 0 > 16777215) j = 31;
                    else {
                        n = (a + 1048320 | 0) >>> 16 & 8;
                        r = a << n;
                        i = (r + 520192 | 0) >>> 16 & 4;
                        r = r << i;
                        j = (r + 245760 | 0) >>> 16 & 2;
                        j = 14 - (i | n | j) + (r << j >>> 15) | 0;
                        j = l >>> (j + 7 | 0) & 1 | j << 1
                    } else j = 0;
                    d = c[2796 + (j << 2) >> 2] | 0;
                    a: do
                    if (!d) {
                        d = 0;
                        a = 0;
                        r = 61
                    } else {
                        a = 0;
                        i = l << ((j | 0) == 31 ? 0 : 25 - (j >>> 1) | 0);
                        g = 0;
                        while (1) {
                            h = (c[d + 4 >> 2] & -8) - l | 0;
                            if (h >>> 0 < f >>> 0) if (!h) {
                                a = d;
                                f = 0;
                                r = 65;
                                break a
                            } else {
                                a = d;
                                f = h
                            }
                            r = c[d + 20 >> 2] | 0;
                            d = c[d + 16 + (i >>> 31 << 2) >> 2] | 0;
                            g = (r | 0) == 0 | (r | 0) == (d | 0) ? g: r;
                            if (!d) {
                                d = g;
                                r = 61;
                                break
                            } else i = i << 1
                        }
                    }
                    while (0);
                    if ((r | 0) == 61) {
                        if ((d | 0) == 0 & (a | 0) == 0) {
                            a = 2 << j;
                            a = (a | 0 - a) & e;
                            if (!a) {
                                n = l;
                                break
                            }
                            n = (a & 0 - a) + -1 | 0;
                            h = n >>> 12 & 16;
                            n = n >>> h;
                            g = n >>> 5 & 8;
                            n = n >>> g;
                            i = n >>> 2 & 4;
                            n = n >>> i;
                            j = n >>> 1 & 2;
                            n = n >>> j;
                            d = n >>> 1 & 1;
                            a = 0;
                            d = c[2796 + ((g | h | i | j | d) + (n >>> d) << 2) >> 2] | 0
                        }
                        if (!d) {
                            i = a;
                            h = f
                        } else r = 65
                    }
                    if ((r | 0) == 65) {
                        g = d;
                        while (1) {
                            n = (c[g + 4 >> 2] & -8) - l | 0;
                            d = n >>> 0 < f >>> 0;
                            f = d ? n: f;
                            a = d ? g: a;
                            d = c[g + 16 >> 2] | 0;
                            if (!d) d = c[g + 20 >> 2] | 0;
                            if (!d) {
                                i = a;
                                h = f;
                                break
                            } else g = d
                        }
                    }
                    if (((i | 0) != 0 ? h >>> 0 < ((c[625] | 0) - l | 0) >>> 0 : 0) ? (m = i + l | 0, m >>> 0 > i >>> 0) : 0) {
                        g = c[i + 24 >> 2] | 0;
                        b = c[i + 12 >> 2] | 0;
                        do
                        if ((b | 0) == (i | 0)) {
                            a = i + 20 | 0;
                            b = c[a >> 2] | 0;
                            if (!b) {
                                a = i + 16 | 0;
                                b = c[a >> 2] | 0;
                                if (!b) {
                                    b = 0;
                                    break
                                }
                            }
                            while (1) {
                                f = b + 20 | 0;
                                d = c[f >> 2] | 0;
                                if (!d) {
                                    f = b + 16 | 0;
                                    d = c[f >> 2] | 0;
                                    if (!d) break;
                                    else {
                                        b = d;
                                        a = f
                                    }
                                } else {
                                    b = d;
                                    a = f
                                }
                            }
                            c[a >> 2] = 0
                        } else {
                            w = c[i + 8 >> 2] | 0;
                            c[w + 12 >> 2] = b;
                            c[b + 8 >> 2] = w
                        }
                        while (0);
                        do
                        if (g) {
                            a = c[i + 28 >> 2] | 0;
                            d = 2796 + (a << 2) | 0;
                            if ((i | 0) == (c[d >> 2] | 0)) {
                                c[d >> 2] = b;
                                if (!b) {
                                    e = e & ~ (1 << a);
                                    c[624] = e;
                                    break
                                }
                            } else {
                                w = g + 16 | 0;
                                c[((c[w >> 2] | 0) == (i | 0) ? w: g + 20 | 0) >> 2] = b;
                                if (!b) break
                            }
                            c[b + 24 >> 2] = g;
                            a = c[i + 16 >> 2] | 0;
                            if (a | 0) {
                                c[b + 16 >> 2] = a;
                                c[a + 24 >> 2] = b
                            }
                            a = c[i + 20 >> 2] | 0;
                            if (a) {
                                c[b + 20 >> 2] = a;
                                c[a + 24 >> 2] = b
                            }
                        }
                        while (0);
                        b: do
                        if (h >>> 0 < 16) {
                            w = h + l | 0;
                            c[i + 4 >> 2] = w | 3;
                            w = i + w + 4 | 0;
                            c[w >> 2] = c[w >> 2] | 1
                        } else {
                            c[i + 4 >> 2] = l | 3;
                            c[m + 4 >> 2] = h | 1;
                            c[m + h >> 2] = h;
                            b = h >>> 3;
                            if (h >>> 0 < 256) {
                                d = 2532 + (b << 1 << 2) | 0;
                                a = c[623] | 0;
                                b = 1 << b;
                                if (! (a & b)) {
                                    c[623] = a | b;
                                    b = d;
                                    a = d + 8 | 0
                                } else {
                                    a = d + 8 | 0;
                                    b = c[a >> 2] | 0
                                }
                                c[a >> 2] = m;
                                c[b + 12 >> 2] = m;
                                c[m + 8 >> 2] = b;
                                c[m + 12 >> 2] = d;
                                break
                            }
                            b = h >>> 8;
                            if (b) if (h >>> 0 > 16777215) d = 31;
                            else {
                                v = (b + 1048320 | 0) >>> 16 & 8;
                                w = b << v;
                                u = (w + 520192 | 0) >>> 16 & 4;
                                w = w << u;
                                d = (w + 245760 | 0) >>> 16 & 2;
                                d = 14 - (u | v | d) + (w << d >>> 15) | 0;
                                d = h >>> (d + 7 | 0) & 1 | d << 1
                            } else d = 0;
                            b = 2796 + (d << 2) | 0;
                            c[m + 28 >> 2] = d;
                            a = m + 16 | 0;
                            c[a + 4 >> 2] = 0;
                            c[a >> 2] = 0;
                            a = 1 << d;
                            if (! (e & a)) {
                                c[624] = e | a;
                                c[b >> 2] = m;
                                c[m + 24 >> 2] = b;
                                c[m + 12 >> 2] = m;
                                c[m + 8 >> 2] = m;
                                break
                            }
                            b = c[b >> 2] | 0;
                            c: do
                            if ((c[b + 4 >> 2] & -8 | 0) != (h | 0)) {
                                e = h << ((d | 0) == 31 ? 0 : 25 - (d >>> 1) | 0);
                                while (1) {
                                    d = b + 16 + (e >>> 31 << 2) | 0;
                                    a = c[d >> 2] | 0;
                                    if (!a) break;
                                    if ((c[a + 4 >> 2] & -8 | 0) == (h | 0)) {
                                        b = a;
                                        break c
                                    } else {
                                        e = e << 1;
                                        b = a
                                    }
                                }
                                c[d >> 2] = m;
                                c[m + 24 >> 2] = b;
                                c[m + 12 >> 2] = m;
                                c[m + 8 >> 2] = m;
                                break b
                            }
                            while (0);
                            v = b + 8 | 0;
                            w = c[v >> 2] | 0;
                            c[w + 12 >> 2] = m;
                            c[v >> 2] = m;
                            c[m + 8 >> 2] = w;
                            c[m + 12 >> 2] = b;
                            c[m + 24 >> 2] = 0
                        }
                        while (0);
                        w = i + 8 | 0;
                        k = x;
                        return w | 0
                    } else n = l
                } else n = l
            } else n = -1;
            while (0);
            d = c[625] | 0;
            if (d >>> 0 >= n >>> 0) {
                b = d - n | 0;
                a = c[628] | 0;
                if (b >>> 0 > 15) {
                    w = a + n | 0;
                    c[628] = w;
                    c[625] = b;
                    c[w + 4 >> 2] = b | 1;
                    c[a + d >> 2] = b;
                    c[a + 4 >> 2] = n | 3
                } else {
                    c[625] = 0;
                    c[628] = 0;
                    c[a + 4 >> 2] = d | 3;
                    w = a + d + 4 | 0;
                    c[w >> 2] = c[w >> 2] | 1
                }
                w = a + 8 | 0;
                k = x;
                return w | 0
            }
            h = c[626] | 0;
            if (h >>> 0 > n >>> 0) {
                u = h - n | 0;
                c[626] = u;
                w = c[629] | 0;
                v = w + n | 0;
                c[629] = v;
                c[v + 4 >> 2] = u | 1;
                c[w + 4 >> 2] = n | 3;
                w = w + 8 | 0;
                k = x;
                return w | 0
            }
            if (! (c[741] | 0)) {
                c[743] = 4096;
                c[742] = 4096;
                c[744] = -1;
                c[745] = -1;
                c[746] = 0;
                c[734] = 0;
                c[741] = o & -16 ^ 1431655768;
                a = 4096
            } else a = c[743] | 0;
            i = n + 48 | 0;
            j = n + 47 | 0;
            g = a + j | 0;
            f = 0 - a | 0;
            l = g & f;
            if (l >>> 0 <= n >>> 0) {
                w = 0;
                k = x;
                return w | 0
            }
            a = c[733] | 0;
            if (a | 0 ? (m = c[731] | 0, o = m + l | 0, o >>> 0 <= m >>> 0 | o >>> 0 > a >>> 0) : 0) {
                w = 0;
                k = x;
                return w | 0
            }
            d: do
            if (! (c[734] & 4)) {
                d = c[629] | 0;
                e: do
                if (d) {
                    e = 2940;
                    while (1) {
                        o = c[e >> 2] | 0;
                        if (o >>> 0 <= d >>> 0 ? (o + (c[e + 4 >> 2] | 0) | 0) >>> 0 > d >>> 0 : 0) break;
                        a = c[e + 8 >> 2] | 0;
                        if (!a) {
                            r = 128;
                            break e
                        } else e = a
                    }
                    b = g - h & f;
                    if (b >>> 0 < 2147483647) {
                        a = Sc(b | 0) | 0;
                        if ((a | 0) == ((c[e >> 2] | 0) + (c[e + 4 >> 2] | 0) | 0)) {
                            if ((a | 0) != ( - 1 | 0)) {
                                h = b;
                                g = a;
                                r = 145;
                                break d
                            }
                        } else {
                            e = a;
                            r = 136
                        }
                    } else b = 0
                } else r = 128;
                while (0);
                do
                if ((r | 0) == 128) {
                    d = Sc(0) | 0;
                    if ((d | 0) != ( - 1 | 0) ? (b = d, p = c[742] | 0, q = p + -1 | 0, b = ((q & b | 0) == 0 ? 0 : (q + b & 0 - p) - b | 0) + l | 0, p = c[731] | 0, q = b + p | 0, b >>> 0 > n >>> 0 & b >>> 0 < 2147483647) : 0) {
                        o = c[733] | 0;
                        if (o | 0 ? q >>> 0 <= p >>> 0 | q >>> 0 > o >>> 0 : 0) {
                            b = 0;
                            break
                        }
                        a = Sc(b | 0) | 0;
                        if ((a | 0) == (d | 0)) {
                            h = b;
                            g = d;
                            r = 145;
                            break d
                        } else {
                            e = a;
                            r = 136
                        }
                    } else b = 0
                }
                while (0);
                do
                if ((r | 0) == 136) {
                    d = 0 - b | 0;
                    if (! (i >>> 0 > b >>> 0 & (b >>> 0 < 2147483647 & (e | 0) != ( - 1 | 0)))) if ((e | 0) == ( - 1 | 0)) {
                        b = 0;
                        break
                    } else {
                        h = b;
                        g = e;
                        r = 145;
                        break d
                    }
                    a = c[743] | 0;
                    a = j - b + a & 0 - a;
                    if (a >>> 0 >= 2147483647) {
                        h = b;
                        g = e;
                        r = 145;
                        break d
                    }
                    if ((Sc(a | 0) | 0) == ( - 1 | 0)) {
                        Sc(d | 0) | 0;
                        b = 0;
                        break
                    } else {
                        h = a + b | 0;
                        g = e;
                        r = 145;
                        break d
                    }
                }
                while (0);
                c[734] = c[734] | 4;
                r = 143
            } else {
                b = 0;
                r = 143
            }
            while (0);
            if (((r | 0) == 143 ? l >>> 0 < 2147483647 : 0) ? (u = Sc(l | 0) | 0, q = Sc(0) | 0, s = q - u | 0, t = s >>> 0 > (n + 40 | 0) >>> 0, !((u | 0) == ( - 1 | 0) | t ^ 1 | u >>> 0 < q >>> 0 & ((u | 0) != ( - 1 | 0) & (q | 0) != ( - 1 | 0)) ^ 1)) : 0) {
                h = t ? s: b;
                g = u;
                r = 145
            }
            if ((r | 0) == 145) {
                b = (c[731] | 0) + h | 0;
                c[731] = b;
                if (b >>> 0 > (c[732] | 0) >>> 0) c[732] = b;
                j = c[629] | 0;
                f: do
                if (j) {
                    b = 2940;
                    while (1) {
                        a = c[b >> 2] | 0;
                        d = c[b + 4 >> 2] | 0;
                        if ((g | 0) == (a + d | 0)) {
                            r = 154;
                            break
                        }
                        e = c[b + 8 >> 2] | 0;
                        if (!e) break;
                        else b = e
                    }
                    if (((r | 0) == 154 ? (v = b + 4 | 0, (c[b + 12 >> 2] & 8 | 0) == 0) : 0) ? g >>> 0 > j >>> 0 & a >>> 0 <= j >>> 0 : 0) {
                        c[v >> 2] = d + h;
                        w = (c[626] | 0) + h | 0;
                        u = j + 8 | 0;
                        u = (u & 7 | 0) == 0 ? 0 : 0 - u & 7;
                        v = j + u | 0;
                        u = w - u | 0;
                        c[629] = v;
                        c[626] = u;
                        c[v + 4 >> 2] = u | 1;
                        c[j + w + 4 >> 2] = 40;
                        c[630] = c[745];
                        break
                    }
                    if (g >>> 0 < (c[627] | 0) >>> 0) c[627] = g;
                    d = g + h | 0;
                    b = 2940;
                    while (1) {
                        if ((c[b >> 2] | 0) == (d | 0)) {
                            r = 162;
                            break
                        }
                        a = c[b + 8 >> 2] | 0;
                        if (!a) break;
                        else b = a
                    }
                    if ((r | 0) == 162 ? (c[b + 12 >> 2] & 8 | 0) == 0 : 0) {
                        c[b >> 2] = g;
                        m = b + 4 | 0;
                        c[m >> 2] = (c[m >> 2] | 0) + h;
                        m = g + 8 | 0;
                        m = g + ((m & 7 | 0) == 0 ? 0 : 0 - m & 7) | 0;
                        b = d + 8 | 0;
                        b = d + ((b & 7 | 0) == 0 ? 0 : 0 - b & 7) | 0;
                        l = m + n | 0;
                        i = b - m - n | 0;
                        c[m + 4 >> 2] = n | 3;
                        g: do
                        if ((j | 0) == (b | 0)) {
                            w = (c[626] | 0) + i | 0;
                            c[626] = w;
                            c[629] = l;
                            c[l + 4 >> 2] = w | 1
                        } else {
                            if ((c[628] | 0) == (b | 0)) {
                                w = (c[625] | 0) + i | 0;
                                c[625] = w;
                                c[628] = l;
                                c[l + 4 >> 2] = w | 1;
                                c[l + w >> 2] = w;
                                break
                            }
                            a = c[b + 4 >> 2] | 0;
                            if ((a & 3 | 0) == 1) {
                                h = a & -8;
                                e = a >>> 3;
                                h: do
                                if (a >>> 0 < 256) {
                                    a = c[b + 8 >> 2] | 0;
                                    d = c[b + 12 >> 2] | 0;
                                    if ((d | 0) == (a | 0)) {
                                        c[623] = c[623] & ~ (1 << e);
                                        break
                                    } else {
                                        c[a + 12 >> 2] = d;
                                        c[d + 8 >> 2] = a;
                                        break
                                    }
                                } else {
                                    g = c[b + 24 >> 2] | 0;
                                    a = c[b + 12 >> 2] | 0;
                                    do
                                    if ((a | 0) == (b | 0)) {
                                        d = b + 16 | 0;
                                        e = d + 4 | 0;
                                        a = c[e >> 2] | 0;
                                        if (!a) {
                                            a = c[d >> 2] | 0;
                                            if (!a) {
                                                a = 0;
                                                break
                                            }
                                        } else d = e;
                                        while (1) {
                                            f = a + 20 | 0;
                                            e = c[f >> 2] | 0;
                                            if (!e) {
                                                f = a + 16 | 0;
                                                e = c[f >> 2] | 0;
                                                if (!e) break;
                                                else {
                                                    a = e;
                                                    d = f
                                                }
                                            } else {
                                                a = e;
                                                d = f
                                            }
                                        }
                                        c[d >> 2] = 0
                                    } else {
                                        w = c[b + 8 >> 2] | 0;
                                        c[w + 12 >> 2] = a;
                                        c[a + 8 >> 2] = w
                                    }
                                    while (0);
                                    if (!g) break;
                                    d = c[b + 28 >> 2] | 0;
                                    e = 2796 + (d << 2) | 0;
                                    do
                                    if ((c[e >> 2] | 0) != (b | 0)) {
                                        w = g + 16 | 0;
                                        c[((c[w >> 2] | 0) == (b | 0) ? w: g + 20 | 0) >> 2] = a;
                                        if (!a) break h
                                    } else {
                                        c[e >> 2] = a;
                                        if (a | 0) break;
                                        c[624] = c[624] & ~ (1 << d);
                                        break h
                                    }
                                    while (0);
                                    c[a + 24 >> 2] = g;
                                    d = b + 16 | 0;
                                    e = c[d >> 2] | 0;
                                    if (e | 0) {
                                        c[a + 16 >> 2] = e;
                                        c[e + 24 >> 2] = a
                                    }
                                    d = c[d + 4 >> 2] | 0;
                                    if (!d) break;
                                    c[a + 20 >> 2] = d;
                                    c[d + 24 >> 2] = a
                                }
                                while (0);
                                b = b + h | 0;
                                f = h + i | 0
                            } else f = i;
                            b = b + 4 | 0;
                            c[b >> 2] = c[b >> 2] & -2;
                            c[l + 4 >> 2] = f | 1;
                            c[l + f >> 2] = f;
                            b = f >>> 3;
                            if (f >>> 0 < 256) {
                                d = 2532 + (b << 1 << 2) | 0;
                                a = c[623] | 0;
                                b = 1 << b;
                                if (! (a & b)) {
                                    c[623] = a | b;
                                    b = d;
                                    a = d + 8 | 0
                                } else {
                                    a = d + 8 | 0;
                                    b = c[a >> 2] | 0
                                }
                                c[a >> 2] = l;
                                c[b + 12 >> 2] = l;
                                c[l + 8 >> 2] = b;
                                c[l + 12 >> 2] = d;
                                break
                            }
                            b = f >>> 8;
                            do
                            if (!b) e = 0;
                            else {
                                if (f >>> 0 > 16777215) {
                                    e = 31;
                                    break
                                }
                                v = (b + 1048320 | 0) >>> 16 & 8;
                                w = b << v;
                                u = (w + 520192 | 0) >>> 16 & 4;
                                w = w << u;
                                e = (w + 245760 | 0) >>> 16 & 2;
                                e = 14 - (u | v | e) + (w << e >>> 15) | 0;
                                e = f >>> (e + 7 | 0) & 1 | e << 1
                            }
                            while (0);
                            b = 2796 + (e << 2) | 0;
                            c[l + 28 >> 2] = e;
                            a = l + 16 | 0;
                            c[a + 4 >> 2] = 0;
                            c[a >> 2] = 0;
                            a = c[624] | 0;
                            d = 1 << e;
                            if (! (a & d)) {
                                c[624] = a | d;
                                c[b >> 2] = l;
                                c[l + 24 >> 2] = b;
                                c[l + 12 >> 2] = l;
                                c[l + 8 >> 2] = l;
                                break
                            }
                            b = c[b >> 2] | 0;
                            i: do
                            if ((c[b + 4 >> 2] & -8 | 0) != (f | 0)) {
                                e = f << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0);
                                while (1) {
                                    d = b + 16 + (e >>> 31 << 2) | 0;
                                    a = c[d >> 2] | 0;
                                    if (!a) break;
                                    if ((c[a + 4 >> 2] & -8 | 0) == (f | 0)) {
                                        b = a;
                                        break i
                                    } else {
                                        e = e << 1;
                                        b = a
                                    }
                                }
                                c[d >> 2] = l;
                                c[l + 24 >> 2] = b;
                                c[l + 12 >> 2] = l;
                                c[l + 8 >> 2] = l;
                                break g
                            }
                            while (0);
                            v = b + 8 | 0;
                            w = c[v >> 2] | 0;
                            c[w + 12 >> 2] = l;
                            c[v >> 2] = l;
                            c[l + 8 >> 2] = w;
                            c[l + 12 >> 2] = b;
                            c[l + 24 >> 2] = 0
                        }
                        while (0);
                        w = m + 8 | 0;
                        k = x;
                        return w | 0
                    }
                    b = 2940;
                    while (1) {
                        a = c[b >> 2] | 0;
                        if (a >>> 0 <= j >>> 0 ? (w = a + (c[b + 4 >> 2] | 0) | 0, w >>> 0 > j >>> 0) : 0) break;
                        b = c[b + 8 >> 2] | 0
                    }
                    f = w + -47 | 0;
                    a = f + 8 | 0;
                    a = f + ((a & 7 | 0) == 0 ? 0 : 0 - a & 7) | 0;
                    f = j + 16 | 0;
                    a = a >>> 0 < f >>> 0 ? j: a;
                    b = a + 8 | 0;
                    d = h + -40 | 0;
                    u = g + 8 | 0;
                    u = (u & 7 | 0) == 0 ? 0 : 0 - u & 7;
                    v = g + u | 0;
                    u = d - u | 0;
                    c[629] = v;
                    c[626] = u;
                    c[v + 4 >> 2] = u | 1;
                    c[g + d + 4 >> 2] = 40;
                    c[630] = c[745];
                    d = a + 4 | 0;
                    c[d >> 2] = 27;
                    c[b >> 2] = c[735];
                    c[b + 4 >> 2] = c[736];
                    c[b + 8 >> 2] = c[737];
                    c[b + 12 >> 2] = c[738];
                    c[735] = g;
                    c[736] = h;
                    c[738] = 0;
                    c[737] = b;
                    b = a + 24 | 0;
                    do {
                        v = b;
                        b = b + 4 | 0;
                        c[b >> 2] = 7
                    } while (( v + 8 | 0 ) >>> 0 < w >>> 0);
                    if ((a | 0) != (j | 0)) {
                        g = a - j | 0;
                        c[d >> 2] = c[d >> 2] & -2;
                        c[j + 4 >> 2] = g | 1;
                        c[a >> 2] = g;
                        b = g >>> 3;
                        if (g >>> 0 < 256) {
                            d = 2532 + (b << 1 << 2) | 0;
                            a = c[623] | 0;
                            b = 1 << b;
                            if (! (a & b)) {
                                c[623] = a | b;
                                b = d;
                                a = d + 8 | 0
                            } else {
                                a = d + 8 | 0;
                                b = c[a >> 2] | 0
                            }
                            c[a >> 2] = j;
                            c[b + 12 >> 2] = j;
                            c[j + 8 >> 2] = b;
                            c[j + 12 >> 2] = d;
                            break
                        }
                        b = g >>> 8;
                        if (b) if (g >>> 0 > 16777215) e = 31;
                        else {
                            v = (b + 1048320 | 0) >>> 16 & 8;
                            w = b << v;
                            u = (w + 520192 | 0) >>> 16 & 4;
                            w = w << u;
                            e = (w + 245760 | 0) >>> 16 & 2;
                            e = 14 - (u | v | e) + (w << e >>> 15) | 0;
                            e = g >>> (e + 7 | 0) & 1 | e << 1
                        } else e = 0;
                        d = 2796 + (e << 2) | 0;
                        c[j + 28 >> 2] = e;
                        c[j + 20 >> 2] = 0;
                        c[f >> 2] = 0;
                        b = c[624] | 0;
                        a = 1 << e;
                        if (! (b & a)) {
                            c[624] = b | a;
                            c[d >> 2] = j;
                            c[j + 24 >> 2] = d;
                            c[j + 12 >> 2] = j;
                            c[j + 8 >> 2] = j;
                            break
                        }
                        b = c[d >> 2] | 0;
                        j: do
                        if ((c[b + 4 >> 2] & -8 | 0) != (g | 0)) {
                            e = g << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0);
                            while (1) {
                                d = b + 16 + (e >>> 31 << 2) | 0;
                                a = c[d >> 2] | 0;
                                if (!a) break;
                                if ((c[a + 4 >> 2] & -8 | 0) == (g | 0)) {
                                    b = a;
                                    break j
                                } else {
                                    e = e << 1;
                                    b = a
                                }
                            }
                            c[d >> 2] = j;
                            c[j + 24 >> 2] = b;
                            c[j + 12 >> 2] = j;
                            c[j + 8 >> 2] = j;
                            break f
                        }
                        while (0);
                        v = b + 8 | 0;
                        w = c[v >> 2] | 0;
                        c[w + 12 >> 2] = j;
                        c[v >> 2] = j;
                        c[j + 8 >> 2] = w;
                        c[j + 12 >> 2] = b;
                        c[j + 24 >> 2] = 0
                    }
                } else {
                    w = c[627] | 0;
                    if ((w | 0) == 0 | g >>> 0 < w >>> 0) c[627] = g;
                    c[735] = g;
                    c[736] = h;
                    c[738] = 0;
                    c[632] = c[741];
                    c[631] = -1;
                    c[636] = 2532;
                    c[635] = 2532;
                    c[638] = 2540;
                    c[637] = 2540;
                    c[640] = 2548;
                    c[639] = 2548;
                    c[642] = 2556;
                    c[641] = 2556;
                    c[644] = 2564;
                    c[643] = 2564;
                    c[646] = 2572;
                    c[645] = 2572;
                    c[648] = 2580;
                    c[647] = 2580;
                    c[650] = 2588;
                    c[649] = 2588;
                    c[652] = 2596;
                    c[651] = 2596;
                    c[654] = 2604;
                    c[653] = 2604;
                    c[656] = 2612;
                    c[655] = 2612;
                    c[658] = 2620;
                    c[657] = 2620;
                    c[660] = 2628;
                    c[659] = 2628;
                    c[662] = 2636;
                    c[661] = 2636;
                    c[664] = 2644;
                    c[663] = 2644;
                    c[666] = 2652;
                    c[665] = 2652;
                    c[668] = 2660;
                    c[667] = 2660;
                    c[670] = 2668;
                    c[669] = 2668;
                    c[672] = 2676;
                    c[671] = 2676;
                    c[674] = 2684;
                    c[673] = 2684;
                    c[676] = 2692;
                    c[675] = 2692;
                    c[678] = 2700;
                    c[677] = 2700;
                    c[680] = 2708;
                    c[679] = 2708;
                    c[682] = 2716;
                    c[681] = 2716;
                    c[684] = 2724;
                    c[683] = 2724;
                    c[686] = 2732;
                    c[685] = 2732;
                    c[688] = 2740;
                    c[687] = 2740;
                    c[690] = 2748;
                    c[689] = 2748;
                    c[692] = 2756;
                    c[691] = 2756;
                    c[694] = 2764;
                    c[693] = 2764;
                    c[696] = 2772;
                    c[695] = 2772;
                    c[698] = 2780;
                    c[697] = 2780;
                    w = h + -40 | 0;
                    u = g + 8 | 0;
                    u = (u & 7 | 0) == 0 ? 0 : 0 - u & 7;
                    v = g + u | 0;
                    u = w - u | 0;
                    c[629] = v;
                    c[626] = u;
                    c[v + 4 >> 2] = u | 1;
                    c[g + w + 4 >> 2] = 40;
                    c[630] = c[745]
                }
                while (0);
                b = c[626] | 0;
                if (b >>> 0 > n >>> 0) {
                    u = b - n | 0;
                    c[626] = u;
                    w = c[629] | 0;
                    v = w + n | 0;
                    c[629] = v;
                    c[v + 4 >> 2] = u | 1;
                    c[w + 4 >> 2] = n | 3;
                    w = w + 8 | 0;
                    k = x;
                    return w | 0
                }
            }
            c[($b() | 0) >> 2] = 12;
            w = 0;
            k = x;
            return w | 0
        }
        function dc(a) {
            a = a | 0;
            var b = 0,
            d = 0,
            e = 0,
            f = 0,
            g = 0,
            h = 0,
            i = 0,
            j = 0;
            if (!a) return;
            d = a + -8 | 0;
            f = c[627] | 0;
            a = c[a + -4 >> 2] | 0;
            b = a & -8;
            j = d + b | 0;
            do
            if (! (a & 1)) {
                e = c[d >> 2] | 0;
                if (! (a & 3)) return;
                h = d + (0 - e) | 0;
                g = e + b | 0;
                if (h >>> 0 < f >>> 0) return;
                if ((c[628] | 0) == (h | 0)) {
                    a = j + 4 | 0;
                    b = c[a >> 2] | 0;
                    if ((b & 3 | 0) != 3) {
                        i = h;
                        b = g;
                        break
                    }
                    c[625] = g;
                    c[a >> 2] = b & -2;
                    c[h + 4 >> 2] = g | 1;
                    c[h + g >> 2] = g;
                    return
                }
                d = e >>> 3;
                if (e >>> 0 < 256) {
                    a = c[h + 8 >> 2] | 0;
                    b = c[h + 12 >> 2] | 0;
                    if ((b | 0) == (a | 0)) {
                        c[623] = c[623] & ~ (1 << d);
                        i = h;
                        b = g;
                        break
                    } else {
                        c[a + 12 >> 2] = b;
                        c[b + 8 >> 2] = a;
                        i = h;
                        b = g;
                        break
                    }
                }
                f = c[h + 24 >> 2] | 0;
                a = c[h + 12 >> 2] | 0;
                do
                if ((a | 0) == (h | 0)) {
                    b = h + 16 | 0;
                    d = b + 4 | 0;
                    a = c[d >> 2] | 0;
                    if (!a) {
                        a = c[b >> 2] | 0;
                        if (!a) {
                            a = 0;
                            break
                        }
                    } else b = d;
                    while (1) {
                        e = a + 20 | 0;
                        d = c[e >> 2] | 0;
                        if (!d) {
                            e = a + 16 | 0;
                            d = c[e >> 2] | 0;
                            if (!d) break;
                            else {
                                a = d;
                                b = e
                            }
                        } else {
                            a = d;
                            b = e
                        }
                    }
                    c[b >> 2] = 0
                } else {
                    i = c[h + 8 >> 2] | 0;
                    c[i + 12 >> 2] = a;
                    c[a + 8 >> 2] = i
                }
                while (0);
                if (f) {
                    b = c[h + 28 >> 2] | 0;
                    d = 2796 + (b << 2) | 0;
                    if ((c[d >> 2] | 0) == (h | 0)) {
                        c[d >> 2] = a;
                        if (!a) {
                            c[624] = c[624] & ~ (1 << b);
                            i = h;
                            b = g;
                            break
                        }
                    } else {
                        i = f + 16 | 0;
                        c[((c[i >> 2] | 0) == (h | 0) ? i: f + 20 | 0) >> 2] = a;
                        if (!a) {
                            i = h;
                            b = g;
                            break
                        }
                    }
                    c[a + 24 >> 2] = f;
                    b = h + 16 | 0;
                    d = c[b >> 2] | 0;
                    if (d | 0) {
                        c[a + 16 >> 2] = d;
                        c[d + 24 >> 2] = a
                    }
                    b = c[b + 4 >> 2] | 0;
                    if (b) {
                        c[a + 20 >> 2] = b;
                        c[b + 24 >> 2] = a;
                        i = h;
                        b = g
                    } else {
                        i = h;
                        b = g
                    }
                } else {
                    i = h;
                    b = g
                }
            } else {
                i = d;
                h = d
            }
            while (0);
            if (h >>> 0 >= j >>> 0) return;
            a = j + 4 | 0;
            e = c[a >> 2] | 0;
            if (! (e & 1)) return;
            if (! (e & 2)) {
                if ((c[629] | 0) == (j | 0)) {
                    j = (c[626] | 0) + b | 0;
                    c[626] = j;
                    c[629] = i;
                    c[i + 4 >> 2] = j | 1;
                    if ((i | 0) != (c[628] | 0)) return;
                    c[628] = 0;
                    c[625] = 0;
                    return
                }
                if ((c[628] | 0) == (j | 0)) {
                    j = (c[625] | 0) + b | 0;
                    c[625] = j;
                    c[628] = h;
                    c[i + 4 >> 2] = j | 1;
                    c[h + j >> 2] = j;
                    return
                }
                f = (e & -8) + b | 0;
                d = e >>> 3;
                do
                if (e >>> 0 < 256) {
                    b = c[j + 8 >> 2] | 0;
                    a = c[j + 12 >> 2] | 0;
                    if ((a | 0) == (b | 0)) {
                        c[623] = c[623] & ~ (1 << d);
                        break
                    } else {
                        c[b + 12 >> 2] = a;
                        c[a + 8 >> 2] = b;
                        break
                    }
                } else {
                    g = c[j + 24 >> 2] | 0;
                    a = c[j + 12 >> 2] | 0;
                    do
                    if ((a | 0) == (j | 0)) {
                        b = j + 16 | 0;
                        d = b + 4 | 0;
                        a = c[d >> 2] | 0;
                        if (!a) {
                            a = c[b >> 2] | 0;
                            if (!a) {
                                d = 0;
                                break
                            }
                        } else b = d;
                        while (1) {
                            e = a + 20 | 0;
                            d = c[e >> 2] | 0;
                            if (!d) {
                                e = a + 16 | 0;
                                d = c[e >> 2] | 0;
                                if (!d) break;
                                else {
                                    a = d;
                                    b = e
                                }
                            } else {
                                a = d;
                                b = e
                            }
                        }
                        c[b >> 2] = 0;
                        d = a
                    } else {
                        d = c[j + 8 >> 2] | 0;
                        c[d + 12 >> 2] = a;
                        c[a + 8 >> 2] = d;
                        d = a
                    }
                    while (0);
                    if (g | 0) {
                        a = c[j + 28 >> 2] | 0;
                        b = 2796 + (a << 2) | 0;
                        if ((c[b >> 2] | 0) == (j | 0)) {
                            c[b >> 2] = d;
                            if (!d) {
                                c[624] = c[624] & ~ (1 << a);
                                break
                            }
                        } else {
                            e = g + 16 | 0;
                            c[((c[e >> 2] | 0) == (j | 0) ? e: g + 20 | 0) >> 2] = d;
                            if (!d) break
                        }
                        c[d + 24 >> 2] = g;
                        a = j + 16 | 0;
                        b = c[a >> 2] | 0;
                        if (b | 0) {
                            c[d + 16 >> 2] = b;
                            c[b + 24 >> 2] = d
                        }
                        a = c[a + 4 >> 2] | 0;
                        if (a | 0) {
                            c[d + 20 >> 2] = a;
                            c[a + 24 >> 2] = d
                        }
                    }
                }
                while (0);
                c[i + 4 >> 2] = f | 1;
                c[h + f >> 2] = f;
                if ((i | 0) == (c[628] | 0)) {
                    c[625] = f;
                    return
                }
            } else {
                c[a >> 2] = e & -2;
                c[i + 4 >> 2] = b | 1;
                c[h + b >> 2] = b;
                f = b
            }
            a = f >>> 3;
            if (f >>> 0 < 256) {
                d = 2532 + (a << 1 << 2) | 0;
                b = c[623] | 0;
                a = 1 << a;
                if (! (b & a)) {
                    c[623] = b | a;
                    a = d;
                    b = d + 8 | 0
                } else {
                    b = d + 8 | 0;
                    a = c[b >> 2] | 0
                }
                c[b >> 2] = i;
                c[a + 12 >> 2] = i;
                c[i + 8 >> 2] = a;
                c[i + 12 >> 2] = d;
                return
            }
            a = f >>> 8;
            if (a) if (f >>> 0 > 16777215) e = 31;
            else {
                h = (a + 1048320 | 0) >>> 16 & 8;
                j = a << h;
                g = (j + 520192 | 0) >>> 16 & 4;
                j = j << g;
                e = (j + 245760 | 0) >>> 16 & 2;
                e = 14 - (g | h | e) + (j << e >>> 15) | 0;
                e = f >>> (e + 7 | 0) & 1 | e << 1
            } else e = 0;
            a = 2796 + (e << 2) | 0;
            c[i + 28 >> 2] = e;
            c[i + 20 >> 2] = 0;
            c[i + 16 >> 2] = 0;
            b = c[624] | 0;
            d = 1 << e;
            a: do
            if (! (b & d)) {
                c[624] = b | d;
                c[a >> 2] = i;
                c[i + 24 >> 2] = a;
                c[i + 12 >> 2] = i;
                c[i + 8 >> 2] = i
            } else {
                a = c[a >> 2] | 0;
                b: do
                if ((c[a + 4 >> 2] & -8 | 0) != (f | 0)) {
                    e = f << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0);
                    while (1) {
                        d = a + 16 + (e >>> 31 << 2) | 0;
                        b = c[d >> 2] | 0;
                        if (!b) break;
                        if ((c[b + 4 >> 2] & -8 | 0) == (f | 0)) {
                            a = b;
                            break b
                        } else {
                            e = e << 1;
                            a = b
                        }
                    }
                    c[d >> 2] = i;
                    c[i + 24 >> 2] = a;
                    c[i + 12 >> 2] = i;
                    c[i + 8 >> 2] = i;
                    break a
                }
                while (0);
                h = a + 8 | 0;
                j = c[h >> 2] | 0;
                c[j + 12 >> 2] = i;
                c[h >> 2] = i;
                c[i + 8 >> 2] = j;
                c[i + 12 >> 2] = a;
                c[i + 24 >> 2] = 0
            }
            while (0);
            j = (c[631] | 0) + -1 | 0;
            c[631] = j;
            if (j | 0) return;
            a = 2948;
            while (1) {
                a = c[a >> 2] | 0;
                if (!a) break;
                else a = a + 8 | 0
            }
            c[631] = -1;
            return
        }
        function ec(a) {
            a = a | 0;
            var b = 0;
            b = (a | 0) == 0 ? 1 : a;
            while (1) {
                a = cc(b) | 0;
                if (a | 0) break;
                a = Pc() | 0;
                if (!a) {
                    a = 0;
                    break
                }
                yb[a & 0]()
            }
            return a | 0
        }
        function fc(a) {
            a = a | 0;
            dc(a);
            return
        }
        function gc(a) {
            a = a | 0;
            Aa()
        }
        function hc(b, d) {
            b = b | 0;
            d = d | 0;
            c[b >> 2] = 0;
            c[b + 4 >> 2] = 0;
            c[b + 8 >> 2] = 0;
            if ((a[d + 11 >> 0] | 0) < 0) ic(b, c[d >> 2] | 0, c[d + 4 >> 2] | 0);
            else {
                c[b >> 2] = c[d >> 2];
                c[b + 4 >> 2] = c[d + 4 >> 2];
                c[b + 8 >> 2] = c[d + 8 >> 2]
            }
            return
        }
        function ic(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
            g = 0,
            h = 0,
            i = 0;
            g = k;
            k = k + 16 | 0;
            f = g;
            if (e >>> 0 > 4294967279) gc(b);
            if (e >>> 0 < 11) a[b + 11 >> 0] = e;
            else {
                i = e + 16 & -16;
                h = ec(i) | 0;
                c[b >> 2] = h;
                c[b + 8 >> 2] = i | -2147483648;
                c[b + 4 >> 2] = e;
                b = h
            }
            jc(b, d, e) | 0;
            a[f >> 0] = 0;
            kc(b + e | 0, f);
            k = g;
            return
        }
        function jc(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            if (c | 0) Qc(a | 0, b | 0, c | 0) | 0;
            return a | 0
        }
        function kc(b, c) {
            b = b | 0;
            c = c | 0;
            a[b >> 0] = a[c >> 0] | 0;
            return
        }
        function lc(a) {
            a = a | 0;
            return
        }
        function mc(a) {
            a = a | 0;
            lc(a);
            fc(a);
            return
        }
        function nc(a) {
            a = a | 0;
            return
        }
        function oc(a) {
            a = a | 0;
            return
        }
        function pc(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
            f = 0,
            g = 0,
            h = 0;
            h = k;
            k = k + 64 | 0;
            f = h;
            if (! (tc(a, b, 0) | 0)) if ((b | 0) != 0 ? (g = xc(b, 248, 232, 0) | 0, (g | 0) != 0) : 0) {
                b = f + 4 | 0;
                e = b + 52 | 0;
                do {
                    c[b >> 2] = 0;
                    b = b + 4 | 0
                } while (( b | 0 ) < (e | 0));
                c[f >> 2] = g;
                c[f + 8 >> 2] = a;
                c[f + 12 >> 2] = -1;
                c[f + 48 >> 2] = 1;
                Cb[c[(c[g >> 2] | 0) + 28 >> 2] & 3](g, f, c[d >> 2] | 0, 1);
                if ((c[f + 24 >> 2] | 0) == 1) {
                    c[d >> 2] = c[f + 16 >> 2];
                    b = 1
                } else b = 0
            } else b = 0;
            else b = 1;
            k = h;
            return b | 0
        }
        function qc(a, b, d, e, f, g) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            if (tc(a, c[b + 8 >> 2] | 0, g) | 0) wc(0, b, d, e, f);
            return
        }
        function rc(b, d, e, f, g) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            var h = 0;
            do
            if (! (tc(b, c[d + 8 >> 2] | 0, g) | 0)) {
                if (tc(b, c[d >> 2] | 0, g) | 0) {
                    if ((c[d + 16 >> 2] | 0) != (e | 0) ? (h = d + 20 | 0, (c[h >> 2] | 0) != (e | 0)) : 0) {
                        c[d + 32 >> 2] = f;
                        c[h >> 2] = e;
                        g = d + 40 | 0;
                        c[g >> 2] = (c[g >> 2] | 0) + 1;
                        if ((c[d + 36 >> 2] | 0) == 1 ? (c[d + 24 >> 2] | 0) == 2 : 0) a[d + 54 >> 0] = 1;
                        c[d + 44 >> 2] = 4;
                        break
                    }
                    if ((f | 0) == 1) c[d + 32 >> 2] = 1
                }
            } else vc(0, d, e, f);
            while (0);
            return
        }
        function sc(a, b, d, e) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            if (tc(a, c[b + 8 >> 2] | 0, 0) | 0) uc(0, b, d, e);
            return
        }
        function tc(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return (a | 0) == (b | 0) | 0
        }
        function uc(b, d, e, f) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            var g = 0;
            b = d + 16 | 0;
            g = c[b >> 2] | 0;
            do
            if (g) {
                if ((g | 0) != (e | 0)) {
                    f = d + 36 | 0;
                    c[f >> 2] = (c[f >> 2] | 0) + 1;
                    c[d + 24 >> 2] = 2;
                    a[d + 54 >> 0] = 1;
                    break
                }
                b = d + 24 | 0;
                if ((c[b >> 2] | 0) == 2) c[b >> 2] = f
            } else {
                c[b >> 2] = e;
                c[d + 24 >> 2] = f;
                c[d + 36 >> 2] = 1
            }
            while (0);
            return
        }
        function vc(a, b, d, e) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0;
            if ((c[b + 4 >> 2] | 0) == (d | 0) ? (f = b + 28 | 0, (c[f >> 2] | 0) != 1) : 0) c[f >> 2] = e;
            return
        }
        function wc(b, d, e, f, g) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            a[d + 53 >> 0] = 1;
            do
            if ((c[d + 4 >> 2] | 0) == (f | 0)) {
                a[d + 52 >> 0] = 1;
                b = d + 16 | 0;
                f = c[b >> 2] | 0;
                if (!f) {
                    c[b >> 2] = e;
                    c[d + 24 >> 2] = g;
                    c[d + 36 >> 2] = 1;
                    if (! ((g | 0) == 1 ? (c[d + 48 >> 2] | 0) == 1 : 0)) break;
                    a[d + 54 >> 0] = 1;
                    break
                }
                if ((f | 0) != (e | 0)) {
                    g = d + 36 | 0;
                    c[g >> 2] = (c[g >> 2] | 0) + 1;
                    a[d + 54 >> 0] = 1;
                    break
                }
                f = d + 24 | 0;
                b = c[f >> 2] | 0;
                if ((b | 0) == 2) {
                    c[f >> 2] = g;
                    b = g
                }
                if ((b | 0) == 1 ? (c[d + 48 >> 2] | 0) == 1 : 0) a[d + 54 >> 0] = 1
            }
            while (0);
            return
        }
        function xc(d, e, f, g) {
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            var h = 0,
            i = 0,
            j = 0,
            l = 0,
            m = 0,
            n = 0,
            o = 0,
            p = 0,
            q = 0;
            q = k;
            k = k + 64 | 0;
            o = q;
            n = c[d >> 2] | 0;
            p = d + (c[n + -8 >> 2] | 0) | 0;
            n = c[n + -4 >> 2] | 0;
            c[o >> 2] = f;
            c[o + 4 >> 2] = d;
            c[o + 8 >> 2] = e;
            c[o + 12 >> 2] = g;
            d = o + 16 | 0;
            e = o + 20 | 0;
            g = o + 24 | 0;
            h = o + 28 | 0;
            i = o + 32 | 0;
            j = o + 40 | 0;
            l = d;
            m = l + 36 | 0;
            do {
                c[l >> 2] = 0;
                l = l + 4 | 0
            } while (( l | 0 ) < (m | 0));
            b[d + 36 >> 1] = 0;
            a[d + 38 >> 0] = 0;
            a: do
            if (tc(n, f, 0) | 0) {
                c[o + 48 >> 2] = 1;
                Eb[c[(c[n >> 2] | 0) + 20 >> 2] & 3](n, o, p, p, 1, 0);
                d = (c[g >> 2] | 0) == 1 ? p: 0
            } else {
                Db[c[(c[n >> 2] | 0) + 24 >> 2] & 3](n, o, p, 1, 0);
                switch (c[o + 36 >> 2] | 0) {
                case 0:
                    {
                        d = (c[j >> 2] | 0) == 1 & (c[h >> 2] | 0) == 1 & (c[i >> 2] | 0) == 1 ? c[e >> 2] | 0 : 0;
                        break a
                    }
                case 1:
                    break;
                default:
                    {
                        d = 0;
                        break a
                    }
                }
                if ((c[g >> 2] | 0) != 1 ? !((c[j >> 2] | 0) == 0 & (c[h >> 2] | 0) == 1 & (c[i >> 2] | 0) == 1) : 0) {
                    d = 0;
                    break
                }
                d = c[d >> 2] | 0
            }
            while (0);
            k = q;
            return d | 0
        }
        function yc(a) {
            a = a | 0;
            lc(a);
            fc(a);
            return
        }
        function zc(a, b, d, e, f, g) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            if (tc(a, c[b + 8 >> 2] | 0, g) | 0) wc(0, b, d, e, f);
            else {
                a = c[a + 8 >> 2] | 0;
                Eb[c[(c[a >> 2] | 0) + 20 >> 2] & 3](a, b, d, e, f, g)
            }
            return
        }
        function Ac(b, d, e, f, g) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            var h = 0,
            i = 0,
            j = 0;
            do
            if (! (tc(b, c[d + 8 >> 2] | 0, g) | 0)) {
                if (! (tc(b, c[d >> 2] | 0, g) | 0)) {
                    i = c[b + 8 >> 2] | 0;
                    Db[c[(c[i >> 2] | 0) + 24 >> 2] & 3](i, d, e, f, g);
                    break
                }
                if ((c[d + 16 >> 2] | 0) != (e | 0) ? (h = d + 20 | 0, (c[h >> 2] | 0) != (e | 0)) : 0) {
                    c[d + 32 >> 2] = f;
                    i = d + 44 | 0;
                    if ((c[i >> 2] | 0) == 4) break;
                    f = d + 52 | 0;
                    a[f >> 0] = 0;
                    j = d + 53 | 0;
                    a[j >> 0] = 0;
                    b = c[b + 8 >> 2] | 0;
                    Eb[c[(c[b >> 2] | 0) + 20 >> 2] & 3](b, d, e, e, 1, g);
                    if (a[j >> 0] | 0) if (! (a[f >> 0] | 0)) {
                        f = 1;
                        b = 11
                    } else b = 15;
                    else {
                        f = 0;
                        b = 11
                    }
                    do
                    if ((b | 0) == 11) {
                        c[h >> 2] = e;
                        j = d + 40 | 0;
                        c[j >> 2] = (c[j >> 2] | 0) + 1;
                        if ((c[d + 36 >> 2] | 0) == 1 ? (c[d + 24 >> 2] | 0) == 2 : 0) {
                            a[d + 54 >> 0] = 1;
                            if (f) {
                                b = 15;
                                break
                            } else {
                                f = 4;
                                break
                            }
                        }
                        if (f) b = 15;
                        else f = 4
                    }
                    while (0);
                    if ((b | 0) == 15) f = 3;
                    c[i >> 2] = f;
                    break
                }
                if ((f | 0) == 1) c[d + 32 >> 2] = 1
            } else vc(0, d, e, f);
            while (0);
            return
        }
        function Bc(a, b, d, e) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            if (tc(a, c[b + 8 >> 2] | 0, 0) | 0) uc(0, b, d, e);
            else {
                a = c[a + 8 >> 2] | 0;
                Cb[c[(c[a >> 2] | 0) + 28 >> 2] & 3](a, b, d, e)
            }
            return
        }
        function Cc(a) {
            a = a | 0;
            return
        }
        function Dc(a) {
            a = a | 0;
            lc(a);
            fc(a);
            return
        }
        function Ec(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return tc(a, b, 0) | 0
        }
        function Fc(a) {
            a = a | 0;
            lc(a);
            fc(a);
            return
        }
        function Gc(a, b, d) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            var e = 0,
            f = 0,
            g = 0,
            h = 0,
            i = 0,
            j = 0;
            j = k;
            k = k + 64 | 0;
            h = j;
            c[d >> 2] = c[c[d >> 2] >> 2];
            if (! (Hc(a, b, 0) | 0)) if (((b | 0) != 0 ? (e = xc(b, 248, 304, 0) | 0, (e | 0) != 0) : 0) ? (c[e + 8 >> 2] & ~c[a + 8 >> 2] | 0) == 0 : 0) {
                a = a + 12 | 0;
                b = e + 12 | 0;
                if (! (tc(c[a >> 2] | 0, c[b >> 2] | 0, 0) | 0) ? !(tc(c[a >> 2] | 0, 336, 0) | 0) : 0) {
                    a = c[a >> 2] | 0;
                    if ((((a | 0) != 0 ? (g = xc(a, 248, 232, 0) | 0, (g | 0) != 0) : 0) ? (f = c[b >> 2] | 0, (f | 0) != 0) : 0) ? (i = xc(f, 248, 232, 0) | 0, (i | 0) != 0) : 0) {
                        a = h + 4 | 0;
                        b = a + 52 | 0;
                        do {
                            c[a >> 2] = 0;
                            a = a + 4 | 0
                        } while (( a | 0 ) < (b | 0));
                        c[h >> 2] = i;
                        c[h + 8 >> 2] = g;
                        c[h + 12 >> 2] = -1;
                        c[h + 48 >> 2] = 1;
                        Cb[c[(c[i >> 2] | 0) + 28 >> 2] & 3](i, h, c[d >> 2] | 0, 1);
                        if ((c[h + 24 >> 2] | 0) == 1) {
                            c[d >> 2] = c[h + 16 >> 2];
                            a = 1
                        } else a = 0
                    } else a = 0
                } else a = 1
            } else a = 0;
            else a = 1;
            k = j;
            return a | 0
        }
        function Hc(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            if (tc(a, b, 0) | 0) a = 1;
            else a = tc(b, 344, 0) | 0;
            return a | 0
        }
        function Ic(a) {
            a = a | 0;
            lc(a);
            fc(a);
            return
        }
        function Jc(b, d, e, f, g, h) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            h = h | 0;
            var i = 0,
            j = 0,
            k = 0,
            l = 0,
            m = 0,
            n = 0,
            o = 0,
            p = 0;
            if (tc(b, c[d + 8 >> 2] | 0, h) | 0) wc(0, d, e, f, g);
            else {
                p = d + 52 | 0;
                i = a[p >> 0] | 0;
                j = d + 53 | 0;
                k = a[j >> 0] | 0;
                o = c[b + 12 >> 2] | 0;
                l = b + 16 + (o << 3) | 0;
                a[p >> 0] = 0;
                a[j >> 0] = 0;
                Nc(b + 16 | 0, d, e, f, g, h);
                a: do
                if ((o | 0) > 1) {
                    m = d + 24 | 0;
                    n = b + 8 | 0;
                    o = d + 54 | 0;
                    b = b + 24 | 0;
                    do {
                        if (a[o >> 0] | 0) break a;
                        if (! (a[p >> 0] | 0)) {
                            if (a[j >> 0] | 0 ? (c[n >> 2] & 1 | 0) == 0 : 0) break a
                        } else {
                            if ((c[m >> 2] | 0) == 1) break a;
                            if (! (c[n >> 2] & 2)) break a
                        }
                        a[p >> 0] = 0;
                        a[j >> 0] = 0;
                        Nc(b, d, e, f, g, h);
                        b = b + 8 | 0
                    } while ( b >>> 0 < l >>> 0 )
                }
                while (0);
                a[p >> 0] = i;
                a[j >> 0] = k
            }
            return
        }
        function Kc(b, d, e, f, g) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            var h = 0,
            i = 0,
            j = 0,
            k = 0,
            l = 0,
            m = 0,
            n = 0,
            o = 0,
            p = 0,
            q = 0;
            a: do
            if (! (tc(b, c[d + 8 >> 2] | 0, g) | 0)) {
                if (! (tc(b, c[d >> 2] | 0, g) | 0)) {
                    q = c[b + 12 >> 2] | 0;
                    k = b + 16 + (q << 3) | 0;
                    Oc(b + 16 | 0, d, e, f, g);
                    h = b + 24 | 0;
                    if ((q | 0) <= 1) break;
                    b = c[b + 8 >> 2] | 0;
                    if ((b & 2 | 0) == 0 ? (j = d + 36 | 0, (c[j >> 2] | 0) != 1) : 0) {
                        if (! (b & 1)) {
                            b = d + 54 | 0;
                            while (1) {
                                if (a[b >> 0] | 0) break a;
                                if ((c[j >> 2] | 0) == 1) break a;
                                Oc(h, d, e, f, g);
                                h = h + 8 | 0;
                                if (h >>> 0 >= k >>> 0) break a
                            }
                        }
                        b = d + 24 | 0;
                        i = d + 54 | 0;
                        while (1) {
                            if (a[i >> 0] | 0) break a;
                            if ((c[j >> 2] | 0) == 1 ? (c[b >> 2] | 0) == 1 : 0) break a;
                            Oc(h, d, e, f, g);
                            h = h + 8 | 0;
                            if (h >>> 0 >= k >>> 0) break a
                        }
                    }
                    b = d + 54 | 0;
                    while (1) {
                        if (a[b >> 0] | 0) break a;
                        Oc(h, d, e, f, g);
                        h = h + 8 | 0;
                        if (h >>> 0 >= k >>> 0) break a
                    }
                }
                if ((c[d + 16 >> 2] | 0) != (e | 0) ? (q = d + 20 | 0, (c[q >> 2] | 0) != (e | 0)) : 0) {
                    c[d + 32 >> 2] = f;
                    p = d + 44 | 0;
                    if ((c[p >> 2] | 0) == 4) break;
                    k = b + 16 + (c[b + 12 >> 2] << 3) | 0;
                    f = d + 52 | 0;
                    l = d + 53 | 0;
                    n = d + 54 | 0;
                    m = b + 8 | 0;
                    o = d + 24 | 0;
                    h = 0;
                    i = b + 16 | 0;
                    j = 0;
                    b: while (1) {
                        if (i >>> 0 >= k >>> 0) {
                            b = 18;
                            break
                        }
                        a[f >> 0] = 0;
                        a[l >> 0] = 0;
                        Nc(i, d, e, e, 1, g);
                        if (a[n >> 0] | 0) {
                            b = 18;
                            break
                        }
                        do
                        if (a[l >> 0] | 0) {
                            if (! (a[f >> 0] | 0)) if (! (c[m >> 2] & 1)) {
                                h = 1;
                                b = 18;
                                break b
                            } else {
                                h = 1;
                                b = j;
                                break
                            }
                            if ((c[o >> 2] | 0) == 1) {
                                b = 23;
                                break b
                            }
                            if (! (c[m >> 2] & 2)) {
                                b = 23;
                                break b
                            } else {
                                h = 1;
                                b = 1
                            }
                        } else b = j;
                        while (0);
                        i = i + 8 | 0;
                        j = b
                    }
                    do
                    if ((b | 0) == 18) {
                        if ((!j ? (c[q >> 2] = e, e = d + 40 | 0, c[e >> 2] = (c[e >> 2] | 0) + 1, (c[d + 36 >> 2] | 0) == 1) : 0) ? (c[o >> 2] | 0) == 2 : 0) {
                            a[n >> 0] = 1;
                            if (h) {
                                b = 23;
                                break
                            } else {
                                h = 4;
                                break
                            }
                        }
                        if (h) b = 23;
                        else h = 4
                    }
                    while (0);
                    if ((b | 0) == 23) h = 3;
                    c[p >> 2] = h;
                    break
                }
                if ((f | 0) == 1) c[d + 32 >> 2] = 1
            } else vc(0, d, e, f);
            while (0);
            return
        }
        function Lc(b, d, e, f) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            var g = 0,
            h = 0;
            a: do
            if (! (tc(b, c[d + 8 >> 2] | 0, 0) | 0)) {
                h = c[b + 12 >> 2] | 0;
                g = b + 16 + (h << 3) | 0;
                Mc(b + 16 | 0, d, e, f);
                if ((h | 0) > 1) {
                    h = d + 54 | 0;
                    b = b + 24 | 0;
                    do {
                        Mc(b, d, e, f);
                        if (a[h >> 0] | 0) break a;
                        b = b + 8 | 0
                    } while ( b >>> 0 < g >>> 0 )
                }
            } else uc(0, d, e, f);
            while (0);
            return
        }
        function Mc(a, b, d, e) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
            g = 0;
            g = c[a + 4 >> 2] | 0;
            f = g >> 8;
            if (g & 1) f = c[(c[d >> 2] | 0) + f >> 2] | 0;
            a = c[a >> 2] | 0;
            Cb[c[(c[a >> 2] | 0) + 28 >> 2] & 3](a, b, d + f | 0, (g & 2 | 0) == 0 ? 2 : e);
            return
        }
        function Nc(a, b, d, e, f, g) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            var h = 0,
            i = 0;
            i = c[a + 4 >> 2] | 0;
            h = i >> 8;
            if (i & 1) h = c[(c[e >> 2] | 0) + h >> 2] | 0;
            a = c[a >> 2] | 0;
            Eb[c[(c[a >> 2] | 0) + 20 >> 2] & 3](a, b, d, e + h | 0, (i & 2 | 0) == 0 ? 2 : f, g);
            return
        }
        function Oc(a, b, d, e, f) {
            a = a | 0;
            b = b | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            var g = 0,
            h = 0;
            h = c[a + 4 >> 2] | 0;
            g = h >> 8;
            if (h & 1) g = c[(c[d >> 2] | 0) + g >> 2] | 0;
            a = c[a >> 2] | 0;
            Db[c[(c[a >> 2] | 0) + 24 >> 2] & 3](a, b, d + g | 0, (h & 2 | 0) == 0 ? 2 : e, f);
            return
        }
        function Pc() {
            var a = 0;
            a = c[747] | 0;
            c[747] = a + 0;
            return a | 0
        }
        function Qc(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
            g = 0,
            h = 0;
            if ((e | 0) >= 8192) return Ca(b | 0, d | 0, e | 0) | 0;
            h = b | 0;
            g = b + e | 0;
            if ((b & 3) == (d & 3)) {
                while (b & 3) {
                    if (!e) return h | 0;
                    a[b >> 0] = a[d >> 0] | 0;
                    b = b + 1 | 0;
                    d = d + 1 | 0;
                    e = e - 1 | 0
                }
                e = g & -4 | 0;
                f = e - 64 | 0;
                while ((b | 0) <= (f | 0)) {
                    c[b >> 2] = c[d >> 2];
                    c[b + 4 >> 2] = c[d + 4 >> 2];
                    c[b + 8 >> 2] = c[d + 8 >> 2];
                    c[b + 12 >> 2] = c[d + 12 >> 2];
                    c[b + 16 >> 2] = c[d + 16 >> 2];
                    c[b + 20 >> 2] = c[d + 20 >> 2];
                    c[b + 24 >> 2] = c[d + 24 >> 2];
                    c[b + 28 >> 2] = c[d + 28 >> 2];
                    c[b + 32 >> 2] = c[d + 32 >> 2];
                    c[b + 36 >> 2] = c[d + 36 >> 2];
                    c[b + 40 >> 2] = c[d + 40 >> 2];
                    c[b + 44 >> 2] = c[d + 44 >> 2];
                    c[b + 48 >> 2] = c[d + 48 >> 2];
                    c[b + 52 >> 2] = c[d + 52 >> 2];
                    c[b + 56 >> 2] = c[d + 56 >> 2];
                    c[b + 60 >> 2] = c[d + 60 >> 2];
                    b = b + 64 | 0;
                    d = d + 64 | 0
                }
                while ((b | 0) < (e | 0)) {
                    c[b >> 2] = c[d >> 2];
                    b = b + 4 | 0;
                    d = d + 4 | 0
                }
            } else {
                e = g - 4 | 0;
                while ((b | 0) < (e | 0)) {
                    a[b >> 0] = a[d >> 0] | 0;
                    a[b + 1 >> 0] = a[d + 1 >> 0] | 0;
                    a[b + 2 >> 0] = a[d + 2 >> 0] | 0;
                    a[b + 3 >> 0] = a[d + 3 >> 0] | 0;
                    b = b + 4 | 0;
                    d = d + 4 | 0
                }
            }
            while ((b | 0) < (g | 0)) {
                a[b >> 0] = a[d >> 0] | 0;
                b = b + 1 | 0;
                d = d + 1 | 0
            }
            return h | 0
        }
        function Rc(b, d, e) {
            b = b | 0;
            d = d | 0;
            e = e | 0;
            var f = 0,
            g = 0,
            h = 0,
            i = 0;
            h = b + e | 0;
            d = d & 255;
            if ((e | 0) >= 67) {
                while (b & 3) {
                    a[b >> 0] = d;
                    b = b + 1 | 0
                }
                f = h & -4 | 0;
                g = f - 64 | 0;
                i = d | d << 8 | d << 16 | d << 24;
                while ((b | 0) <= (g | 0)) {
                    c[b >> 2] = i;
                    c[b + 4 >> 2] = i;
                    c[b + 8 >> 2] = i;
                    c[b + 12 >> 2] = i;
                    c[b + 16 >> 2] = i;
                    c[b + 20 >> 2] = i;
                    c[b + 24 >> 2] = i;
                    c[b + 28 >> 2] = i;
                    c[b + 32 >> 2] = i;
                    c[b + 36 >> 2] = i;
                    c[b + 40 >> 2] = i;
                    c[b + 44 >> 2] = i;
                    c[b + 48 >> 2] = i;
                    c[b + 52 >> 2] = i;
                    c[b + 56 >> 2] = i;
                    c[b + 60 >> 2] = i;
                    b = b + 64 | 0
                }
                while ((b | 0) < (f | 0)) {
                    c[b >> 2] = i;
                    b = b + 4 | 0
                }
            }
            while ((b | 0) < (h | 0)) {
                a[b >> 0] = d;
                b = b + 1 | 0
            }
            return h - e | 0
        }
        function Sc(a) {
            a = a | 0;
            var b = 0,
            d = 0;
            d = c[i >> 2] | 0;
            b = d + a | 0;
            if ((a | 0) > 0 & (b | 0) < (d | 0) | (b | 0) < 0) {
                V() | 0;
                ka(12);
                return - 1
            }
            c[i >> 2] = b;
            if ((b | 0) > (S() | 0) ? (R() | 0) == 0 : 0) {
                c[i >> 2] = d;
                ka(12);
                return - 1
            }
            return d | 0
        }
        function Tc(a, b) {
            a = a | 0;
            b = b | 0;
            return vb[a & 3](b | 0) | 0
        }
        function Uc(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            return wb[a & 3](b | 0, c | 0) | 0
        }
        function Vc(a, b, c, d) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            return xb[a & 7](b | 0, c | 0, d | 0) | 0
        }
        function Wc(a) {
            a = a | 0;
            yb[a & 0]()
        }
        function Xc(a, b) {
            a = a | 0;
            b = b | 0;
            zb[a & 15](b | 0)
        }
        function Yc(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            Ab[a & 3](b | 0, c | 0)
        }
        function Zc(a, b, c, d) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            Bb[a & 1](b | 0, c | 0, d | 0)
        }
        function _c(a, b, c, d, e) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            e = e | 0;
            Cb[a & 3](b | 0, c | 0, d | 0, e | 0)
        }
        function $c(a, b, c, d, e, f) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            Db[a & 3](b | 0, c | 0, d | 0, e | 0, f | 0)
        }
        function ad(a, b, c, d, e, f, g) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            g = g | 0;
            Eb[a & 3](b | 0, c | 0, d | 0, e | 0, f | 0, g | 0)
        }
        function bd(a) {
            a = a | 0;
            P(0);
            return 0
        }
        function cd(a, b) {
            a = a | 0;
            b = b | 0;
            P(1);
            return 0
        }
        function dd(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            P(2);
            return 0
        }
        function ed() {
            P(3)
        }
        function fd(a) {
            a = a | 0;
            P(4)
        }
        function gd(a, b) {
            a = a | 0;
            b = b | 0;
            P(5)
        }
        function hd(a, b, c) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            P(6)
        }
        function id(a, b, c, d) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            P(7)
        }
        function jd(a, b, c, d, e) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            e = e | 0;
            P(8)
        }
        function kd(a, b, c, d, e, f) {
            a = a | 0;
            b = b | 0;
            c = c | 0;
            d = d | 0;
            e = e | 0;
            f = f | 0;
            P(9)
        }

        // EMSCRIPTEN_END_FUNCS
        var vb = [bd, Pb, Mb, Wb];
        var wb = [cd, Rb, Ub, cd];
        var xb = [dd, pc, Ec, Gc, Sb, dd, dd, dd];
        var yb = [ed];
        var zb = [fd, lc, mc, nc, oc, yc, Dc, Fc, Ic, Qb, Lb, Ob, fd, fd, fd, fd];
        var Ab = [gd, Tb, Nb, gd];
        var Bb = [hd, Vb];
        var Cb = [id, sc, Bc, Lc];
        var Db = [jd, rc, Ac, Kc];
        var Eb = [kd, qc, zc, Jc];
        return {
            __GLOBAL__sub_I_bind_cpp: Yb,
            __GLOBAL__sub_I_demo01_cpp: Xb,
            ___errno_location: $b,
            ___getTypeName: _b,
            _free: dc,
            _malloc: cc,
            _memcpy: Qc,
            _memset: Rc,
            _sbrk: Sc,
            dynCall_ii: Tc,
            dynCall_iii: Uc,
            dynCall_iiii: Vc,
            dynCall_v: Wc,
            dynCall_vi: Xc,
            dynCall_vii: Yc,
            dynCall_viii: Zc,
            dynCall_viiii: _c,
            dynCall_viiiii: $c,
            dynCall_viiiiii: ad,
            establishStackSpace: Ib,
            setThrew: Jb,
            stackAlloc: Fb,
            stackRestore: Hb,
            stackSave: Gb
        }
    })

    // EMSCRIPTEN_END_ASM
    (Module.asmGlobalArg, Module.asmLibraryArg, buffer);
    var __GLOBAL__sub_I_bind_cpp = Module["__GLOBAL__sub_I_bind_cpp"] = asm["__GLOBAL__sub_I_bind_cpp"];
    var __GLOBAL__sub_I_demo01_cpp = Module["__GLOBAL__sub_I_demo01_cpp"] = asm["__GLOBAL__sub_I_demo01_cpp"];
    var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
    var ___getTypeName = Module["___getTypeName"] = asm["___getTypeName"];
    var _free = Module["_free"] = asm["_free"];
    var _malloc = Module["_malloc"] = asm["_malloc"];
    var _memcpy = Module["_memcpy"] = asm["_memcpy"];
    var _memset = Module["_memset"] = asm["_memset"];
    var _sbrk = Module["_sbrk"] = asm["_sbrk"];
    var establishStackSpace = Module["establishStackSpace"] = asm["establishStackSpace"];
    var setThrew = Module["setThrew"] = asm["setThrew"];
    var stackAlloc = Module["stackAlloc"] = asm["stackAlloc"];
    var stackRestore = Module["stackRestore"] = asm["stackRestore"];
    var stackSave = Module["stackSave"] = asm["stackSave"];
    var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
    var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
    var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
    var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
    var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
    var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
    var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
    var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
    var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
    var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
    Module["asm"] = asm;
    if (memoryInitializer) {
        if (!isDataURI(memoryInitializer)) {
            memoryInitializer = locateFile(memoryInitializer)
        }
        if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
            var data = Module["readBinary"](memoryInitializer);
            HEAPU8.set(data, GLOBAL_BASE)
        } else {
            addRunDependency("memory initializer");
            var applyMemoryInitializer = (function(data) {
                if (data.byteLength) data = new Uint8Array(data);
                HEAPU8.set(data, GLOBAL_BASE);
                if (Module["memoryInitializerRequest"]) delete Module["memoryInitializerRequest"].response;
                removeRunDependency("memory initializer")
            });
            function doBrowserLoad() {
                Module["readAsync"](memoryInitializer, applyMemoryInitializer, (function() {
                    throw "could not load memory initializer " + memoryInitializer
                }))
            }
            var memoryInitializerBytes = tryParseAsDataURI(memoryInitializer);
            if (memoryInitializerBytes) {
                applyMemoryInitializer(memoryInitializerBytes.buffer)
            } else if (Module["memoryInitializerRequest"]) {
                function useRequest() {
                    var request = Module["memoryInitializerRequest"];
                    var response = request.response;
                    if (request.status !== 200 && request.status !== 0) {
                        var data = tryParseAsDataURI(Module["memoryInitializerRequestURL"]);
                        if (data) {
                            response = data.buffer
                        } else {
                            console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " + request.status + ", retrying " + memoryInitializer);
                            doBrowserLoad();
                            return
                        }
                    }
                    applyMemoryInitializer(response)
                }
                if (Module["memoryInitializerRequest"].response) {
                    setTimeout(useRequest, 0)
                } else {
                    Module["memoryInitializerRequest"].addEventListener("load", useRequest)
                }
            } else {
                doBrowserLoad()
            }
        }
    }
    function ExitStatus(status) {
        this.name = "ExitStatus";
        this.message = "Program terminated with exit(" + status + ")";
        this.status = status
    }
    ExitStatus.prototype = new Error;
    ExitStatus.prototype.constructor = ExitStatus;
    dependenciesFulfilled = function runCaller() {
        if (!Module["calledRun"]) run();
        if (!Module["calledRun"]) dependenciesFulfilled = runCaller
    };
    function run(args) {
        args = args || Module["arguments"];
        if (runDependencies > 0) {
            return
        }
        preRun();
        if (runDependencies > 0) return;
        if (Module["calledRun"]) return;
        function doRun() {
            if (Module["calledRun"]) return;
            Module["calledRun"] = true;
            if (ABORT) return;
            ensureInitRuntime();
            preMain();
            if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
            postRun()
        }
        if (Module["setStatus"]) {
            Module["setStatus"]("Running...");
            setTimeout((function() {
                setTimeout((function() {
                    Module["setStatus"]("")
                }), 1);
                doRun()
            }), 1)
        } else {
            doRun()
        }
    }
    Module["run"] = run;
    function abort(what) {
        if (Module["onAbort"]) {
            Module["onAbort"](what)
        }
        if (what !== undefined) {
            out(what);
            err(what);
            what = JSON.stringify(what)
        } else {
            what = ""
        }
        ABORT = true;
        EXITSTATUS = 1;
        throw "abort(" + what + "). Build with -s ASSERTIONS=1 for more info."
    }
    Module["abort"] = abort;
    if (Module["preInit"]) {
        if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
        while (Module["preInit"].length > 0) {
            Module["preInit"].pop()()
        }
    }
    Module["noExitRuntime"] = true;
    run();
    window.inno = Module
}))()