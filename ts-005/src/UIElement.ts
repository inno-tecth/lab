import * as CSS from 'csstype';
interface CSSProperties extends CSS.Properties<string | number> {}

interface HtmlElementAttributes {
    id?:string;
    name?:string;
    style?:CSSProperties;
    className?:string;    
}

declare global {
    namespace JSX {
        // tslint:disable-next-line:no-empty-interface
        interface Element extends HTMLElement { }
        interface ElementAttributesProperty { props: {}; }
        //interface ElementChildrenAttribute { children: {}; }


        interface IntrinsicElements {
            div:HtmlElementAttributes,
            button:HtmlElementAttributes,
        }
    }
}
class UIElement
{
    private _contexts:Array<any>;
    public constructor()
    {
        this._contexts = [];
        this.create = this.create.bind(this);
    }
    public push(context:any):void
    {
        this._contexts.push(context);
    
    }
    public pop()
    {
        this._contexts.pop();
    }
    public create(name:string|any, attr:any, ... children:any[]):any
    {
        let node = typeof name == 'string' ? document.createElement(name) : new name();
        let parent:HTMLElement  = node instanceof HTMLElement ? node : node.node;
        for(let k in attr)
        {
            switch(k)
            {
                case 'style':
                {
                    let style = attr[k];
                    for(let n in style)
                    {
                        (<any>parent.style)[n] = style[n];
                    }
                }break;
                default: 
                {
                    parent.setAttribute(k, attr[k]);
                }break;
            }
        }
        
        if(parent && children && children.length > 0)
        {
            for(let i =0 ; i < children.length; i ++)
            {
                let child = children[i];
                if(typeof child == 'string')
                {
                    parent.innerText = child;
                    continue;
                }   
                if(child instanceof HTMLElement)
                {
                    parent.appendChild(child);
                    continue;
                }
                child = child ? child.node : null;
                if(child)
                {
                    parent.appendChild(child);
                }
            }
        }

        let id = attr ? attr['id'] : null;
        if(id)
        {
            this._contexts[this._contexts.length-1][id] = node;
        }
        return node;
        
    }
}
export var UI = new UIElement();
export var React = { createElement : UI.create };