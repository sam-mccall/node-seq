var fs = require('fs');
var exec = require('child_process').exec;

var Seq = require('seq');
Seq()
//    .seq(function () {
//        exec('whoami', this)
//    })
    .par(function (who) {
        //exec('groups ' + who, this);
        this(null, 'meowsy');
    })
    .par(function () {
        //fs.readFile(__filename, 'ascii', this);
        this(null, 'what');
    })
    .seq(function () {
console.dir([].slice.call(arguments));
//        console.log('Groups: ' + groups.trim());
//        console.log('This file has ' + src.length + ' bytes');
    })
;
