Seq
===

Seq is an asynchronous flow control library with a chainable interface for
sequential and parallel actions. Even the error handling is chainable.

Examples
========

parseq.js
---------
    var fs = require('fs');
    var exec = require('child_process').exec;
    
    var Seq = require('seq');
    Seq()
        .seq(function () {
            exec('whoami', this);
        })
        .par(function (who) {
            exec('groups ' + who, this());
            fs.readFile(__filename, 'ascii', this());
        })
        .seq(function (groups, src) {
            console.log('Groups: ' + groups[0].trim());
            console.log('This file has ' + src.length + ' bytes');
        })
    ;

Output:

    Groups: substack : substack dialout cdrom floppy audio src video plugdev games netdev fuse www
    This file has 439 bytes


There is an implicit error handler at the end of all chains. The above code is
actually the same as:

parseq_catch.js
---------------

    var fs = require('fs');
    var exec = require('child_process').exec;
    
    var Seq = require('seq');
    Seq()
        .seq(function () {
            exec('whoami', this);
        })
        .par(function (who) {
            exec('groups ' + who, this());
            fs.readFile(__filename, 'ascii', this());
        })
        .seq(function (groups, src) {
            console.log('Groups: ' + groups[0].trim());
            console.log('This file has ' + src.length + ' bytes');
        })
        .catch(function (err) {
            console.error(err.stack ? err.stack : err)
        })
    ;

Everytime `this` or `this()` for `.par()` gets executed, its first argument
should be the error value. This error value propagates downward until it hits a
`.catch()`. There is an implicit `.catch()` at the bottom of all chains like the
one in the example immediately above.

Seq also has some nifty asynchronous list operations: `forEach`, `parEach`,
and `seqEach`.
