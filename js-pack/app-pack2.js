var path  = require('path');
var fs = require('fs');
var UglifyJS = require("uglify-js");
var hound = require('hound');

function isJsFile(path){ return path && path.substr(path.length - 3) == ".js"; }
function listAllJS(root, ret)
{
    var files = fs.readdirSync(root);
    var jsfiles = [];
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
            jsfiles.push(path);
            console.log(" " + files[i]);
        }
    }
    for(var i = 0; i < jsfiles.length; i ++)
    {
        ret.push(jsfiles[i]);
    }
}
function build(release)
{
    try
    {
        var out = path.resolve('./app/app.js');
        var files = [];
        var rootPath = path.resolve('./src') + '/';
        var lstat = fs.lstatSync(rootPath + 'files.js');
        if(lstat && lstat.isFile())
        {
            var data = JSON.parse(fs.readFileSync(rootPath + 'files.js'));
            for(var i = 0; i < data.length; i ++)
            {
                lstat = fs.lstatSync(rootPath +  data[i]);
                if(!lstat || !lstat.isFile())
                    continue;
                files.push(rootPath +  data[i]);
                console.log(" " + data[i]);
            }
        }
        else
        {
            listAllJS(rootPath, files);
        }
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
    catch(er)
    {
        console.error(er);
    }
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