declare module "ImageHelper" {
    export class ImageHelper {
        static toBase64(img: HTMLImageElement): string;
        static fromBase64(str: string): HTMLImageElement;
    }
}
declare module "post" {
    export function post(url: string, data: {
        [key: string]: string;
    }): void;
}
declare module "mylibs" {
    import { post } from "post";
    import { ImageHelper } from "ImageHelper";
    const _default: {
        ImageHelper: typeof ImageHelper;
        post: typeof post;
    };
    export = _default;
}
