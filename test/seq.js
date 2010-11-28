var Seq = require('seq');

exports.seq = function (assert) {
    var to = setTimeout(function () {
        assert.fail('never got to the end of the chain');
    }, 50);
    var calls = 0;
    
    Seq(1)
        .seq(function (n) {
            assert.equal(n, 1);
            var seq = this;
            setTimeout(function () { seq(null, 2) }, 25);
            assert.eql(this.stack, [n]);
            calls++;
        })
        .seq(function (n) {
            assert.equal(n, 2);
            assert.eql(this.stack, [n]);
            
            calls++;
            assert.equal(calls, 2);
            clearTimeout(to);
        })
    ;
};

exports.catchSeq = function (assert) {
    var to = setTimeout(function () {
        assert.fail('never caught the error');
    }, 50);
    
    var tf = setTimeout(function () {
        assert.fail('final action never executed');
    }, 50);
    
    var calls = {};
    Seq(1)
        .seq(function (n) {
            assert.equal(n, 1);
            calls.before = true;
            this('pow!');
            calls.after = true;
        })
        .seq(function (n) {
            assert.equal(n, 2);
            calls.next = true;
        })
        .catch(function (err) {
            assert.equal(err, 'pow!');
            assert.ok(calls.before);
            assert.ok(!calls.after);
            assert.ok(!calls.next);
            clearTimeout(to);
        })
        .do(function () {
            assert.ok(calls.after);
            clearTimeout(tf);
        })
    ;
};

exports.par = function (assert) {
    var to = setTimeout(function () {
        assert.fail('seq never fired');
    }, 75);
    
    Seq()
        .par(function () {
            var seq = this;
            setTimeout(function () { seq(null, 'x') }, 50);
        })
        .par(function () {
            var seq = this;
            setTimeout(function () { seq(null, 'y') }, 25);
        })
        .par('z', function () {
            this(null, 42);
        })
        .seq(function (x, y) {
            clearTimeout(to);
            assert.equal(x, 'x');
            assert.equal(y, 'y');
            assert.eql(this.args, { 0 : ['x'], 1 : ['y'], z : [42] });
            assert.eql(this.stack, [ 'x', 'y' ]);
            assert.eql(this.vars, { z : 42 });
        })
    ;
};

exports.catchPar = function (assert) {
    var done = false, caught = false;
    var tc = setTimeout(function () {
        assert.fail('error not caught');
    }, 75);
    
    Seq()
        .par('one', function () {
            setTimeout(this.bind({}, 'rawr'), 25);
        })
        .par('two', function () {
            setTimeout(this.bind({}, null, 'y'), 50);
        })
        .seq(function (x, y) {
            assert.fail('seq fired with error above');
        })
        .catch(function (err, key) {
            clearTimeout(tc);
            assert.equal(err, 'rawr');
            assert.equal(key, 'one');
        })
    ;
};

exports.forEach = function (assert) {
    var to = setTimeout(function () {
        assert.fail('seq never fired after forEach');
    }, 25);
    
    var count = 0;
    Seq(1,2,3)
        .par(function () {
            this(null, 4);
        })
        .forEach(function (x, i) {
            assert.equal(x - 1, i);
            count ++;
        })
        .seq(function () {
            clearTimeout(to);
            assert.equal(count, 4);
        })
    ;
};

exports.seqEach = function (assert) {
    var to = setTimeout(function () {
        assert.fail('seqEach never finished');
    }, 25);
    
    var count = 0;
    var ii = 0;
    Seq(1,2,3)
        .seqEach(function (x, i) {
            assert.equal(i, ii++);
            assert.equal(x, [1,2,3][i]);
            count ++;
            this(null);
        })
        .seq(function () {
            clearTimeout(to);
            assert.equal(count, 3);
        })
    ;
};

exports.seqEachCatch = function (assert) {
    var to = setTimeout(function () {
        assert.fail('never caught the error');
    }, 25);
    var tf = setTimeout(function () {
        assert.fail('never resumed afterwards');
    }, 25);
    
    var values = [];
    Seq(1,2,3,4)
        .seqEach(function (x, i) {
            values.push([i,x]);
            assert.equal(x - 1, i);
            if (i >= 2) this('meow ' + i)
            else this(null, x * 10);
        })
        .seq(function (xs) {
            assert.fail('should fail before this action');
        })
        .catch(function (err) {
            clearTimeout(to);
            assert.equal(err, 'meow 2');
            assert.deepEqual(values, [[0,1],[1,2],[2,3]]);
        })
        .seq(function () {
            clearTimeout(tf);
        })
    ;
};

exports.parEach = function (assert) {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 50);
    
    var values = [];
    Seq(1,2,3,4)
        .parEach(function (x, i) {
            values.push([i,x]);
            setTimeout(this.bind({}, null), 20);
        })
        .seq(function () {
            assert.deepEqual(this.stack, [1,2,3,4])
            assert.deepEqual(values, [[0,1],[1,2],[2,3],[3,4]]);
            clearTimeout(to);
        })
    ;
};

exports.parEachCatch = function (assert) {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 50);
    
    var values = [];
    Seq(1,2,3,4)
        .parEach(function (x, i) {
            values.push([i,x]);
            setTimeout(this.bind({}, 'zing'), 10);
        })
        .seq(function () {
            assert.fail('should have errored before this point')
        })
        .catch(function (err) {
            clearTimeout(to);
            assert.equal(err, 'zing');
            assert.deepEqual(values, [[0,1],[1,2],[2,3],[3,4]]);
        })
    ;
};

exports.parEachLimited = function (assert) {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq(1,2,3,4,5,6,7,8,9,10)
        .parEach(3, function (x, i) {
            running ++;
            
            assert.ok(running <= 3);
            
            values.push([i,x]);
            setTimeout((function () {
                running --;
                this(null);
            }).bind(this), 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(values,
                [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10]]
            );
        })
    ;
};

exports.parMap = function (assert) {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq(1,2,3,4,5,6,7,8,9,10)
        .parMap(2, function (x, i) {
            running ++;
            
            assert.ok(running <= 2);
            
            setTimeout((function () {
                running --;
                this(null, x * 10);
            }).bind(this), 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [10,20,30,40,50,60,70,80,90,100]);
        })
    ;
};

exports.seqMap = function (assert) {
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 500);
    
    var running = 0;
    var values = [];
    Seq(1,2,3,4,5,6,7,8,9,10)
        .seqMap(function (x, i) {
            running ++;
            
            assert.equal(running, 1);
            
            setTimeout((function () {
                running --;
                this(null, x * 10);
            }).bind(this), 10);
        })
        .seq(function () {
            clearTimeout(to);
            assert.eql(this.stack, [10,20,30,40,50,60,70,80,90,100]);
        })
    ;
};
