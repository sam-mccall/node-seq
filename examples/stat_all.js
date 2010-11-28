var fs = require('fs');
var Hash = require('traverse/hash');
var Seq = require('seq');

Seq()
    .seq(function () {
        fs.readdir(__dirname, this);
    })
    .flatten()
    .parEach(function (file) {
        console.log(file);
        fs.stat(__dirname + '/' + file, this);
    })
    .seq(function () {
    console.dir(this.stack);
        var sizes = Hash.map(this.vars, function (s) { return s.size })
        console.dir(sizes);
    })
;
