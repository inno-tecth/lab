var path  = require('path');
var fs = require('fs');

function getEntryInfo()
{
    var tsconfig = JSON.parse(fs.readFileSync(path.resolve('./tsconfig.json')));
    var file = tsconfig ? tsconfig.include[0] : '';
    if(!file)
    {
        console.log("Failed to find tsconfig.json.");
        return null;
    }

    var pos = file.lastIndexOf(".ts");
    var src = file.substr(0, pos) + ".src.ts";
    pos = file.lastIndexOf('/');
    var dir = pos != -1 ? file.substr(0, pos + 1) : "./";
    return {
        content: fs.readFileSync(path.resolve(src)).toString(),
        outPath : file,
        dir: dir
    };
}

function expandContent(content, dir, files)
{
    var ret = '\r\n';
    while(true)
    {
        var pos = content.indexOf('\n');
        var line = "";
        if(pos == -1)
        {
            line = content;
            content = "";
        }
        else
        {
            line = content.substr(0, pos);
            content = content.substr(pos + 1);
        }
        
        if(line.indexOf('import ') == 0)
        {
            var imps =  line;
            line = line.substr(line.lastIndexOf(" ") + 1);
            while(true)
            {
                var char = line.charAt(0);
                if(char == ';' || char == '"' || char == ' ' || char == '\'' || char == '\r' ||  char == '\n')
                {
                    line = line.substr(1);
                    continue;
                }
                break;
            }
            while(true)
            {
                var char = line.charAt(line.length - 1);
                if(char == ';' || char == '"' || char == ' ' || char == '\'' || char == '\r' ||  char == '\n')
                {
                    line = line.substr(0, line.length - 1);
                    continue;
                }
                break;
            }
            line += '.ts';
            
            var file = dir + line;
            var fullPath = path.resolve(file);
            if(files[fullPath])
                continue;
            files[fullPath] = true;
            console.log(fullPath);  
            var buffer =  null;
            try
            {
                buffer = fs.readFileSync(fullPath);
            }
            catch(er){}
            if(!buffer)
            {
                ret += imps + '\n';
                continue;
            }
            pos = file.lastIndexOf('/');
            ret += expandContent(buffer.toString(), pos != -1 ? file.substr(0, pos + 1) : "./", files);
        }
        else
        {
            ret += line + '\n';
            ret += content;
            break;
        }
    }
    return ret;
}

(function (){
    var info = getEntryInfo();
    if(!info) return;
    info.result = '';
    info.files = {};
    info.result = expandContent(info.content, info.dir, info.files);
    fs.writeFileSync(info.outPath, info.result);
    console.log('Successfully!');
})();
