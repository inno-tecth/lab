var path  = require('path');
var fs = require('fs');
var UglifyJS = require("uglify-js");
var chokidar = require('chokidar');
var hound = require('hound');

function isJsFile(path){ return path && path.substr(path.length - 3) == ".js"; }
function listAllJS(root, ret)
{
    var files = fs.readdirSync(root);
    for(var i = 0; i < files.length; i ++)
    {
        if(!files[i])continue;
        var path = root + files[i];
        if(fs.lstatSync(path).isDirectory())
        {
            listAllJS(path + '/', ret);
            continue;
        }
        if(isJsFile(path))
        {
            console.log(" " + files[i]);
            ret.push(path);
        }
    }
}
function build(release)
{
    var out = path.resolve('./app/app.js');
    var files = [];
    listAllJS(path.resolve('./src') + '/', files);
    var content = "";
    for(var i = 0; i < files.length; i ++)
    {
        content += "//" + files[i] + "\r\n";
        content +=  fs.readFileSync(files[i]) + '\r\n\r\n';
        
    }
   
    if(release)
    {
        var options = { toplevel: false };
        fs.writeFileSync(out, UglifyJS.minify({
            "app.js": content
        }, options).code, "utf8");
    }
    else
    {
        fs.writeFileSync(out, content, "utf8");
    }
    console.log('Build successfully!');
}
(function()
{
    if(process.argv.indexOf('-release') != -1)
    {
        build(true);
        return;
    }
    build(false);
    var watcher = hound.watch('./src/.')
    watcher.on('create', function(file, stats) {
        if(isJsFile(file)){build(false);}
    });
    watcher.on('change', function(file, stats) {
        if(isJsFile(file)){build(false);}
    });
    watcher.on('delete', function(file) {
        if(isJsFile(file)){build(false);}
    });
})();