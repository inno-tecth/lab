//@see https://www.tslang.cn/docs/handbook/jsx.html
import { MyView } from "./View";


(function (){
    let view = new MyView();
    console.log(view);
    document.getElementById('root').appendChild(view.node);
})();