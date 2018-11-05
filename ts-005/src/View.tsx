import {UI, React} from './UIElement';
class MyBox
{
    public node:HTMLElement;
    public id:string;
    public props:{id:string};
    public constructor()
    {
        UI.push(this);
        <div id="node"></div>;
        UI.pop();
    }
}
class MyButton
{
    public node:HTMLElement;
    public constructor()
    {
        UI.push(this);
        <button id="node"></button>;
        UI.pop();
    }
}
export class MyView
{
    public node:HTMLElement;
    public box:MyBox;
    public constructor()
    {
        UI.push(this);
        <div id="node">
            <div style={{background:'red'}}>one</div>
            <div style={{background:'blue'}}>two</div>
            <MyBox id="box"  >
                <div>
                    <MyButton>aaa</MyButton>
                    <MyButton>bbb</MyButton>
                </div>
            </MyBox>
        </div>;
        UI.pop();
    }
}