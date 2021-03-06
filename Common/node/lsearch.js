/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var assert = require("assert");
var fs = require('fs');
var path = require('path');
var lconfig = require('lconfig');
var is = require("lutil").is;
var util = require('util');
var indexPath;

exports.currentEngine;

function noop() {
}

NullEngine = function()
{
}
NullEngine.prototype.indexType = function(type, obj, cb) {
    cb("Null engine");
};
NullEngine.prototype.queryAll = function(q, params, cb) {
    cb("Null engine");
};
NullEngine.prototype.queryType = function(type, q, params, cb) {
    cb("Null engine");
};

CLEngine = function()
{
    this.engine = require('clucene');
    this.cl = this.engine.CLucene;
    this.lucene = new this.cl.Lucene();
    this.mappings = {
        "contact" : {
            "_id":"_id",
            "name":"name",
            "nicknames":[],
            "email":[
                {
                    "value":"value"
                }
            ],
            "im":[
                {
                    "value":"value"
                }
            ],
            "address":[
                {
                    "value":"value"
                }
            ]
        },
        "photo" : {
            "_id":"id",
            "caption":"caption",
            "title":"title"
        },
        "status/twitter" : {
            "_id":"id",
            "text":"text",
            "user":{
                "name":"name",
                "screen_name":"screen_name"
            }
        },
        "status/facebook" : {
            "_id":"id",
            "description":"description",
            "message":"message",
            "from":{
                "name":"name"
            }
        }
    };

    this.engine.Store = {
      STORE_YES: 1,
      STORE_NO: 2,
      STORE_COMPRESS: 4
    };

    this.engine.Index = {
      INDEX_NO: 16,
      INDEX_TOKENIZED: 32,
      INDEX_UNTOKENIZED: 64,
      INDEX_NONORMS: 128,
    };

    this.engine.TermVector = {
      TERMVECTOR_NO: 256,
      TERMVECTOR_YES: 512,
      TERMVECTOR_WITH_POSITIONS: 512 | 1024,
      TERMVECTOR_WITH_OFFSETS: 512 | 2048,
      TERMVECTOR_WITH_POSITIONS_OFFSETS: (512 | 1024) | (512 | 2048) 
    };
    
    return this;
};

CLEngine.prototype.indexType = function(type, value, callback) {
    var doc = new this.cl.Document();
    
    if (!this.mappings.hasOwnProperty(type)) {
        callback("No valid mapping for the type: " + type);
        return;
    }
    
    idToStore = value[this.mappings[type]["_id"]];
    if (!idToStore) {
        callback("No valid id property was found");
        return;
    }
    idToStore = idToStore.toString();

    var contentTokens = [];
    processValue = function(v, parentMapping) {
        if (is("Array", v)) {
            for(var i = 0, l = v.length; i < l; i++) {
                var nextValue = v[i];
                if (is("Object", nextValue) || is("Array", nextValue)) {
                    // XXX:  This only supports a single type in the array right now
                    processValue(v[i], parentMapping[0]);
                } else {
                    processValue(v[i], undefined);
                }
            }
        } else if (is("Object", v)) {
            for (var k in parentMapping) {
                if (k === "_id") continue;
                subMapping = parentMapping[k];
                valueKey = subMapping;
                if (is("Array", subMapping) || is("Object", subMapping)) valueKey = k;
                if (!v.hasOwnProperty(valueKey)) continue;
                processValue(v[valueKey], subMapping);
            }
        } else {
            if (v) contentTokens.push(v.toString());
        }

    };
    processValue(value, this.mappings[type]);
    
    if (contentTokens.length == 0) {
        callback("No valid tokens were found to index.");
        return;
    }

    var contentString = contentTokens.join(" <> ");
    
    //console.log("Going to store " + contentString);
    doc.addField("_type", type, this.engine.Store.STORE_YES|this.engine.Index.INDEX_UNTOKENIZED);
    doc.addField('content', contentString, this.engine.Store.STORE_YES|this.engine.Index.INDEX_TOKENIZED);
    //console.log('about to index at ' + indexPath);
    assert.ok(indexPath);
    this.lucene.addDocument(idToStore, doc, indexPath, function(err, indexTime, docsReplaced) {
    callback(err, indexTime, docsReplaced);
    });
};
CLEngine.prototype.queryType = function(type, query, params, callback) {
    assert.ok(indexPath);
    this.lucene.search(indexPath, "content:(" + query + ") AND +_type:" + type, callback);
};
CLEngine.prototype.queryAll = function(query, params, callback) {
    assert.ok(indexPath);
    this.lucene.search(indexPath, "content:(" + query + ")", callback);
};


exports.setEngine = function(engine) {
    if (exports.currentEngine) exports.currentEngine = undefined;
    try {
        exports.currentEngine = new engine();
    } catch (E) {
        console.error("Falling back to search Null Engine, your indexing and queries will not work. (" + E + ")");
        exports.currentEngine = new NullEngine();
    }
};
exports.setIndexPath = function(newPath) {
    indexPath = newPath;
    if (!path.existsSync(indexPath)) {
      fs.mkdirSync(indexPath, 0755);
    };
    
};

function exportEngineFunction(funcName) {
    var funcToRun = function() {
        assert.ok(exports.currentEngine);
        exports.currentEngine[funcName].apply(exports.currentEngine, arguments);
    };
    exports[funcName] = funcToRun;
}
exportEngineFunction("queryType");
exportEngineFunction("queryAll");

// Indexing Parts Be Here
var indexQueue = [];
var indexing = false;

exports.indexType = function(type, value, cb) {
    indexQueue.push({"type":type, "value":value, "cb":cb});
    process.nextTick(indexMore);
};

function indexMore(keepGoing) {
    // I still feel like async can break this unless there's some sort of atomic guarantee
    if (indexing && !keepGoing) return;
    indexing = true;
    //console.log('IndexQueue length: ' + indexQueue.length);
    if (indexQueue.length === 0) {
        indexing = false;
        return;
    }
    
    var cur = indexQueue.shift();
    assert.ok(exports.currentEngine);
    exports.currentEngine.indexType(cur.type, cur.value, function(err, indexTime) {
        //console.log('Indexed ' + cur.type + ' id: ' + cur.value._id + ' in ' + indexTime + ' ms');
        cur.cb(err, indexTime);
        //console.log("Setting up for next tick");
        process.nextTick(function() { indexMore(true); });
    });
}

exports.engines = {
    "CLucene" : CLEngine,
    "ElasticSearch" : undefined // ESEngine
};

