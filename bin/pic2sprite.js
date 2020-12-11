#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const glob = require("glob");
const chalk = require("chalk");
const program = require('commander')
const argv = require('yargs').argv
const shell = require('shelljs')
const CryptoJS = require("crypto-js");
const Spritesmith = require('spritesmith');
const base64Img = require('base64-img');
const images = require('images');


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
    .option('-m', '输出合并后的文件，可以直接使用在样式文件中')
    .option('-n', '输出的背景图名称')
    .option('-b', '小于6k自动转为 base64 字符串')

program
    .description('将当前目录下的png/jpg文件合成雪碧图，并输出css')
    .action(() => {
        let {remUnit, u, m, merge, name, n, b, base} = argv
        remUnit = remUnit || u
        merge = merge || m
        name = name || n
        base = base || b

        if (remUnit === true) remUnit = 100
        if (base === true) base = 6
        let css = ''
        glob('*.{png,jpg}', {}, (er, files) => {
            let length = files.length
            if (base) {
                files = files.filter((item) => {
                    const style = fs.readFileSync(path.join(cwd, item))
                    if (style.length / 1000 < base) {
                        base64Img.base64(path.join(cwd, item), function (err, data) {
                            const img = images(item)
                            const width = img.width()
                            const height = img.height()
                            css += remUnit ? `
.${item.split('.')[0]} {
    width: ${width / remUnit}rem; 
    height: ${height / remUnit}rem;
    background: url(${data});
}
` : `
.${item.split('.')[0]} {
    width: ${width}px; 
    height: ${height}px;
    background: url(${data});
}
`
                            fs.writeFileSync(path.join(cwd, 'sprite-css.css'), css);
                        })
                    } else {
                        return true
                    }
                })
            }
            Spritesmith.run({
                src: files,
                padding: 10,
                exportOpts: {
                    quality: 100
                }
            }, function handleResult(err, result) {
                const {image, coordinates, properties} = result
                name = name || 'bg' + CryptoJS.MD5(image).toString()
                if (merge) {
                    css += remUnit ? `
.${name}{
    background: url('${name}.png') no-repeat;
    background-size: ${properties.width / remUnit}rem ${properties.height / remUnit}rem;
}
` : `
.${name}{
    background: url('${name}.png') no-repeat;
    background-size: ${properties.width}px ${properties.height}px;
}
`
                }
                Object.keys(coordinates).forEach(item => {
                    const {x, y, width, height} = coordinates[item]
                    if (merge) {
                        css += remUnit ? `
.${name}.${item.split('.')[0]} {
    width: ${width / remUnit}rem; 
    height: ${height / remUnit}rem;
    background-position: -${x / remUnit}rem -${y / remUnit}rem;
}
` : `
.${name}.${item.split('.')[0]} {
    width: ${width}px; 
    height: ${height}px;
    background-position: -${x}px -${y}px;
}
`
                    } else {
                        css += remUnit ? `
.${item.split('.')[0]} {
    width: ${width / remUnit}rem; 
    height: ${height / remUnit}rem;
    background: url('${name}.png') -${x / remUnit}rem -${y / remUnit}rem;
    background-size: ${properties.width / remUnit}rem ${properties.height / remUnit}rem;
}
` : `
.${item.split('.')[0]} {
    width: ${width}px; 
    height: ${height}px;
    background: url('${name}.png') -${x}px -${y}px;
    background-size: ${properties.width}px ${properties.height}px;
}
`
                    }
                })
                fs.writeFileSync(path.join(cwd, `${name}.png`), image);
                console.log(chalk.blue(`生成 ${name}.png 成功！`))
                fs.writeFileSync(path.join(cwd, 'sprite-css.css'), css);
                console.log(chalk.blue(`生成 sprite-css.css 成功！`))
            });
        })
    })
program.parse(process.argv)
