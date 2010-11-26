var fs = require('fs');
var Seq = require('seq');
var exec = require('child_process').exec;

Seq()
    .seq(function () {
        exec('whoami', this);
    })
    .par(function (who) {
        exec('groups ' + who, this());
        fs.readFile(__filename, 'ascii', this());
    })
    .seq(function (groups, src) {
        console.log('Groups: ' + groups[0]);
        console.log('This file has ' + src.length + ' bytes');
    })
;
