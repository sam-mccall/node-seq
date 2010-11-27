var EventEmitter = require('events').EventEmitter;
var Hash = require('traverse/hash');
var Chainsaw = require('chainsaw');

module.exports = Seq;
function Seq (acc) {
    var context = {
        vars : {},
        args : {},
        stack : [],
        parallel : 0,
        emitter : new EventEmitter,
    };
    
    return Chainsaw(function (saw) {
        builder.call(this, saw, context);
    });
}

function builder (saw, context) {
    function action (key, f) {
        var cb = function (err) {
            var args = [].slice.call(arguments, 1);
            if (err) {
                context.stack = [ [err] ];
                var i = saw.actions
                    .map(function (x) { return x.name == 'catch' })
                    .indexOf(true)
                ;
                saw.actions.splice(i);
                context.emitter.emit('result', err);
            }
            else {
                if (key === undefined) {
                    context.stack.push(args);
                }
                else {
                    context.vars[key] = args[0];
                    context.args[key] = args;
                }
                context.emitter.emit('result', null, args, key);
            }
        };
        Hash(context).forEach(function (v,k) { cb[k] = v });
        cb.into = function (k) { key = k };
        f.apply(cb, context.stack);
    }
    
    this.seq = function (key, cb) {
        if (cb === undefined) { cb = key; key = undefined }
        context.emitter.on('result', function f () {
            context.emitter.removeListener('result', f);
            saw.next();
        });
        action(key, cb);
    };
    
    this.par = function (key, cb) {
        if (cb === undefined) { cb = key; key = undefined }
        context.parallel ++;
        context.emitter.on('result', function () {
            context.parallel --;
        });
        
        action(key, cb);
        saw.next();
    };
    
    this.join = function (cb) {
        context.emitter.on('result', function (err) {
            if (context.parallel == 0) {
                action(key, cb);
                saw.next();
            }
        });
    };
}
