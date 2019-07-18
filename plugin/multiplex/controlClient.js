;(function(window) {

  var SOCKET_SYNC_STATE = 'SOCKET_SYNC_STATE'; //分为主动和被动两种同步信息状态
  var SOCKET_SET_STATE = 'SOCKET_SET_STATE'; //设置信息
  var SOCKET_SYNC_PPT_INFOS = 'SOCKET_SYNC_PPT_INFOS'; //同步已经注册的所有PPT信息，支持主动和被动
  /**
   * 遥控器连接器
   * 实现多客户端连接,并提供设备切换同步机制
   */
  function RemoteControl(socketUrl) {
    if(!socketUrl) {
      throw new Error("请填写socketUrl信息")
    }
    //当前可操作的ppt-sokcetId
    this.socketId = null;
    this.currentPPTState = null;
    this.pptInfos = null;
    this.io = io.connect(socketUrl)
    this.isInit = false
    this._onEvents = {};
    //执行启动
    this._init();
  }
  
  RemoteControl.SOCKET_SYNC_PPT_INFOS = SOCKET_SYNC_PPT_INFOS;

  RemoteControl.prototype = {
    constructor: RemoteControl,
    _init: function () {
      if(this.isInit) return;
      this.isInit =  true;
      //绑定socket消息
      this._bindSocketIOActions();
      this.getPPTInfos();
      this.getPPTState();
    },
    on: function(name, func) {
      if(!name || typeof func !== 'function') return;
      this._onEvents[name] = func;
    },
    /**
     * socketIO actions信息
     */
    _bindSocketIOActions: function() {
      var that = this;
      //被动接收同步state
      this.io.on(SOCKET_SYNC_STATE, function(data) {
        console.log(SOCKET_SYNC_STATE, data)
        if(that.socketId && data.socketId === that.socketId && data.type === 2) {
          that.currentPPTState = data.state;
        }
      })
      //同步ppt信息
      this.io.on('SOCKET_SYNC_PPT_INFOS', function(data) {
        console.log(SOCKET_SYNC_PPT_INFOS, data)
        let payLoad = data.payLoad || {}
        if(Object.keys(payLoad).length && data.type === 2) {
          that.pptInfos = payLoad;
          that._onEvents[SOCKET_SYNC_PPT_INFOS] && that._onEvents[SOCKET_SYNC_PPT_INFOS].call(that, data.payLoad)
        } else if(Object.keys(payLoad).length < 1&& data.type === 2) {
          setTimeout(function() {
            that.getPPTInfos();
          }, 2000)
        }
      })
      //绑定重新连接后的行为
      this.io.on('reconnect', function() {
        that.getPPTInfos();
        that.getPPTState();
      })
    },
    //切换PPT操作对象
    switchPPT: function(socketId) {
      if(!socketId || !this.pptInfos[socketId]) return;
      this.socketId = socketId;
      this.currentPPTState = null;
      this.getPPTState();
    },
    //获取指定socketId - 页面当前状态
    getPPTState: function() {
      if(!this.socketId) return;
      //type = 1执行同步请求
      this.io.emit(SOCKET_SYNC_STATE, {
        socketId: this.socketId,
        type: 1
      })
    },
    //获取注册的PPT信息,主动同步
    getPPTInfos: function() {
      this.io.emit(SOCKET_SYNC_PPT_INFOS, {
        type: 1
      })
    },
    /**
     * 按钮方向键操作行为
     * @params [string] type
     * type: top、bottom、left、right
     */
    directionAction: function(type) {
      switch(type) {
        case 'top': 
          this.currentPPTState.indexv--;
          break;
        case 'left': 
          this.currentPPTState.indexh--;
          break;
        case 'right': 
          this.currentPPTState.indexh++;
          break;
        case 'bottom': 
          this.currentPPTState.indexv++;
          break;
        default: return;
      }
      this.io.emit(SOCKET_SET_STATE, {
        state: this.currentPPTState,
        socketId: this.socketId,
      })
    }
  }
  //对外开放次对象
  window.RemoteControl = RemoteControl;
}(window));
