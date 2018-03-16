export declare function post(url: string, data: {
    [key: string]: string;
}): void;
export declare class ImageHelper {
    static toBase64(img: HTMLImageElement): string;
    static fromBase64(str: string): HTMLImageElement;
}
export declare class Image {
    constructor();
    private _url;
    url: string;
}
