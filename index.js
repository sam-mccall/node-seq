var EventEmitter = require('events').EventEmitter;
var Hash = require('traverse/hash');
var Chainsaw = require('chainsaw');

module.exports = Seq;
function Seq () {
    var xs = [].slice.call(arguments);
    var ch = Chainsaw(function (saw) {
        builder.call(this, saw, xs);
    });
    process.nextTick(function () {
        ch.catch(function (err) {
            console.error(err.stack ? err.stack : err)
        });
    });
    return ch;
}

function builder (saw, xs) {
    var context = this.context = {
        vars : {},
        args : {},
        stack : xs,
        error : null,
    };
    context.stack_ = context.stack;
    
    function action (key, f, g) {
        var cb = function (err) {
            var args = [].slice.call(arguments, 1);
            if (err) {
                context.error = { message : err, key : key };
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
        
        var step = saw.step;
        running ++;
        
        action(key, cb, function () {
            running --;
            if (running == 0) {
                saw.step = step;
                saw.down(function (x) {
                    return x.path && x.path[0] != 'par'
                });
            }
        });
        saw.next();
    };
    
    this.catch = function (cb) {
        if (context.error) {
            context.stack = [ context.error.message, context.error.key ];
            action(undefined, function () {
                context.stack_ = [];
                cb.apply(this, arguments);
                context.stack = context.stack_;
                
                context.error = null;
                process.nextTick(saw.next);
            });
        }
        else saw.next();
    };
    
    this.forEach = function (cb) {
        this.seq(function () {
            context.stack_ = context.stack.slice();
            var end = context.stack.length;
            context.stack.forEach(function (x, i) {
                action(i, function () {
                    cb.call(this, x, i);
                    if (i == end - 1) saw.next();
                });
            });
        });
    };
    
    this.seqEach = function (cb) {
        this.seq(function () {
            context.stack_ = context.stack.slice();
            var xs = context.stack.slice();
            
            (function next (i) {
                action(
                    i,
                    function () { cb.call(this, xs[i], i) },
                    function () {
                        if (i == xs.length - 1) saw.next();
                        else next(i + 1);
                    }
                );
            }).bind(this)(0);
        });
    };
    
    this.parEach = function (limit, cb) {
        context.stack_ = context.stack.slice();
        var xs = context.stack.slice();
        if (cb === undefined) { cb = limit; limit = xs.length }
        
        var step = saw.step;
        saw.nest(function () {
            var active = 0;
            var queue = [];
            
            xs.forEach((function (x, i) {
                this.par(function () {
                    var self = (function () {
                        this.apply(this, arguments);
                        active --;
                        if (queue.length) queue.shift()();
                    }).bind(this);
                    
                    function call () {
                        active ++;
                        cb.call(self);
                    }
                    if (active >= limit) queue.push(call);
                    else call();
                });
            }).bind(this));
            this.seq(saw.next);
            this.catch(function (err, key) {
                saw.step = step;
                context.error = { message : err, key : key };
                saw.down('catch');
            });
        });
        context.stack = xs;
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
    
    this.flatten = function () {
        var xs = [];
        context.stack.forEach(function f (x) {
            if (Array.isArray(x)) x.forEach(f);
            else xs.push(x);
        });
        context.stack = xs;
        saw.next();
    };
    
    this.do = function (cb) {
        saw.nest(cb, context);
    };
}
