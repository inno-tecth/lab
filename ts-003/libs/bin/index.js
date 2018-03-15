define("ImageHelper", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ImageHelper = /** @class */ (function () {
        function ImageHelper() {
        }
        ImageHelper.toBase64 = function (img) {
            return null;
        };
        ImageHelper.fromBase64 = function (str) {
            return null;
        };
        return ImageHelper;
    }());
    exports.ImageHelper = ImageHelper;
});
define("post", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function post(url, data) {
    }
    exports.post = post;
});
define("mylibs", ["require", "exports", "post", "ImageHelper"], function (require, exports, post_1, ImageHelper_1) {
    "use strict";
    return { ImageHelper: ImageHelper_1.ImageHelper, post: post_1.post };
});
//# sourceMappingURL=index.js.map