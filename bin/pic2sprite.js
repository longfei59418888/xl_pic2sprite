#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const glob = require("glob");
const program = require('commander')
const argv = require('yargs').argv
const shell = require('shelljs')
const Spritesmith = require('spritesmith');

try {
    var localWebpack = require.resolve(path.join(process.cwd(), "node_modules", "pic2sprite", "bin", "pic2sprite.js"));
    if (__filename !== localWebpack) {
        return require(localWebpack);
    }
} catch (e) {
}

const package = JSON.parse(shell.cat(path.join(__dirname, '../package.json')))
const cwd = process.cwd()

program
    .version(package.version)
    .usage('')
    .option('-u', '输出 rem 的css 文件，默认比例： 100')

program
    .description('将当前目录下的png/jpg文件合成雪碧图，并输出css')
    .action(() => {
        let {remUnit, u} = argv
        remUnit = remUnit || u
        if (remUnit === true) remUnit = 100
        glob('*.{png,jpg}', {}, (er, files) => {
            Spritesmith.run({
                src: files,
                padding: 10,
                exportOpts: {
                    quality: 100
                }
            }, function handleResult(err, result) {
                const {image, coordinates, properties} = result
                let css = ''
                Object.keys(coordinates).forEach(item => {
                    const {x, y, width, height} = coordinates[item]
                    const info = remUnit ? `
.bg-${item.split('.')[0]} {
    width: ${width / remUnit}rem; 
    height: ${height / remUnit}rem;
    background: url('sprite-images.png') -${x / remUnit}rem -${y / remUnit}rem;
    background-size: ${properties.width / remUnit}rem ${properties.height / remUnit}rem;
}
` : `
.bg-${item.split('.')[0]} {
    width: ${width}px; 
    height: ${height}px;
    background: url('sprite-images.png') -${x}px -${y}px;
    background-size: ${properties.width}px ${properties.height}px;
}
`
                    css += info
                })
                fs.writeFileSync(path.join(cwd, 'sprite-images.png'), image);
                fs.writeFileSync(path.join(cwd, 'sprite-css.css'), css);

            });
        })
    })
program.parse(process.argv)
