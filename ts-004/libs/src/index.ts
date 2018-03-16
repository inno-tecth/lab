

export function post(url:string, data:{[key:string]:string}):void
{
    
}
export class ImageHelper
{
    public static toBase64(img:HTMLImageElement):string
    {
        return null;
    }
    public static fromBase64(str:string):HTMLImageElement
    {
        return null;
    }
}
export class Image
{
    public constructor()
    {

    }
    private _url:string;
    public get url():string { return this._url;; }
    public set url(v:string)    { this._url = v; }
}
