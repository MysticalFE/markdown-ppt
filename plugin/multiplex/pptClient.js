/*
 * @Description: 
 * @Author: Rockywu <wjl19890427@hotmail.com>
 * @Date: 2019-06-13 11:36:41
 * @LastEditors: Rockywu <wjl19890427@hotmail.com>
 * @LastEditTime: 2019-06-13 17:17:22
 */

(function() {
  var SOCKET_SYNC_STATE = 'SOCKET_SYNC_STATE'; //分为主动和被动两种同步信息状态
  var SOCKET_SET_STATE = 'SOCKET_SET_STATE'; //设置信息
  var SOCKET_SYNC_PPT_INFOS = 'SOCKET_SYNC_PPT_INFOS'; //同步已经注册的所有PPT信息，支持主动和被动
  var SOCKET_CREATE_PPT = 'SOCKET_CREATE_PPT'; //注册ppt
  function PPTClient(socketUrl, socketId, secret) {
    if(!secret || !socketId || !socketUrl) {
      throw new Error("ppt client 初始化错误")
    }
    this.name = '自定ppt' + ('' + Math.random()).slice(2);
    this.secret = secret;
    this.socketId = socketId;
    this.io = io.connect(socketUrl);
    this._init();
   }

  PPTClient.prototype = {
    constructor: PPTClient,
    _init: function() {
      var that = this;
      var syncState = this._syncState.bind(this)
	    window.addEventListener( 'load', syncState);
	    Reveal.addEventListener( 'slidechanged', syncState );
	    Reveal.addEventListener( 'fragmentshown', syncState );
	    Reveal.addEventListener( 'fragmenthidden', syncState );
	    Reveal.addEventListener( 'overviewhidden', syncState );
	    Reveal.addEventListener( 'overviewshown', syncState );
	    Reveal.addEventListener( 'paused', syncState );
      Reveal.addEventListener( 'resumed', syncState );
      //绑定监听
      this._bindSocketIOActions();
    }, 
    /**
     * 连接上远程遥控器
     * @param {*} name ppt名称
     */
    linkRemoteControl: function(name) {
      if(name)  {
        this.name = name;
      }
      console.log('注册ppt', this.name)
      this.io.emit(SOCKET_CREATE_PPT, {
        socketId: this.socketId,
        secret: this.secret,
        name: this.name
      })
    },
    _syncState: function() {
      //同步Reveal状态
      this.io.emit(SOCKET_SYNC_STATE, {
        state: Reveal.getState(),
        socketId: this.socketId,
        secret: this.secret,
        type: 2
      })
    },
    _bindSocketIOActions: function() {
      var that = this;
      this.io.on(SOCKET_SYNC_STATE, function(data) {
        console.log(SOCKET_SYNC_STATE, data)
        if(that.socketId && data.socketId === that.socketId && data.type === 1) {
          that._syncState();
        }
      })
      this.io.on(SOCKET_SET_STATE, function(data) {
        console.log(SOCKET_SET_STATE, data)
        if(that.socketId && data.socketId === that.socketId) {
          Reveal.setState(data.state);
          //手动同步
          that._syncState();
        }
      })
      //绑定重新连接后的行为
      this.io.on('reconnect', function() {
        that._syncState();
        that.linkRemoteControl();
      })
    }
  }

  window.PPTClient = PPTClient;
})()