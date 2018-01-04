const path = require('path');

module.exports =
    {
        entry: './src/index.ts',
        output:
        {
            filename: 'app.js',
            path: path.resolve(__dirname, './')
        },
        module:
        {
            rules:
            [
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
                {
                    test: /\.(png|svg|jpg|gif)$/,
                    use: ['file-loader']
                },
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules|layout/
                }
            ]
        },
        resolve: {  extensions: [ ".tsx", ".ts", ".js" ] }
    };
