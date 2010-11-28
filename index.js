var EventEmitter = require('events').EventEmitter;
var Hash = require('traverse/hash');
var Chainsaw = require('chainsaw');

module.exports = Seq;
function Seq () {
    var context = {
        vars : {},
        args : {},
        stack : [].slice.call(arguments),
        error : null,
    };
    context.stack_ = context.stack;
    
    var ch = Chainsaw(function (saw) {
        builder.call(this, saw, context);
    });
    ch.catch(function (err) {
        console.error(err.stack ? err.stack : err)
    });
    return ch;
}

function builder (saw, context) {
    this.context = context;
    
    function action (key, f, g) {
        var cb = function (err) {
            var args = [].slice.call(arguments, 1);
            if (err) {
                context.error = err;
                saw.down('catch');
            }
            else {
                if (key === undefined) {
                    context.stack_.push(args);
                }
                else if (typeof key == 'number') {
                    context.stack_[key] = args[0];
                    context.args[key] = args;
                }
                else {
                    context.vars[key] = args[0];
                    context.args[key] = args;
                }
                if (g) g(args, key);
            }
        };
        Hash(context).forEach(function (v,k) { cb[k] = v });
        cb.into = function (k) { key = k };
        f.apply(cb, context.stack);
    }
    
    var running = 0;
    
    this.seq = function (key, cb) {
        if (cb === undefined) { cb = key; key = undefined }
        if (running == 0) {
            action(key, function () {
                context.stack_ = [];
                cb.apply(this, arguments);
                context.stack = context.stack_;
            }, saw.next);
        }
    };
    
    this.par = function (key, cb) {
        if (cb === undefined) {
            cb = key;
            key = context.stack_.length;
            context.stack_.push(null);
        }
        
        var seq = this;
        var step = saw.step;
        var down = function () {
            saw.step = step;
            saw.down('seq');
        };
        
        running ++;
        action(key, cb, function () {
            running --;
            if (running == 0) down('seq');
        });
        saw.next();
    };
    
    this.catch = function (cb) {
        if (context.error) {
            context.stack = [ [ context.error ] ];
            action(undefined, function () {
                context.stack_ = [];
                cb.apply(this, arguments);
                context.stack = context.stack_;
                process.nextTick(saw.next);
            });
        }
        else saw.next();
    };
    
    this.push = function () {
        context.stack.push.apply(context.stack, arguments);
        saw.next();
    };
    
    this.extend = function (xs) {
        context.stack.push.apply(context.stack, xs);
        saw.next();
    };
    
    this.splice = function () {
        var args = [].slice.call(arguments);
        var cb = args.filter(function (arg) {
            return typeof arg == 'function'
        })[0];
        
        var xs = context.stack.splice.apply(context.stack, arguments);
        if (cb) saw.nest(cb, xs, context);
        else saw.next();
    };
    
    this.shift = function (cb) {
        var x = context.stack.shift();
        if (cb) saw.nest(cb, x, context);
        else saw.next();
    };
    
    this.do = function (cb) {
        saw.nest(cb, context);
    };
}
