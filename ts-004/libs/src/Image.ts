export class Image
{
    public constructor()
    {

    }
    private _url:string;
    public get url():string { return this._url;; }
    public set url(v:string)    { this._url = v; }
}