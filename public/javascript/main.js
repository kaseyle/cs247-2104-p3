// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blobs = [];
  var fb_instance;
  var vid_counter = 0;
  var num_vids_entered = 0;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
    set_up_buttons();
  });
  var recording = false;
  var keys = {};

  function count_videos() {
    return $("#type_box").val().split(video_char).length - 1;
  }

  function set_up_buttons() {
    $("#type_box").keydown(function (e) {
      keys[e.which] = true;
      if (e.which == 8) {
        $("#replay_stream video").remove();
        $("#replay_text").hide();
      }
      return check_keys();
    });
    $("#type_box").keyup(function (e) {
      delete keys[e.which];
      if (e.which == 8) {
        num_vids_entered = count_videos();
        while (num_vids_entered < cur_video_blobs.length) { // this used to be an if
          cur_video_blobs.pop();
          console.log("DELETED!");
        }
      }       
      if (e.which == key_one || e.which == key_two) {
        if (recording) {
          recording = false;
          stop_recording();
          var value = $("#type_box").val();
          value += video_char;
          num_vids_entered++;
          $("#type_box").val(value);
          console.log("num vids: " + num_vids_entered);
        }

      }
    });
  }

  function replay_video(b64_data) {

    console.log("REPLAY");

    var video = document.createElement("video");
      
      video.autoplay = true;
      video.controls = false; // optional
      video.loop = true;
      video.width = 160;
      video.height = 120;
      video.className = "record_vid";

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(b64_data));
      source.type =  "video/webm";

      video.appendChild(source);

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));

      $("#replay_text").before(video);
      $("#replay_text").show();
  }

  function stop_recording() {
    //recording = false;
    console.log("STOP RECORDING!");
    mediaRecorder.stop();
    $("#webcam_stream").hide();
    clearInterval(interval);
    $("#second_counter").html("");
  }

  var key_one = 16;
  var key_two = 32;
  var mediaRecorder;
  var interval;
  //var video_char = "🎥";
  var video_char = "▶";

  function check_keys() {
    $("#replay_stream video").remove();
    $("#replay_text").hide();
    if (keys.hasOwnProperty(key_one) && keys.hasOwnProperty(key_two) && Object.keys(keys).length == 2) {
      if (!recording) {
        $("#webcam_stream").show();
        console.log("START RECORDING!");
        recording = true;
        mediaRecorder.start(7500);
        set_counter();
      }
      return false;
    }
  }

  function set_counter() {
      // counter
      var time = 1;
      var second_counter = document.getElementById('second_counter');
      interval = setInterval(function(){
        if (time == 7 && recording) {
          stop_recording();
        }
        second_counter.innerHTML = time++;
      },1000);
  }

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://emojicon.firebaseio.com");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    var username = window.prompt("Welcome, warrior! Please declare your name.");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        $("#replay_stream video").remove();
        $("#replay_text").hide();
        if(has_emotions($(this).val())){
          fb_instance_stream.push({m:username+": " +$(this).val(), v:cur_video_blobs, c: my_color});
          cur_video_blobs = [];
        }else{
          fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
        }
        $(this).val("");
        scroll_to_bottom(0);
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  // creates a message node and appends it to the conversation
/*  function display_msg(data){
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    if(data.v){
      for (var i = 0; i < data.v.length; i++) {
        display_video(data.v[i]);
      }
    }
  }*/


  function display_msg(data){
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'></div>");
    var msgs = $(".msg");
    var last_msg = msgs[msgs.length-1];
    if(data.v){
      var tokens = data.m.split(video_char);
      for (var i = 0; i < tokens.length; i++) {
        $(last_msg).append("<span>" + tokens[i] + "</span>");
        if (i < data.v.length) {
          display_video(data.v[i], last_msg);
        }
      }
    } else {
      $(last_msg).append(data.m);
    }
  }

  function display_video(base64_data, last_msg) {
        var video = document.createElement("video");
      
      vid_counter++;
      video.setAttribute("id", vid_counter);

      video.autoplay = true;
      video.controls = false; // optional
      video.loop = false;
      video.width = 80;
      video.className = "display_vid";

      var videoPlaying = false;

      video.onclick = function() {
        if(video.ended) {
          videoPlaying = false;
        }
        if(videoPlaying) {
          video.pause();
          videoPlaying = false;
        } else {
          video.play();
          videoPlaying=true;
        }
      }

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(base64_data));
      source.type =  "video/webm";

      video.appendChild(source);

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));

      last_msg.appendChild(video);

      /*$(video).bind("ended", function() {
        $(video).wrap("<div id='wrap_" + video.id + "'></div>");
        $("<div class='backg'></div>").insertBefore($(video));
        $("<div class='overlay'></div>").insertBefore($(video));
      });*/
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      video.className = "record_vid";
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // // counter
      // var time = 0;
      // var second_counter = document.getElementById('second_counter');
      // var second_counter_update = setInterval(function(){
      //   second_counter.innerHTML = time++;
      // },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          console.log("NEW MEDIA");
          //console.log("new data available!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            console.log("PUSH!");
            cur_video_blobs.push(b64_data);
            replay_video(b64_data);
          });
      };
      /*
      setInterval( function() {
        mediaRecorder.stop();
        mediaRecorder.start(3000);
      }, 3000 );
      */
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    //var options = ["lol",":)",":("];
    //for(var i=0;i<options.length;i++){
    if(msg.indexOf(video_char)!= -1){
        console.log("TRUE!");
        return true;
    }
    //}
    return false;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
