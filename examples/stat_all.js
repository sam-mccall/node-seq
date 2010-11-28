var fs = require('fs');
var Hash = require('traverse/hash');
var Seq = require('seq');

Seq()
    .seq(function () {
        fs.readdir(__dirname, this);
    })
    .flatten()
    .forEach(function (file) {
        console.log(file);
        this.par(file, function () {
            var seq = this;
            fs.stat(__dirname + '/' + file, this);
        });
    })
    .seq(function () {
        var sizes = Hash.map(this.vars, function (s) { return s.size })
        console.dir(sizes);
    })
;
