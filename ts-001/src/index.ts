class Application
{
    constructor()
    {

    }
    private _name:string;
    private _version:string;
    public set name(v:string)
    { 
        this._name = v;
    }
    public set version(v:string)
    {
        this._version = v;
    }
    public run()
    {
        let value = this._name + " " + this._version;
        document.write(value);
    }
}

let app = new Application();
app.name = "Hello world.";
app.version = "1.0";
app.run();
