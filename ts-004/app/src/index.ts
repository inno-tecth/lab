import {Image,ImageHelper,post} from 'mylibs'

let s = ImageHelper.fromBase64('test');
let img = new Image();
img.url = "http://www.ok.com/"
post('http://ok/', null);